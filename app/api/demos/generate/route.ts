import { NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

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
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function readImage(form: FormData, field: string) {
  const value = form.get(field);
  if (!(value instanceof File) || value.size === 0) return null;
  if (!value.type.startsWith("image/")) throw new Error(`${field} must be an image file.`);
  if (value.size > MAX_IMAGE_BYTES) throw new Error(`${field} must be 8 MB or smaller.`);
  return value;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const leadId = z.string().uuid().safeParse(form.get("leadId"));
    if (!leadId.success) return NextResponse.json({ok:false,error:"A valid leadId is required."},{status:400});
    const businessImage = await readImage(form,"businessImage");
    const referenceImage = await readImage(form,"referenceImage");
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ok:false,error:"OpenAI is not configured on the server."},{status:503});

    const supabase = await createClient();
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user) return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
    const {data:lead,error:leadError}=await supabase.from("leads")
      .select("id,business_name,business_category,business_address,phone,website_url,instagram_url,evidence")
      .eq("id",leadId.data).eq("owner_id",user.id).single();
    if(leadError||!lead) return NextResponse.json({ok:false,error:"Lead not found."},{status:404});

    const copyResult=await run(demoAgent,JSON.stringify({
      businessName:lead.business_name,category:lead.business_category,locality:lead.business_address,
      existingWebsite:lead.website_url,instagram:lead.instagram_url,rating:lead.evidence?.rating,reviewCount:lead.evidence?.userRatingCount,
    }),{maxTurns:2});
    if(!copyResult.finalOutput) return NextResponse.json({ok:false,error:"Homepage copy agent did not return a result."},{status:502});
    const copy=demoSchema.parse(copyResult.finalOutput);
    const demoId=crypto.randomUUID();
    const bucket=supabase.storage.from("leadflow-demo-assets");
    const storedInputs: string[]=[];
    const inputUrls: Record<string,string>={};
    for (const [kind,file] of [["business",businessImage],["reference",referenceImage]] as const) {
      if (!file) continue;
      const path=`${user.id}/${demoId}/${kind}-${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi,"_")}`;
      const {error}=await bucket.upload(path,Buffer.from(await file.arrayBuffer()),{contentType:file.type,upsert:false});
      if(error) return NextResponse.json({ok:false,error:`Could not save ${kind} image: ${error.message}`},{status:500});
      storedInputs.push(path);
      inputUrls[kind]=bucket.getPublicUrl(path).data.publicUrl;
    }

    const imagePrompt=`Create a premium, photorealistic, wide 3:2 editorial hero photograph for a sophisticated Chennai photography studio homepage concept. Studio name: ${lead.business_name}. Photography niche: ${lead.business_category||"photography studio"}. Visual direction: ${copy.visualDirection}. If a business photo is supplied, preserve its subject and use it as the primary visual reference. If a design reference is supplied, follow its overall visual mood, framing and colour direction without copying logos or text. The result should feel like a real high-end commissioned portfolio photograph, natural light, authentic emotion, refined colour grading, no logos, no watermarks, no text, no typography, no UI, no collage. This is an illustrative homepage concept, not a claim that the depicted people are actual clients.`;
    let imageResponse: Response;
    if (businessImage || referenceImage) {
      const imageForm = new FormData();
      imageForm.append("model","gpt-image-1");
      imageForm.append("prompt",imagePrompt);
      imageForm.append("size","1536x1024");
      imageForm.append("quality","medium");
      imageForm.append("output_format","webp");
      if (businessImage) imageForm.append("image[]",new Blob([await businessImage.arrayBuffer()],{type:businessImage.type}),businessImage.name);
      if (referenceImage) imageForm.append("image[]",new Blob([await referenceImage.arrayBuffer()],{type:referenceImage.type}),referenceImage.name);
      imageResponse=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:imageForm,signal:AbortSignal.timeout(90000)});
    } else {
      imageResponse=await fetch("https://api.openai.com/v1/images/generations",{
        method:"POST",headers:{"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
        body:JSON.stringify({model:"gpt-image-1",prompt:imagePrompt,n:1,size:"1536x1024",quality:"medium",output_format:"webp"}),
        signal:AbortSignal.timeout(90000),
      });
    }
    const imagePayload=await imageResponse.json();
    const imageBase64=imagePayload.data?.[0]?.b64_json;
    if(!imageResponse.ok||!imageBase64) return NextResponse.json({ok:false,error:imagePayload.error?.message||"AI hero image generation returned no image."},{status:502});
    const imagePath=`${user.id}/${demoId}/hero.webp`;
    const {error:uploadError}=await bucket.upload(imagePath,Buffer.from(imageBase64,"base64"),{contentType:"image/webp",upsert:false});
    if(uploadError) return NextResponse.json({ok:false,error:`AI image generated, but saving it failed: ${uploadError.message}`},{status:500});
    const imageUrl=bucket.getPublicUrl(imagePath).data.publicUrl;
    const {data:demo,error:saveError}=await supabase.from("demo_projects").insert({
      id:demoId,owner_id:user.id,lead_id:lead.id,template_id:"photography-elegant-v1",
      brand_data:{...copy,businessName:lead.business_name,locality:lead.business_address,category:lead.business_category,phone:lead.phone,website:lead.website_url,instagram:lead.instagram_url,heroImageUrl:imageUrl,heroImagePath:imagePath,businessImageUrl:inputUrls.business??null,referenceImageUrl:inputUrls.reference??null,conceptOnly:true},
      status:"ready",
    }).select("id,share_token").single();
    if(saveError){
      await bucket.remove([imagePath,...storedInputs]);
      return NextResponse.json({ok:false,error:"Homepage was generated but could not be saved: "+saveError.message},{status:500});
    }
    await supabase.from("leads").update({status:"demo_ready"}).eq("id",lead.id).eq("owner_id",user.id);
    return NextResponse.json({ok:true,demoId:demo.id,url:"/preview/"+demo.share_token,imageUrl});
  }catch(error){
    const message=error instanceof Error?error.message:"Unexpected demo generation error.";
    return NextResponse.json({ok:false,error:message},{status:500});
  }
}
