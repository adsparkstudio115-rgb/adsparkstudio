"use client";
import { useState } from "react";

type Research={businessSummary:string;likelyCustomerSegments:string[];websiteOpportunity:string;strengths:string[];gapsToVerify:string[];recommendedWebsiteSections:string[];outreachAngle:string;confidence:number;evidenceLimitations:string[]};
type LeadResult={leadId:string|null;placeId:string;name:string;address:string|null;phone:string|null;website:string|null;rating:number|null;reviewCount:number;googleMapsUrl:string|null;hasPhone:boolean;hasWebsite:boolean;qualified:boolean;score:number};
type SearchResponse={ok:boolean;error?:string|{fieldErrors?:Record<string,string[]>};totalFound?:number;qualifiedCount?:number;saved?:number;note?:string;results?:LeadResult[]};

export default function FinderClient(){
 const [niche,setNiche]=useState("Photography studios"),[area,setArea]=useState("Maduravoyal"),[minReviews,setMinReviews]=useState(1),[maxResults,setMaxResults]=useState(20);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[data,setData]=useState<SearchResponse|null>(null);
 const [research,setResearch]=useState<Record<string,Research>>({}),[researching,setResearching]=useState<string|null>(null),[researchError,setResearchError]=useState("");
 const [expanded,setExpanded]=useState<string|null>(null),[generating,setGenerating]=useState<string|null>(null),[demoLinks,setDemoLinks]=useState<Record<string,string>>({}),[demoError,setDemoError]=useState("");

 async function runResearch(lead:LeadResult){
  if(!lead.leadId)return;setResearching(lead.leadId);setResearchError("");
  try{const r=await fetch("/api/agents/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leadId:lead.leadId})});const j=await r.json();if(!r.ok||!j.ok||!j.research)throw new Error(j.error||"Research failed");setResearch(v=>({...v,[lead.leadId!]:j.research}));}
  catch(e){setResearchError(e instanceof Error?e.message:"Research failed");}finally{setResearching(null);}
 }
 async function generateDemo(lead:LeadResult){
  if(!lead.leadId)return;setGenerating(lead.leadId);setDemoError("");
  try{const r=await fetch("/api/demos/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({leadId:lead.leadId})});const j=await r.json();if(!r.ok||!j.ok||!j.url)throw new Error(j.error||"Could not generate demo");setDemoLinks(v=>({...v,[lead.leadId!]:j.url}));}
  catch(e){setDemoError(e instanceof Error?e.message:"Demo generation failed");}finally{setGenerating(null);}
 }
 async function search(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setData(null);setResearch({});setDemoLinks({});
  try{const r=await fetch("/api/places/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({niche,area,minReviews,maxResults})});const j=await r.json() as SearchResponse;if(!r.ok||!j.ok)throw new Error(typeof j.error==="string"?j.error:"Search failed. Check Google Places and sign-in.");setData(j);}
  catch(e){setError(e instanceof Error?e.message:"Unexpected search error");}finally{setBusy(false);}
 }
 function whatsappUrl(lead:LeadResult,demoUrl:string){
  if(!lead.phone)return null;const digits=lead.phone.replace(/\\D/g,"");
  const message=`Hi! We came across ${lead.name} and created a personalised website homepage concept for your studio. You can preview it here: ${window.location.origin}${demoUrl}\n\nWe are Adspark Studio. If you like the direction, we would be happy to discuss building a complete website for your business. Thank you!`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
 }
 return <div className="finder-workflow">
  <form className="form-panel finder-controls" onSubmit={search}>
   <div className="finder-form-title"><span className="finder-icon">⌕</span><div><b>Google Maps lead finder</b><small>Photography studios · Chennai, Tamil Nadu</small></div></div>
   <label>Business niche<input value={niche} onChange={e=>setNiche(e.target.value)} required maxLength={80}/></label>
   <label>Area / locality<input value={area} onChange={e=>setArea(e.target.value)} required maxLength={120}/></label>
   <div className="two-col"><label>Minimum Google reviews<input type="number" min="0" max="10000" value={minReviews} onChange={e=>setMinReviews(Number(e.target.value))}/></label><label>Maximum results<select value={maxResults} onChange={e=>setMaxResults(Number(e.target.value))}><option value={10}>10 businesses</option><option value={20}>20 businesses</option></select></label></div>
   <div className="filter-summary"><b>Lead qualification</b><span>✓ Public phone number</span><span>✓ No website listed on Google</span><span>✓ Minimum review threshold</span></div>
   <button className="primary-btn finder-search-btn" disabled={busy}>{busy?"Searching Google Maps…":"Find businesses →"}</button>
   <small className="form-note">Results are saved to your private Supabase lead database. WhatsApp is always sent manually by you.</small>
  </form>
  <section className="finder-results">
   <div className="results-heading"><div><span className="eyebrow">STEP 01 · DISCOVER</span><h2>Photography studio leads</h2><p>{data?`${data.totalFound} found · ${data.qualifiedCount} qualified · ${data.saved} saved to database`:"Search Google Maps to start building your prospect list."}</p></div><span className="live-label"><i/> GOOGLE PLACES</span></div>
   {error&&<div className="error-panel" role="alert">{error}</div>}{researchError&&<div className="error-panel" role="alert">{researchError}</div>}{demoError&&<div className="error-panel" role="alert">{demoError}</div>}
   {!data&&!error&&<div className="empty-results"><div className="empty-map">⌖</div><b>Your lead list starts here</b><p>Choose a Chennai locality and click Find businesses.</p></div>}
   {data?.results?.map(lead=><article className="lead-result lead-workflow-card" key={lead.placeId}>
    <div className="lead-result-top"><div><h3>{lead.name}</h3><p>{lead.address||"Address not provided"}</p></div><span className={lead.qualified?"qualified-tag":"review-tag"}>{lead.qualified?"QUALIFIED":"REVIEW"}</span></div>
    <div className="lead-meta"><span>{lead.phone||"No phone listed"}</span><span>{lead.rating?`★ ${lead.rating} · ${lead.reviewCount} reviews`:"No rating data"}</span><span>{lead.hasWebsite?"Website listed":"No website listed"}</span></div>
    <div className="lead-card-toolbar"><span className="lead-score">Lead score <b>{lead.score}/100</b></span><button type="button" className="text-action" onClick={()=>setExpanded(expanded===lead.placeId?null:lead.placeId)}>{expanded===lead.placeId?"Hide details":"View business details"} ↓</button>{lead.googleMapsUrl&&<a href={lead.googleMapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}</div>
    {expanded===lead.placeId&&<div className="lead-expanded"><div><small>PHONE</small><b>{lead.phone||"Not listed"}</b></div><div><small>WEBSITE</small><b>{lead.website||"No website listed on Google"}</b></div><div><small>GOOGLE RATING</small><b>{lead.rating??"Not available"} · {lead.reviewCount} reviews</b></div><div><small>QUALIFICATION</small><b>{lead.qualified?"Meets current filters":"Needs manual review"}</b></div>
      <button type="button" className="secondary-btn" disabled={!lead.leadId||researching===lead.leadId} onClick={()=>runResearch(lead)}>{researching===lead.leadId?"Researching with AI…":research[lead.leadId||""]?"Refresh AI research":"✦ Research this business with AI"}</button>
      {research[lead.leadId||""]&&<div className="research-card"><div className="research-card-head"><b>AI business research</b><span>{research[lead.leadId||""]?.confidence}% confidence</span></div><p>{research[lead.leadId||""]?.businessSummary}</p><b>Website opportunity</b><p>{research[lead.leadId||""]?.websiteOpportunity}</p><b>Suggested homepage sections</b><div className="research-chips">{research[lead.leadId||""]?.recommendedWebsiteSections.map(x=><span key={x}>{x}</span>)}</div><b>Suggested outreach angle</b><p>{research[lead.leadId||""]?.outreachAngle}</p><small>AI uses available Google Places data only. Verify details before contacting the business.</small></div>}
    </div>}
    <div className="lead-primary-actions">
      <button type="button" className="primary-btn" disabled={!lead.leadId||generating===lead.leadId} onClick={()=>generateDemo(lead)}>{generating===lead.leadId?"Creating homepage…":demoLinks[lead.leadId||""]?"Generate another demo":"✦ Generate demo homepage"}</button>
      {demoLinks[lead.leadId||""]&&<><a className="secondary-btn" href={demoLinks[lead.leadId||""]}>Preview demo homepage ↗</a>{lead.phone?<a className="whatsapp-action" href={whatsappUrl(lead,demoLinks[lead.leadId||""] )||"#"} target="_blank" rel="noreferrer">Send demo on WhatsApp ↗</a>:<span className="form-note">No public phone number; copy the demo link to share manually.</span>}</>}
    </div>
   </article>)}
   {data?.note&&<p className="form-note">{data.note}</p>}
  </section>
 </div>;
}
