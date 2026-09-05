"use client";

import { useEffect, useState } from "react";
import { browserAuth } from "@/lib/firebase/client-auth";
import { getSocialLinks, saveSocialLinks } from "@/features/settings/site-settings.repository";

const platforms = [
  ["youtube", "YouTube", "https://youtube.com/@your-channel"],
  ["telegram", "Telegram", "https://t.me/your-channel"],
  ["instagram", "Instagram", "https://instagram.com/your-handle"],
  ["linkedin", "LinkedIn", "https://linkedin.com/company/your-company"],
  ["facebook", "Facebook", "https://facebook.com/your-page"],
  ["whatsapp", "WhatsApp", "https://wa.me/919999999999"],
];

export default function SocialLinksEditor() {
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSocialLinks().then(setLinks).catch((error) => setMessage(error.message || "Unable to load social links.")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const user = browserAuth.currentUser;
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await saveSocialLinks(links, user.uid);
      setMessage("Social links published successfully.");
    } catch (error) {
      setMessage(error.message || "Unable to save social links.");
    } finally {
      setSaving(false);
    }
  };

  return <section>
    <p className="profile-tab-copy">Add complete profile URLs. Leave a field blank to hide that platform from the landing page.</p>
    {loading ? <p className="profile-tab-copy">Loading social links...</p> : <div className="social-links-form">
      {platforms.map(([id, label, placeholder]) => <label key={id}>{label}<input type="url" value={links[id] || ""} placeholder={placeholder} onChange={(event) => setLinks((current) => ({ ...current, [id]: event.target.value }))} /></label>)}
    </div>}
    {message ? <p className="profile-tab-copy" role="status">{message}</p> : null}
    <button type="button" className="dashboard-logout" onClick={save} disabled={saving || loading}>{saving ? "Publishing..." : "Save & Publish"}</button>
  </section>;
}
