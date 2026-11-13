import Link from "next/link";
import FinderClient from "./finder-client";

export default function FinderPage() {
  return <main className="subpage finder-page">
    <Link href="/" className="back-link">← Back to overview</Link>
    <span className="eyebrow">LEAD DISCOVERY · GOOGLE PLACES</span>
    <h1>Find photography studios</h1>
    <p className="subcopy">Search local businesses, qualify studios without websites and save matching prospects to your AdSpark lead database.</p>
    <FinderClient />
  </main>;
}
