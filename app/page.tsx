import Link from "next/link";
import { Zap, LayoutDashboard, Search } from "lucide-react";
import FinderClient from "./finder/finder-client";

export default function Dashboard() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Zap size={20} /></div>
          <div><b>AdSpark</b><span>LEADFLOW AI</span></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <Link className="nav-item" href="/"><LayoutDashboard size={16} /><span>Overview</span></Link>
        <a className="nav-item active" href="#lead-workspace"><Search size={16} /><span>Lead workspace</span></a>
        <div className="sidebar-note">
          <b>One workflow</b>
          <p>Search Google Maps, review studio details and contact owners directly through WhatsApp.</p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">AS</div>
          <div><b>AdSpark Studio</b><span>Workspace owner</span></div>
        </div>
      </aside>

      <section className="main unified-main" id="lead-workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">ADSPARK / CLIENT ACQUISITION</span>
            <h1>Find your next client.</h1>
            <p>Search Google Maps, qualify studios and contact them through WhatsApp.</p>
          </div>
          <div className="top-actions"><span className="status"><i /> Workspace</span><span className="profile">AS</span></div>
        </header>
        <section className="unified-hero">
          <div>
            <span className="pill"><Zap size={13} /> LEADFLOW WORKSPACE</span>
            <h2>Search once.<br /><em>Find. Connect. Grow.</em></h2>
            <p>Find photography studios, inspect their business details and open a personalized WhatsApp proposal to the studio’s listed contact number.</p>
          </div>
          <div className="unified-hero-steps">
            <span>01 · DISCOVER</span>
            <span>02 · QUALIFY</span>
            <span>03 · CONNECT</span>
          </div>
        </section>
        <FinderClient />
        <footer>ADSPARK LEADFLOW AI <span>PRIVATE WORKSPACE · LEAD SEARCH & WHATSAPP OUTREACH</span></footer>
      </section>
    </main>
  );
}
