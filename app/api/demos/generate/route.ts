import { NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  instructions: `Create homepage copy and a visual direction for a premium photography studio demo in Chennai.
Use only the supplied business name, category and locality. Do not invent awards, years in business, client names, testimonials, prices, contact details or services as confirmed facts. You may suggest common photography service categories as editable demo placeholders; label the preview as a concept. Keep copy concise, elegant and suitable for a premium photography brand. Return a hero title, tagline, introduction, CTA, suggested services, homepage sections and three hex colour values.`,
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
    const result=await run(demoAgent,JSON.stringify({
      businessName:lead.business_name,category:lead.business_category,locality:lead.business_address,
      existingWebsite:lead.website_url,instagram:lead.instagram_url,
      rating:lead.evidence?.rating,reviewCount:lead.evidence?.userRatingCount,
    }),{maxTurns:2});
    if(!result.finalOutput) return NextResponse.json({ok:false,error:"Demo agent did not return homepage content."},{status:502});
    const content=demoSchema.parse(result.finalOutput);
    const {data:demo,error:saveError}=await supabase.from("demo_projects").insert({
      owner_id:user.id,lead_id:lead.id,template_id:"photography-elegant-v1",
      brand_data:{...content,businessName:lead.business_name,locality:lead.business_address,category:lead.business_category,phone:lead.phone,website:lead.website_url,instagram:lead.instagram_url,conceptOnly:true},
      status:"ready",
    }).select("id").single();
    if(saveError) return NextResponse.json({ok:false,error:"Homepage was generated but could not be saved: "+saveError.message},{status:500});
    await supabase.from("leads").update({status:"demo_ready"}).eq("id",lead.id).eq("owner_id",user.id);
    return NextResponse.json({ok:true,demoId:demo.id,url:"/demos/"+demo.id});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"Unexpected demo generation error."},{status:500});
  }
}
