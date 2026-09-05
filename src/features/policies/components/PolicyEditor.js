"use client";

import { useEffect, useState } from "react";
import { browserAuth } from "@/lib/firebase/client-auth";
import { getSitePolicy, saveSitePolicy } from "@/features/policies/policy.repository";
import { toRichTextValue } from "@/features/policies/policy.content";
import RichTextEditor from "./RichTextEditor";

const policyItems = [
  { id: "terms", label: "Terms & Conditions" },
  { id: "privacy", label: "Privacy Policy" },
];

export default function PolicyEditor() {
  const [activePolicy, setActivePolicy] = useState("terms");
  const [contents, setContents] = useState({ terms: toRichTextValue(null), privacy: toRichTextValue(null) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [terms, privacy] = await Promise.all([getSitePolicy("terms"), getSitePolicy("privacy")]);
        setContents({ terms: toRichTextValue(terms?.content), privacy: toRichTextValue(privacy?.content) });
      } catch (error) {
        setMessage(error.message || "Unable to load policies.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    const user = browserAuth.currentUser;
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      await saveSitePolicy(activePolicy, contents[activePolicy], user.uid);
      setMessage("Policy published successfully.");
    } catch (error) {
      setMessage(error.message || "Unable to save policy.");
    } finally {
      setSaving(false);
    }
  };

  return <section>
    <p className="profile-tab-copy">Edit the text below and save it. The public policy pages update from Firestore.</p>
    <div className="profile-tabs" role="tablist" aria-label="Policy editor">
      {policyItems.map((policy) => <button key={policy.id} type="button" role="tab" aria-selected={activePolicy === policy.id} className={activePolicy === policy.id ? "active" : ""} onClick={() => { setActivePolicy(policy.id); setMessage(""); }}>{policy.label}</button>)}
    </div>
    {loading ? <p className="profile-tab-copy">Loading policy...</p> : <>
      <label className="policy-editor-label">{policyItems.find((policy) => policy.id === activePolicy)?.label}</label>
      <RichTextEditor key={activePolicy} value={contents[activePolicy]} onChange={(value) => setContents((current) => ({ ...current, [activePolicy]: value }))} />
      {message ? <p className="profile-tab-copy" role="status">{message}</p> : null}
      <button type="button" className="dashboard-logout" onClick={save} disabled={saving}>{saving ? "Publishing..." : "Save & Publish"}</button>
    </>}
  </section>;
}
