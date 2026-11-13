import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadsClient from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.from("leads")
    .select("id,business_name,phone,website_url,instagram_url,business_category,business_address,status,exclusion_reason,evidence,last_researched_at,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(250);

  return <main className="subpage leads-page">
    <Link href="/" className="back-link">← Back to overview</Link>
    <span className="eyebrow">PROSPECT DATABASE · SUPABASE</span>
    <h1>Lead database</h1>
    <p className="subcopy">All businesses saved from your Google Maps searches. Search, qualify and update each prospect as you work through your outreach.</p>
    {error ? <div className="error-panel">Could not load leads: {error.message}</div> : <LeadsClient initialLeads={data ?? []} />}
  </main>;
}
