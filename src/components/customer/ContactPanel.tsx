"use client";

import { useEffect, useRef, useState } from "react";
import { X, Copy, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CustomerListing } from "@/types/customer";

export function ContactPanel({ listing, prompt, onClose }: {
  listing: CustomerListing; prompt: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previousFocus?.focus(); };
  }, []);
  const { email, phone, website } = listing.contact;
  async function copyInquiry() {
    const inquiry = `Hello ${listing.seller_name},\n\nI am interested in your ${listing.grade_name} ${listing.form} listing (${listing.id}).\n${prompt ? `\nProject requirements: ${prompt}\n` : ""}\nPlease confirm availability, pricing, and delivery options. Thank you.`;
    try { await navigator.clipboard.writeText(inquiry); setCopyStatus("Inquiry copied. Paste it into your email or preferred contact channel."); }
    catch { setCopyStatus("Clipboard access is unavailable. You can contact the supplier using the details above."); }
  }
  return <dialog ref={dialog} className="contact-panel" aria-labelledby="contact-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="contact-heading"><span className="eyebrow">Direct connection</span><button className="icon-button" type="button" onClick={onClose} aria-label="Close contact panel"><X size={20} /></button></div>
    <h2 id="contact-title">{listing.seller_name}</h2>
    <p className="muted">{listing.city}{listing.state && `, ${listing.state}`}</p>
    <div className="contact-links">
      {email && <a href={`mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`}><span><small>Email</small>{email}</span><ArrowUpRight size={18} /></a>}
      {phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}><span><small>Phone</small>{phone}</span><ArrowUpRight size={18} /></a>}
      {website && <a href={website} target="_blank" rel="noopener noreferrer"><span><small>Website</small>{new URL(website).hostname}</span><ArrowUpRight size={18} /></a>}
      {!email && !phone && !website && <p className="empty-contact">{listing.is_demo ? "This is a synthetic supplier. Real business contact details are not available." : "This supplier has not published business contact details yet."}</p>}
    </div>
    <p className="small muted">Your conversation takes place directly with the supplier.</p>
    <Link className="solid-button" href={`/listings/${encodeURIComponent(listing.id)}`}>Inspect lot & request a quote <ArrowUpRight size={16} /></Link>
    <button className="text-button copy-button" type="button" onClick={copyInquiry}><Copy size={15} />Copy inquiry</button>
    <p role="status" className="small muted">{copyStatus}</p>
  </dialog>;
}
