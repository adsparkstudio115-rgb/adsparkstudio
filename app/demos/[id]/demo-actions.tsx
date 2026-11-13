"use client";
import { useState } from "react";
export default function DemoActions({phone,businessName,demoUrl}:{phone:string|null;businessName:string;demoUrl:string}) {
 const [copied,setCopied]=useState(false);
 const message=`Hi! We came across ${businessName} and created a personalised website homepage concept for your studio. You can preview it here: ${demoUrl}\n\nWe are Adspark Studio. If you like the direction, we would be happy to discuss building a complete website for your business. Thank you!`;
 const digits=(phone||"").replace(/\D/g,"");
 const whatsapp=digits?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:null;
 return <div className="demo-actions">
  <button type="button" className="demo-copy-btn" onClick={async()=>{await navigator.clipboard.writeText(demoUrl);setCopied(true);}}> {copied?"Link copied":"Copy demo link"} </button>
  {whatsapp?<a className="demo-whatsapp-btn" href={whatsapp} target="_blank" rel="noreferrer">Open WhatsApp message ↗</a>:<button type="button" className="demo-copy-btn" onClick={async()=>{await navigator.clipboard.writeText(message);setCopied(true);}}>Copy message</button>}
 </div>;
}
