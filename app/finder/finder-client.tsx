"use client";

import { useState } from "react";

type LeadResult = {
  placeId: string; name: string; address: string | null; phone: string | null;
  website: string | null; rating: number | null; reviewCount: number;
  googleMapsUrl: string | null; hasPhone: boolean; hasWebsite: boolean;
  qualified: boolean; score: number;
};
type SearchResponse = { ok: boolean; error?: string | { fieldErrors?: Record<string, string[]> }; totalFound?: number; qualifiedCount?: number; saved?: number; note?: string; results?: LeadResult[] };

export default function FinderClient() {
  const [niche, setNiche] = useState("Photography studios");
  const [area, setArea] = useState("Maduravoyal");
  const [minReviews, setMinReviews] = useState(1);
  const [maxResults, setMaxResults] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setData(null);
    try {
      const response = await fetch("/api/places/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, area, minReviews, maxResults }),
      });
      const result = await response.json() as SearchResponse;
      if (!response.ok || !result.ok) throw new Error(typeof result.error === "string" ? result.error : "Search failed. Check sign-in and Google Places configuration.");
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Unexpected search error"); }
    finally { setBusy(false); }
  }

  return <div className="finder-layout">
    <form className="form-panel finder-controls" onSubmit={search}>
      <div className="finder-form-title"><span className="finder-icon">⌕</span><div><b>Search settings</b><small>Google Places · Chennai, Tamil Nadu</small></div></div>
      <label>Business niche<input value={niche} onChange={e=>setNiche(e.target.value)} required maxLength={80}/></label>
      <label>Area / locality<input value={area} onChange={e=>setArea(e.target.value)} required maxLength={120}/></label>
      <div className="two-col">
        <label>Minimum Google reviews<input type="number" min="0" max="10000" value={minReviews} onChange={e=>setMinReviews(Number(e.target.value))}/></label>
        <label>Maximum results<select value={maxResults} onChange={e=>setMaxResults(Number(e.target.value))}><option value={10}>10 businesses</option><option value={20}>20 businesses</option></select></label>
      </div>
      <div className="filter-summary"><b>Qualification rules</b><span>✓ Public phone number required</span><span>✓ No website listed on Google</span><span>✓ Minimum review threshold</span></div>
      <button className="primary-btn" disabled={busy}>{busy ? "Searching Google Places…" : "Search businesses →"}</button>
      <small className="form-note">Search results are saved to your authenticated Supabase lead database. No WhatsApp messages are sent.</small>
    </form>
    <section className="finder-results">
      <div className="results-heading"><div><h2>Search results</h2><p>{data ? `${data.totalFound} found · ${data.qualifiedCount} qualified · ${data.saved} saved` : "Run a search to discover local studios."}</p></div><span className="live-label"><i/> LIVE SEARCH</span></div>
      {error && <div className="error-panel" role="alert">{error}</div>}
      {!data && !error && <div className="empty-results"><div className="empty-map">⌖</div><b>Ready to discover businesses</b><p>Start with photography studios in Maduravoyal, Chennai.</p></div>}
      {data?.results?.map((lead) => <article className="lead-result" key={lead.placeId}>
        <div className="lead-result-top"><div><h3>{lead.name}</h3><p>{lead.address || "Address not provided"}</p></div><span className={lead.qualified ? "qualified-tag" : "review-tag"}>{lead.qualified ? "QUALIFIED" : "REVIEW"}</span></div>
        <div className="lead-meta"><span>{lead.phone || "No phone listed"}</span><span>{lead.rating ? `★ ${lead.rating} · ${lead.reviewCount} reviews` : "No rating data"}</span><span>{lead.hasWebsite ? "Website listed" : "No website listed"}</span></div>
        <div className="lead-result-bottom"><span>Lead score <b>{lead.score}/100</b></span>{lead.googleMapsUrl && <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer">View on Google Maps ↗</a>}</div>
      </article>)}
      {data?.note && <p className="form-note">{data.note}</p>}
    </section>
  </div>;
}
