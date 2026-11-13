import { NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const inputSchema = z.object({ leadId: z.string().uuid() });
const demoSchema = z.object({
  heroTitle: z.string(), tagline: z.string(), introduction: z.string(),
  primaryCta: z.string(), services: z.array(z.string()).max(6),
  sections: z.array(z.object({ title: z.string(), description: z.string() })).max(5),
  visualDirection: z.string(), palette: z.array(z.string()).length(3),
});
const demoAgent = new Agent({
  name: "AdSpark Photography Homepage Demo Creator",
  model: "gpt-4.1-mini",
  instructions: `Create concise, premium homepage copy and a visual direction for a photography studio in Chennai.
Use only supplied business name, category and locality. Do not invent awards, years in business, client names, testimonials, prices, contact details or services as confirmed facts. Suggested service categories are editable concept placeholders. Label the preview as a concept. Return hero title, tagline, introduction, CTA, suggested services, homepage sections and three hex colour values.`,
  outputType: demoSchema,
});

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok:false, error:"A valid leadId is required." }, { status:400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok:false, error:"OpenAI is not configured on the server." }, { status:503 });
    const supabase = await createClient();
    const { data:{user}, error:authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
    const {data:lead,error:leadError}=await supabase.from("leads")
      .select("id,business_name,business_category,business_address,phone,website_url,instagram_url,evidence")
      .eq("id",parsed.data.leadId).eq("owner_id",user.id).single();
    if(leadError||!lead) return NextResponse.json({ok:false,error:"Lead not found."},{status:404});

    const input={
      businessName:lead.business_name,category:lead.business_category,locality:lead.business_address,
      existingWebsite:lead.website_url,instagram:lead.instagram_url,
      rating:lead.evidence?.rating,reviewCount:lead.evidence?.userRatingCount,
    };
    const copyResult=await run(demoAgent,JSON.stringify(input),{maxTurns:2});
    if(!copyResult.finalOutput) return NextResponse.json({ok:false,error:"Homepage copy agent did not return a result."},{status:502});
    const copy=demoSchema.parse(copyResult.finalOutput);

    const imagePrompt=`Create a premium, photorealistic, wide 3:2 editorial hero photograph for a sophisticated Chennai photography studio homepage concept. Studio name: ${lead.business_name}. Photography niche: ${lead.business_category||"photography studio"}. Visual direction: ${copy.visualDirection}. The image should feel like a real high-end commissioned photography portfolio photograph, natural light, authentic candid emotion, elegant composition, refined colour grading, beautiful depth, no visible logos, no watermarks, no text, no typography, no UI, no collage. Show a tasteful photography subject appropriate to the niche, with no recognisable public figure. This is a generic illustrative concept image, not a photograph of the actual studio's clients.`;
    const imageResponse=await fetch("https://api.openai.com/v1/images/generations",{
      method:"POST",
      headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:"gpt-image-2.5-flare",prompt:imagePrompt,n:1,size:"1536x1024",quality:"medium",output_format:"webp"}),
      signal:AbortSignal.timeout(90000),
    });
    const imagePayload=await imageResponse.json();
    const imageBase64=imagePayload.data?.[0]?.b64_json;
    if(!imageResponse.ok||!imageBase64){
      const reason=imagePayload.error?.message||"Image generation returned no image.";
      return NextResponse.json({ok:false,error:`Homepage copy was created, but AI hero image generation failed: ${reason}`},{status:502});
    }

    const demoId=crypto.randomUUID();
    const imagePath=`${user.id}/${demoId}/hero.webp`;
    const {error:uploadError}=await supabase.storage.from("leadflow-demo-assets").upload(imagePath,Buffer.from(imageBase64,"base64"),{contentType:"image/webp",upsert:false});
    if(uploadError) return NextResponse.json({ok:false,error:`AI image generated, but saving it to Supabase Storage failed: ${uploadError.message}`},{status:500});
    const {data:{publicUrl}}=supabase.storage.from("leadflow-demo-assets").getPublicUrl(imagePath);

    const {data:demo,error:saveError}=await supabase.from("demo_projects").insert({
      id:demoId,owner_id:user.id,lead_id:lead.id,template_id:"photography-elegant-v1",
      brand_data:{...copy,businessName:lead.business_name,locality:lead.business_address,category:lead.business_category,phone:lead.phone,website:lead.website_url,instagram:lead.instagram_url,heroImageUrl:publicUrl,heroImagePath:imagePath,conceptOnly:true},
      status:"ready",
    }).select("id,share_token").single();
    if(saveError){
      await supabase.storage.from("leadflow-demo-assets").remove([imagePath]);
      return NextResponse.json({ok:false,error:"Homepage was generated but could not be saved: "+saveError.message},{status:500});
    }
    await supabase.from("leads").update({status:"demo_ready"}).eq("id",lead.id).eq("owner_id",user.id);
    return NextResponse.json({ok:true,demoId:demo.id,url:"/preview/"+demo.share_token});
  } catch(error) {
    const message=error instanceof Error?error.message:"Unexpected demo generation error.";
    return NextResponse.json({ok:false,error:message},{status:500});
  }
}
