import Link from "next/link";
import CampaignForm from "./campaign-form";
export default function CampaignsPage(){return <main className="subpage"><Link href="/" className="back-link">← Back to overview</Link><span className="eyebrow">CAMPAIGN WORKSPACE</span><h1>Create a lead discovery campaign</h1><p className="subcopy">Start with photography studios in Chennai. Discovery stays disabled until Google Places credentials are configured.</p><section className="form-panel"><CampaignForm/></section></main>;}
