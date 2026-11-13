import { NextResponse } from "next/server";
import { Agent, run } from "@openai/agents";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ leadId: z.string().uuid() });
const researchSchema = z.object({
  businessSummary: z.string(),
  likelyCustomerSegments: z.array(z.string()).max(5),
  websiteOpportunity: z.string(),
  strengths: z.array(z.string()).max(5),
  gapsToVerify: z.array(z.string()).max(6),
  recommendedWebsiteSections: z.array(z.string()).max(8),
  outreachAngle: z.string(),
  confidence: z.number().min(0).max(100),
  evidenceLimitations: z.array(z.string()).max(6),
});

const researchAgent = new Agent({
  name: "AdSpark Photography Business Research Agent",
  model: "gpt-4.1-mini",
  instructions: `You are AdSpark Studio's careful B2B research analyst for photography studios in Chennai, India.
Analyze only the supplied Google Places and business-profile fields. Do not claim you visited a website, inspected Instagram, read individual reviews, checked recent activity, or verified facts that are not in the input.
Separate known facts from hypotheses. If websiteUrl is null, say Google Places did not list a website; do not assert the business has no website.
Give useful, respectful website improvement opportunities, not negative or deceptive claims. Do not invent services, awards, client names, prices, review themes, social handles, or contact details.
The output is used by a human salesperson. Be concise, practical, and specific to photography studios. List important unknowns under gapsToVerify and evidenceLimitations. Confidence must reflect the limited supplied evidence.`,
  outputType: researchSchema,
});

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: "A valid leadId is required." }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: "OpenAI is not configured on the server." }, { status: 503 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok: false, error: "Please sign in before researching leads." }, { status: 401 });

    const { data: lead, error: leadError } = await supabase.from("leads")
      .select("id,business_name,phone,website_url,instagram_url,business_category,business_address,evidence,source")
      .eq("id", parsed.data.leadId).eq("owner_id", user.id).single();
    if (leadError || !lead) return NextResponse.json({ ok: false, error: "Lead not found in your workspace." }, { status: 404 });

    const input = {
      businessName: lead.business_name,
      category: lead.business_category,
      address: lead.business_address,
      phoneAvailable: Boolean(lead.phone),
      websiteUrl: lead.website_url,
      instagramUrl: lead.instagram_url,
      source: lead.source,
      GooglePlacesEvidence: lead.evidence ?? {},
    };
    const result = await run(researchAgent, JSON.stringify(input), { maxTurns: 2 });
    if (!result.finalOutput) return NextResponse.json({ ok: false, error: "The research agent did not return a result." }, { status: 502 });

    const report = researchSchema.parse(result.finalOutput);
    const { data: saved, error: saveError } = await supabase.from("research_reports").insert({
      owner_id: user.id,
      lead_id: lead.id,
      findings: report,
      evidence: [{ source: "Google Places record", fields: ["business_name", "business_category", "business_address", "phone availability", "website_url", "instagram_url", "evidence"] }],
      confidence: report.confidence,
    }).select("id").single();
    if (saveError) return NextResponse.json({ ok: false, error: "Research completed but saving the report failed." }, { status: 500 });

    await supabase.from("leads").update({ status: "researching", last_researched_at: new Date().toISOString() }).eq("id", lead.id).eq("owner_id", user.id);
    return NextResponse.json({ ok: true, reportId: saved.id, leadId: lead.id, research: report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected research error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
