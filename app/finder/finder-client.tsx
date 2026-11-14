"use client";

import { useState } from "react";
import { Search, MapPin, Star, Globe, Phone, MessageCircle, ExternalLink, ChevronDown, LoaderCircle } from "lucide-react";

type LeadResult = {
  leadId: string | null;
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string | null;
  hasPhone: boolean;
  hasWebsite: boolean;
  qualified: boolean;
  score: number;
};
type SearchResponse = {
  ok: boolean;
  error?: string | { fieldErrors?: Record<string, string[]> };
  totalFound?: number;
  qualifiedCount?: number;
  saved?: number;
  note?: string;
  results?: LeadResult[];
};

function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "91" + digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  return digits;
}

function proposalMessage(lead: LeadResult) {
  return `✨ Hi ${lead.name}! 😊

I'm Deepak from AdSpark Studio.

We design professional photography websites to showcase your photos, portfolio and services, and help your studio receive more customer enquiries. 📸

Our photography website package starts at ₹3,000 and can include a custom design, domain, hosting and an admin portal.

Here are a couple of examples:
https://www.arunsphotography.in/
https://rgphotography.co.in/

Would you be open to a quick discussion about a website or redesign for ${lead.name}?

Thanks,
Deepak | AdSpark Studio`;
}

export default function FinderClient() {
  const [niche, setNiche] = useState("Photography studios");
  const [area, setArea] = useState("Chennai");
  const [minReviews, setMinReviews] = useState(1);
  const [maxResults, setMaxResults] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setData(null);
    setExpanded(null);
    try {
      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, area, minReviews, maxResults }),
      });
      const result = await response.json() as SearchResponse;
      if (!response.ok || !result.ok) {
        throw new Error(typeof result.error === "string" ? result.error : "Search failed. Check Google Places and sign-in.");
      }
      setData(result);
      if (result.results?.length) setExpanded(result.results[0].placeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected search error");
    } finally {
      setBusy(false);
    }
  }

  function messageStudio(lead: LeadResult) {
    if (!lead.phone) {
      setError("This studio has no public phone number listed in Google Maps.");
      return;
    }
    const number = toWhatsAppNumber(lead.phone);
    if (!number || number.length < 10) {
      setError("The phone number listed for this studio is not a valid WhatsApp number.");
      return;
    }
    setError("");
    const text = proposalMessage(lead);
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="unified-workspace">
      <section className="search-panel">
        <div className="search-panel-heading">
          <div className="search-mark"><Search size={19} /></div>
          <div>
            <span className="eyebrow">STEP 01 · GOOGLE MAPS</span>
            <h2>Find your next client</h2>
            <p>Search studios, review their details and contact them directly.</p>
          </div>
        </div>
        <form onSubmit={search} className="unified-search-form">
          <label>
            Business type
            <input value={niche} onChange={(e) => setNiche(e.target.value)} required maxLength={80} placeholder="e.g. Photography studios" />
          </label>
          <label>
            City or locality
            <input value={area} onChange={(e) => setArea(e.target.value)} required maxLength={120} placeholder="e.g. Chennai" />
          </label>
          <div className="search-options">
            <label>
              Minimum Google reviews
              <input type="number" min="0" max="10000" value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))} />
            </label>
            <label>
              Maximum results
              <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))}>
                <option value={10}>10 businesses</option>
                <option value={20}>20 businesses</option>
              </select>
            </label>
          </div>
          <button className="primary-btn unified-search-button" disabled={busy}>
            {busy ? <><LoaderCircle size={15} className="spin" /> Searching Google Maps…</> : <><Search size={15} /> Search businesses</>}
          </button>
        </form>
        <p className="search-footnote">Leads are saved to your private Supabase database. Choose a studio and open WhatsApp with a personalized proposal ready to review and send.</p>
      </section>

      <section className="unified-results">
        <div className="unified-results-head">
          <div>
            <span className="eyebrow">STEP 02 · LEADS & OUTREACH</span>
            <h2>Business results</h2>
            <p>{data ? `${data.totalFound ?? 0} found · ${data.qualifiedCount ?? 0} qualified · ${data.saved ?? 0} saved` : "Your business profiles and contact options will appear here after searching."}</p>
          </div>
          {data && <span className="live-label"><i /> LIVE RESULTS</span>}
        </div>

        {error && <div className="error-panel" role="alert">{error}</div>}

        {!data && !busy && (
          <div className="empty-results">
            <div className="empty-map"><MapPin size={32} /></div>
            <b>Your lead workspace is ready</b>
            <p>Enter a business type and location, then search Google Maps.</p>
          </div>
        )}
        {busy && (
          <div className="empty-results">
            <LoaderCircle size={28} className="spin" />
            <b>Finding local businesses…</b>
            <p>Google Places results are being collected and saved.</p>
          </div>
        )}

        {data?.results?.map((lead, index) => {
          const isOpen = expanded === lead.placeId;
          return (
            <article className="unified-lead-card" key={lead.placeId}>
              <div className="unified-lead-summary">
                <div className="lead-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="unified-lead-title">
                  <div className="lead-title-line">
                    <h3>{lead.name}</h3>
                    <span className={lead.qualified ? "qualified-tag" : "review-tag"}>{lead.qualified ? "QUALIFIED" : "REVIEW"}</span>
                  </div>
                  <p><MapPin size={12} />{lead.address || "Address not available"}</p>
                  <div className="unified-lead-meta">
                    <span><Phone size={12} />{lead.phone || "No phone listed"}</span>
                    <span><Star size={12} />{lead.rating ?? "—"} · {lead.reviewCount} reviews</span>
                    <span><Globe size={12} />{lead.hasWebsite ? "Website listed" : "No website listed"}</span>
                  </div>
                </div>
                <div className="lead-score-box"><b>{lead.score}</b><small>LEAD SCORE</small></div>
              </div>

              <div className="lead-quick-actions">
                <button type="button" className="text-action" onClick={() => setExpanded(isOpen ? null : lead.placeId)}>
                  {isOpen ? "Hide details" : "Business details"} <ChevronDown size={13} />
                </button>
                {lead.googleMapsUrl && <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={12} /></a>}
                <button
                  type="button"
                  className="whatsapp-quick-button"
                  disabled={!lead.phone}
                  onClick={() => messageStudio(lead)}
                  title={lead.phone ? `Open WhatsApp chat with ${lead.phone}` : "No public phone number listed"}
                >
                  <MessageCircle size={14} />
                  {lead.phone ? `Message on WhatsApp · ${lead.phone}` : "No phone number"}
                </button>
              </div>

              {isOpen && (
                <div className="lead-workflow-details">
                  <div className="business-details-grid">
                    <div><small>PHONE / WHATSAPP</small><b>{lead.phone || "Not listed on Google Maps"}</b></div>
                    <div><small>WEBSITE</small><b>{lead.website || "No website listed on Google"}</b></div>
                    <div><small>GOOGLE RATING</small><b>{lead.rating ?? "Not available"} · {lead.reviewCount} reviews</b></div>
                    <div><small>QUALIFICATION</small><b>{lead.qualified ? "Meets your current filters" : "Needs manual review"}</b></div>
                  </div>
                  <div className="contact-note">
                    <MessageCircle size={16} />
                    <div>
                      <b>Contact this studio</b>
                      <p>WhatsApp will open with a personalized AdSpark Studio proposal and this business’s phone number. Review the text and press Send in WhatsApp.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="whatsapp-quick-button detail-whatsapp-button"
                    disabled={!lead.phone}
                    onClick={() => messageStudio(lead)}
                  >
                    <MessageCircle size={14} />
                    {lead.phone ? `Message ${lead.name} · ${lead.phone}` : "No public phone number"}
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {data?.note && <p className="search-footnote">{data.note}</p>}
      </section>
    </div>
  );
}
