import Link from "next/link";
import { Zap, LayoutDashboard, Search, LogOut } from "lucide-react";
import FinderClient from "./finder/finder-client";

export default function Dashboard(){
 return <main className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-mark"><Zap size={20}/></div><div><b>AdSpark</b><span>LEADFLOW AI</span></div></div>
   <div className="nav-label">WORKSPACE</div>
   <Link className="nav-item" href="/"><LayoutDashboard size={16}/><span>Overview</span></Link>
   <a className="nav-item active" href="#lead-workspace"><Search size={16}/><span>Lead workspace</span></a>
   <div className="sidebar-note"><b>One workflow</b><p>Search Google Maps, create a homepage demo and prepare WhatsApp outreach without switching pages.</p></div>
   <div className="sidebar-bottom"><div className="avatar">AS</div><div><b>AdSpark Studio</b><span>Workspace owner</span></div></div>
  </aside>
  <section className="main unified-main" id="lead-workspace">
   <header className="topbar"><div><span className="eyebrow">ADSPARK / CLIENT ACQUISITION</span><h1>Find your next client.</h1><p>One workspace from Google Maps search to WhatsApp outreach.</p></div><div className="top-actions"><span className="status"><i/> Workspace</span><span className="profile">AS</span></div></header>
   <section className="unified-hero"><div><span className="pill"><Zap size={13}/> LEADFLOW WORKSPACE</span><h2>Search once.<br/><em>Create. Preview. Send.</em></h2><p>Find real businesses, inspect their details, generate a personalized homepage concept and share it through WhatsApp — all below.</p></div><div className="unified-hero-steps"><span>01 · DISCOVER</span><span>02 · GENERATE</span><span>03 · SHARE</span></div></section>
   <FinderClient/>
   <footer>ADSPARK LEADFLOW AI <span>PRIVATE WORKSPACE · ONE CONNECTED FLOW</span></footer>
  </section>
 </main>;
}
