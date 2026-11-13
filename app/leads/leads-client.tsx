"use client";

import { useMemo, useState } from "react";

type Lead = {
  id: string; business_name: string; phone: string | null; website_url: string | null;
  instagram_url: string | null; business_category: string | null; business_address: string | null;
  status: string; exclusion_reason: string | null; evidence: Record<string, unknown> | null;
  last_researched_at: string | null; created_at: string;
};
const statuses = ["new","qualified","researching","demo_pending","demo_ready","approved","contacted","interested","meeting","quoted","won","lost","excluded"];
const label = (s: string) => s.replaceAll("_"," ").replace(/\b\w/g, c=>c.toUpperCase());

export default function LeadsClient({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads,setLeads] = useState(initialLeads);
  const [query,setQuery] = useState("");
  const [status,setStatus] = useState("all");
  const [busy,setBusy] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [selected,setSelected] = useState<string|null>(null);

  const filtered = useMemo(()=>leads.filter(l=>{
    const q=query.trim().toLowerCase();
    const matches = !q || [l.business_name,l.phone,l.business_address,l.instagram_url].some(v=>(v||"").toLowerCase().includes(q));
    return matches && (status==="all" || l.status===status);
  }),[leads,query,status]);
  const active = leads.find(l=>l.id===selected) ?? null;

  async function updateStatus(id:string,nextStatus:string) {
    setBusy(id);setError("");setNotice("");
    try {
      const res=await fetch("/api/leads/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:nextStatus})});
      const body=await res.json();
      if(!res.ok||!body.ok) throw new Error(body.error||"Could not update lead.");
      setLeads(current=>current.map(l=>l.id===id?{...l,status:nextStatus}:l));
      setNotice("Lead status updated.");
    } catch(e) { setError(e instanceof Error?e.message:"Update failed."); }
    finally { setBusy(null); }
  }

  const count=(s:string)=>leads.filter(l=>l.status===s).length;
  return <section className="lead-db">
    <div className="lead-db-stats">
      <div><small>Total saved</small><b>{leads.length}</b></div>
      <div><small>Qualified</small><b>{count("qualified")}</b></div>
      <div><small>In progress</small><b>{leads.filter(l=>["researching","demo_pending","demo_ready","approved","contacted","interested","meeting","quoted"].includes(l.status)).length}</b></div>
      <div><small>Won</small><b>{count("won")}</b></div>
    </div>
    <div className="lead-db-toolbar">
      <input aria-label="Search leads" placeholder="Search business, phone or locality…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="all">All statuses</option>{statuses.map(s=><option value={s} key={s}>{label(s)}</option>)}
      </select>
      <span>{filtered.length} of {leads.length} leads</span>
    </div>
    {error&&<div className="error-panel">{error}</div>}{notice&&<p className="form-note">{notice}</p>}
    {filtered.length===0?<div className="empty-results"><b>No leads found</b><p>Run a Google Maps search in the Finder or change your filters.</p></div>:
      <div className="lead-db-list">{filtered.map(lead=><article className="lead-db-row" key={lead.id}>
        <div className="lead-db-main"><h3>{lead.business_name}</h3><p>{lead.business_address||"Address unavailable"}</p><div className="lead-db-meta"><span>{lead.phone||"No phone"}</span><span>{lead.website_url?"Website listed":"No website listed"}</span><span>{String(lead.evidence?.userRatingCount??0)} Google reviews</span></div></div>
        <div className="lead-db-actions"><span className={"status-pill status-"+lead.status}>{label(lead.status)}</span><button className="secondary-btn" type="button" onClick={()=>setSelected(lead.id)}>Details</button><select aria-label={"Update status for "+lead.business_name} value={lead.status} disabled={busy===lead.id} onChange={e=>updateStatus(lead.id,e.target.value)}>{statuses.map(s=><option value={s} key={s}>{label(s)}</option>)}</select></div>
      </article>)}</div>}
    {active&&<div className="lead-detail-backdrop" role="presentation" onClick={()=>setSelected(null)}><section className="lead-detail" role="dialog" aria-modal="true" aria-label="Lead details" onClick={e=>e.stopPropagation()}>
      <button className="detail-close" onClick={()=>setSelected(null)} aria-label="Close details">×</button>
      <span className="eyebrow">LEAD DETAILS</span><h2>{active.business_name}</h2><p>{active.business_address}</p>
      <div className="detail-grid"><div><small>Phone</small><b>{active.phone||"Not listed"}</b></div><div><small>Category</small><b>{active.business_category||"Not available"}</b></div><div><small>Website</small><b>{active.website_url||"Not listed on Google"}</b></div><div><small>Instagram</small><b>{active.instagram_url||"Not collected"}</b></div><div><small>Rating</small><b>{String(active.evidence?.rating??"Not available")}</b></div><div><small>Reviews</small><b>{String(active.evidence?.userRatingCount??0)}</b></div></div>
      {active.exclusion_reason&&<p className="form-note">Qualification note: {active.exclusion_reason}</p>}
      <label className="detail-status">Lead status<select value={active.status} onChange={e=>updateStatus(active.id,e.target.value)} disabled={busy===active.id}>{statuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
      <p className="form-note">Saved {new Date(active.created_at).toLocaleString("en-IN")}</p>
    </section></div>}
  </section>;
}
