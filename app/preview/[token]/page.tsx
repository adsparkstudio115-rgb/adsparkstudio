import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function PublicDemoPage({params}:{params:Promise<{token:string}>}) {
 const {token}=await params;
 if(!/^[a-f0-9]{48}$/.test(token)) notFound();
 const supabase=await createClient();
 const {data,error}=await supabase.rpc("get_shared_demo",{p_token:token});
 const demo=Array.isArray(data)?data[0]:null;
 if(error||!demo) notFound();
 const d=demo.brand_data as {heroTitle?:string;tagline?:string;introduction?:string;primaryCta?:string;services?:string[];sections?:{title:string;description:string}[];palette?:string[]};
 return <main className="demo-workspace">
  <div className="demo-toolbar"><a href="https://adsparkstudio.co.in/" target="_blank" rel="noreferrer">AdSpark Studio ↗</a><span>PERSONALISED HOMEPAGE CONCEPT · NOT YET PUBLISHED</span></div>
  <section className="demo-browser"><div className="demo-browser-bar"><i/><i/><i/><span>{demo.business_name} · homepage concept</span></div>
   <div className="demo-site" style={{"--demo-accent":d.palette?.[0]||"#b99a72","--demo-secondary":d.palette?.[1]||"#26211d","--demo-bg":d.palette?.[2]||"#f5f0e9"} as React.CSSProperties}>
    <header className="demo-site-header"><b>{demo.business_name}</b><nav><span>HOME</span><span>PORTFOLIO</span><span>ABOUT</span><span>CONTACT</span></nav><button>ENQUIRE</button></header>
    <section className="demo-hero"><div className="demo-hero-image"><div className="demo-image-label">PHOTOGRAPHY · CHENNAI</div></div><div className="demo-hero-copy"><small>CAPTURING YOUR STORIES</small><h1>{d.heroTitle||demo.business_name}</h1><p>{d.tagline}</p><span>{d.primaryCta||"Explore our work"} ↗</span></div></section>
    <section className="demo-intro"><small>THE ART OF PRESERVING MOMENTS</small><h2>{demo.business_name}</h2><p>{d.introduction}</p><div className="demo-service-grid">{(d.services||[]).map((s:string,i:number)=><div key={s}><span>0{i+1}</span><b>{s}</b></div>)}</div></section>
    {(d.sections||[]).map((s:{title:string;description:string},i:number)=><section className="demo-copy-section" key={s.title}><small>0{i+1} / OUR APPROACH</small><h2>{s.title}</h2><p>{s.description}</p></section>)}
    <footer className="demo-site-footer"><b>{demo.business_name}</b><span>{demo.business_address||"Chennai, Tamil Nadu"}</span><span>Homepage concept by AdSpark Studio · Contact us to discuss this design</span></footer>
   </div>
  </section>
  <p className="demo-disclaimer">This is a design concept created for discussion, not a live business website. Business details, photography and services should be verified by the business owner.</p>
 </main>;
}
