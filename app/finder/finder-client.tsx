"use client";

import { useState } from "react";
import { Search, MapPin, Star, Globe, Phone, ImagePlus, Upload, Sparkles, Download, RefreshCw, MessageCircle, ExternalLink, ChevronDown, X, LoaderCircle } from "lucide-react";

type LeadResult={leadId:string|null;placeId:string;name:string;address:string|null;phone:string|null;website:string|null;rating:number|null;reviewCount:number;googleMapsUrl:string|null;hasPhone:boolean;hasWebsite:boolean;qualified:boolean;score:number};
type SearchResponse={ok:boolean;error?:string|{fieldErrors?:Record<string,string[]>};totalFound?:number;qualifiedCount?:number;saved?:number;note?:string;results?:LeadResult[]};
type DemoResult={url:string;imageUrl:string;demoId?:string};
type Uploads={business:File|null;reference:File|null};

export default function FinderClient(){
 const [niche,setNiche]=useState("Photography studios"),[area,setArea]=useState("Chennai"),[minReviews,setMinReviews]=useState(1),[maxResults,setMaxResults]=useState(20);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[data,setData]=useState<SearchResponse|null>(null);
 const [expanded,setExpanded]=useState<string|null>(null),[generating,setGenerating]=useState<string|null>(null);
 const [demos,setDemos]=useState<Record<string,DemoResult>>({}),[uploads,setUploads]=useState<Record<string,Uploads>>({});
 const [messages,setMessages]=useState<Record<string,string>>({}),[messageBusy,setMessageBusy]=useState<string|null>(null),[notice,setNotice]=useState("");

 async function search(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");setData(null);setDemos({});setExpanded(null);
  try{const r=await fetch("/api/places/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({niche,area,minReviews,maxResults})});const j=await r.json() as SearchResponse;if(!r.ok||!j.ok)throw new Error(typeof j.error==="string"?j.error:"Search failed. Check Google Places and sign-in.");setData(j);if(j.results?.length)setExpanded(j.results[0].placeId);}
  catch(e){setError(e instanceof Error?e.message:"Unexpected search error");}finally{setBusy(false);}
 }
 async function generateDemo(lead:LeadResult){
  if(!lead.leadId)return;
  setGenerating(lead.placeId);setError("");setNotice("");
  try{
   const form=new FormData();form.append("leadId",lead.leadId);
   const selected=uploads[lead.placeId];
   if(selected?.business)form.append("businessImage",selected.business);
   if(selected?.reference)form.append("referenceImage",selected.reference);
   const r=await fetch("/api/demos/generate",{method:"POST",body:form});const j=await r.json();
   if(!r.ok||!j.ok||!j.url||!j.imageUrl)throw new Error(j.error||"Could not generate demo");
   setDemos(v=>({...v,[lead.placeId]:{url:j.url,imageUrl:j.imageUrl,demoId:j.demoId}}));
   setNotice("Homepage demo generated and saved to this lead.");
  }catch(e){setError(e instanceof Error?e.message:"Demo generation failed");}
  finally{setGenerating(null);}
 }
 function draftMessage(lead:LeadResult){
  const demo=demos[lead.placeId];if(!demo)return;
  const preview=window.location.origin+demo.url;
  const text=`Hi ${lead.name}!

We are AdSpark Studio. We created a sample homepage concept for your business to show how your photography website could look.

Preview your demo: ${preview}

This is only a design concept. If you like it, we would be happy to discuss building your complete website.

Would you like to know more?`;
  setMessages(v=>({...v,[lead.placeId]:text}));
 }
 function openWhatsApp(lead:LeadResult,includeDemo:boolean){
  if(!lead.phone){setError("This business has no public phone number in Google Places.");return;}
  const digits=lead.phone.replace(/\D/g,"");
  const text=messages[lead.placeId]||"";
  const withImage=includeDemo&&demos[lead.placeId]?text+"\n\nDemo image: "+demos[lead.placeId].imageUrl:text;
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(withImage)}`,"_blank","noopener,noreferrer");
 }
 function sendDemoImage(lead:LeadResult){
  const demo=demos[lead.placeId];if(!demo)return;
  openWhatsApp(lead,true);
  const anchor=document.createElement("a");anchor.href=demo.imageUrl;anchor.download=`${lead.name.replace(/[^a-z0-9]/gi,"-").toLowerCase()}-homepage-demo.webp`;anchor.rel="noreferrer";document.body.appendChild(anchor);anchor.click();anchor.remove();
 }
 function setFile(placeId:string,kind:"business"|"reference",file:File|null){
  setUploads(v=>({...v,[placeId]:{business:v[placeId]?.business??null,reference:v[placeId]?.reference??null,[kind]:file}}));
 }
 return <div className="unified-workspace">
  <section className="search-panel">
   <div className="search-panel-heading"><div className="search-mark"><Search size={19}/></div><div><span className="eyebrow">STEP 01 · GOOGLE MAPS</span><h2>Find your next client</h2><p>Search once. Manage every lead and demo below.</p></div></div>
   <form onSubmit={search} className="unified-search-form">
    <label>Business type<input value={niche} onChange={e=>setNiche(e.target.value)} required maxLength={80} placeholder="e.g. Photography studios"/></label>
    <label>City or locality<input value={area} onChange={e=>setArea(e.target.value)} required maxLength={120} placeholder="e.g. Chennai"/></label>
    <div className="search-options"><label>Minimum Google reviews<input type="number" min="0" max="10000" value={minReviews} onChange={e=>setMinReviews(Number(e.target.value))}/></label><label>Maximum results<select value={maxResults} onChange={e=>setMaxResults(Number(e.target.value))}><option value={10}>10 businesses</option><option value={20}>20 businesses</option></select></label></div>
    <button className="primary-btn unified-search-button" disabled={busy}>{busy?<><LoaderCircle size={15} className="spin"/> Searching Google Maps…</>:<><Search size={15}/> Search businesses</>}</button>
   </form>
   <p className="search-footnote">Leads are saved to your private Supabase database. You review and send every WhatsApp message manually.</p>
  </section>
  <section className="unified-results">
   <div className="unified-results-head"><div><span className="eyebrow">STEP 02 · LEADS & WORKFLOW</span><h2>Business results</h2><p>{data?`${data.totalFound??0} found · ${data.qualifiedCount??0} qualified · ${data.saved??0} saved`:"Your business profiles and demo tools will appear here after searching."}</p></div>{data&&<span className="live-label"><i/> LIVE RESULTS</span>}</div>
   {error&&<div className="error-panel" role="alert">{error}</div>}{notice&&<p className="form-note">{notice}</p>}
   {!data&&!busy&&<div className="empty-results"><div className="empty-map"><MapPin size={32}/></div><b>Your lead workspace is ready</b><p>Enter a business type and location, then search Google Maps.</p></div>}
   {busy&&<div className="empty-results"><LoaderCircle size={28} className="spin"/><b>Finding local businesses…</b><p>Google Places results are being collected and saved.</p></div>}
   {data?.results?.map((lead,index)=>{
    const isOpen=expanded===lead.placeId, demo=demos[lead.placeId],selected=uploads[lead.placeId]||{business:null,reference:null};
    return <article className="unified-lead-card" key={lead.placeId}>
     <div className="unified-lead-summary">
      <div className="lead-number">{String(index+1).padStart(2,"0")}</div>
      <div className="unified-lead-title"><div className="lead-title-line"><h3>{lead.name}</h3><span className={lead.qualified?"qualified-tag":"review-tag"}>{lead.qualified?"QUALIFIED":"REVIEW"}</span></div><p><MapPin size={12}/>{lead.address||"Address not available"}</p><div className="unified-lead-meta"><span><Phone size={12}/>{lead.phone||"No phone"}</span><span><Star size={12}/>{lead.rating??"—"} · {lead.reviewCount} reviews</span><span><Globe size={12}/>{lead.hasWebsite?"Website listed":"No website listed"}</span></div></div>
      <div className="lead-score-box"><b>{lead.score}</b><small>LEAD SCORE</small></div>
     </div>
     <div className="lead-quick-actions"><button type="button" className="text-action" onClick={()=>setExpanded(isOpen?null:lead.placeId)}>{isOpen?"Hide details":"Business details"} <ChevronDown size={13}/></button>{lead.googleMapsUrl&&<a href={lead.googleMapsUrl} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={12}/></a>}<button type="button" className="create-demo-trigger" disabled={!lead.leadId||generating===lead.placeId} onClick={()=>setExpanded(lead.placeId)}><Sparkles size={13}/> Create demo</button></div>
     {isOpen&&<div className="lead-workflow-details">
      <div className="business-details-grid"><div><small>PHONE / WHATSAPP</small><b>{lead.phone||"Not listed"}</b></div><div><small>WEBSITE</small><b>{lead.website||"No website listed on Google"}</b></div><div><small>GOOGLE RATING</small><b>{lead.rating??"Not available"} · {lead.reviewCount} reviews</b></div><div><small>QUALIFICATION</small><b>{lead.qualified?"Meets your current filters":"Needs manual review"}</b></div></div>
      <div className="workflow-step-title"><span>03</span><div><b>Build a homepage demo</b><small>Upload the business photo and a design reference, then generate.</small></div></div>
      <div className="upload-grid">
       <label className="upload-tile"><input type="file" accept="image/*" onChange={e=>setFile(lead.placeId,"business",e.target.files?.[0]||null)}/><Upload size={19}/><b>{selected.business?"Business image selected":"Upload business image"}</b><small>{selected.business?.name||"Use a photo supplied by the business"}</small></label>
       <label className="upload-tile"><input type="file" accept="image/*" onChange={e=>setFile(lead.placeId,"reference",e.target.files?.[0]||null)}/><ImagePlus size={19}/><b>{selected.reference?"Reference selected":"Upload reference design"}</b><small>{selected.reference?.name||"Choose a website style to follow"}</small></label>
      </div>
      <button type="button" className="primary-btn generate-demo-button" disabled={!lead.leadId||generating===lead.placeId} onClick={()=>generateDemo(lead)}>{generating===lead.placeId?<><LoaderCircle size={15} className="spin"/> Generating homepage…</>:<><Sparkles size={15}/> {demo?"Regenerate homepage demo":"Generate homepage demo"}</>}</button>
      {demo&&<div className="demo-result-panel">
       <div className="workflow-step-title"><span>04</span><div><b>Generated demo preview</b><small>Your concept image is saved and linked to this lead.</small></div></div>
       <a href={demo.url} target="_blank" rel="noreferrer" className="demo-image-link"><img src={demo.imageUrl} alt={`Generated homepage hero for ${lead.name}`}/><span>Open full website preview <ExternalLink size={13}/></span></a>
       <div className="demo-result-actions"><a className="secondary-btn" href={demo.imageUrl} download={`${lead.name.replace(/[^a-z0-9]/gi,"-").toLowerCase()}-homepage-demo.webp`}><Download size={14}/> Download image</a><a className="secondary-btn" href={demo.url} target="_blank" rel="noreferrer">Preview website <ExternalLink size={13}/></a></div>
       <div className="workflow-step-title message-step"><span>05</span><div><b>Prepare WhatsApp message</b><small>Generate a personal message and review it before sending.</small></div></div>
       <button type="button" className="secondary-btn" onClick={()=>draftMessage(lead)}><Sparkles size={14}/> Generate personalized message</button>
       {messages[lead.placeId]&&<><textarea className="outreach-message" value={messages[lead.placeId]} onChange={e=>setMessages(v=>({...v,[lead.placeId]:e.target.value}))} rows={7}/><div className="demo-result-actions"><button type="button" className="whatsapp-action" disabled={!lead.phone} onClick={()=>openWhatsApp(lead,false)}><MessageCircle size={14}/> Send message on WhatsApp</button><button type="button" className="whatsapp-action" disabled={!lead.phone} onClick={()=>sendDemoImage(lead)}><ImagePlus size={14}/> Send demo image on WhatsApp</button></div><small className="search-footnote">WhatsApp opens with the message and demo link. To attach the actual image, download it above and add it in WhatsApp before sending.</small></>}
      </div>}
     </div>}
    </article>
   })}
   {data?.note&&<p className="search-footnote">{data.note}</p>}
  </section>
 </div>;
}
