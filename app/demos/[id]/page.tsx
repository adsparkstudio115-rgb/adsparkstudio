import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DemoActions from "./demo-actions";

export const dynamic = "force-dynamic";
export default async function DemoPreviewPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:demo}=await supabase.from("demo_projects").select("id,lead_id,brand_data,status,created_at").eq("id",id).eq("owner_id",user.id).single();
  if(!demo) notFound();
  const {data:lead}=await supabase.from("leads").select("id,business_name,phone,business_address").eq("id",demo.lead_id).eq("owner_id",user.id).single();
  if(!lead) notFound();
  const d=demo.brand_data as {heroTitle?:string;tagline?:string;introduction?:string;primaryCta?:string;services?:string[];sections?:{title:string;description:string}[];visualDirection?:string;palette?:string[];businessName?:string;locality?:string;conceptOnly?:boolean};
  return <main className="demo-workspace">
    <div className="demo-toolbar"><Link href="/finder">← Back to leads</Link><span>HOMEPAGE CONCEPT · NOT YET PUBLISHED</span><DemoActions phone={lead.phone} businessName={lead.business_name} demoUrl={`${process.env.NEXT_PUBLIC_SITE_URL||"https://adsparkstudio-lilac.vercel.app"}/demos/${demo.id}`} /></div>
    <section className="demo-browser"><div className="demo-browser-bar"><i/><i/><i/><span>{lead.business_name.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.preview</span></div>
      <div className="demo-site" style={{"--demo-accent":d.palette?.[0]||"#b99a72","--demo-secondary":d.palette?.[1]||"#26211d","--demo-bg":d.palette?.[2]||"#f5f0e9"} as React.CSSProperties}>
        <header className="demo-site-header"><b>{lead.business_name}</b><nav><span>HOME</span><span>PORTFOLIO</span><span>ABOUT</span><span>CONTACT</span></nav><button>ENQUIRE</button></header>
        <section className="demo-hero"><div className="demo-hero-image"><div className="demo-image-label">PHOTOGRAPHY · CHENNAI</div></div><div className="demo-hero-copy"><small>CAPTURING YOUR STORIES</small><h1>{d.heroTitle||lead.business_name}</h1><p>{d.tagline}</p><span>{d.primaryCta||"Explore our work"} ↗</span></div></section>
        <section className="demo-intro"><small>THE ART OF PRESERVING MOMENTS</small><h2>{lead.business_name}</h2><p>{d.introduction}</p><div className="demo-service-grid">{(d.services||[]).map((s,i)=><div key={s}><span>0{i+1}</span><b>{s}</b></div>)}</div></section>
        {(d.sections||[]).map((s,i)=><section className="demo-copy-section" key={s.title}><small>0{i+1} / OUR APPROACH</small><h2>{s.title}</h2><p>{s.description}</p></section>)}
        <footer className="demo-site-footer"><b>{lead.business_name}</b><span>{lead.business_address||"Chennai, Tamil Nadu"}</span><span>Personalised homepage concept by Adspark Studio</span></footer>
      </div>
    </section>
    <p className="demo-disclaimer">This is an AI-generated homepage concept for discussion. Verify all business details, imagery and services with the studio before presenting it as a final website.</p>
  </main>;
}
