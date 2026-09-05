"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSitePolicy } from "@/features/policies/policy.repository";
import RichTextPolicyContent from "./RichTextPolicyContent";

const policyTitles = { terms: "Terms & Conditions", privacy: "Privacy Policy" };

export default function PublicPolicyPage({ type }) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSitePolicy(type).then(setPolicy).finally(() => setLoading(false));
  }, [type]);

  const title = policyTitles[type] || "Policy";
  return <main style={styles.page}>
    <article style={styles.card}>
      <Link href="/" style={styles.brand}>BinMe</Link>
      <p style={styles.eyebrow}>Legal</p>
      <h1 style={styles.title}>{title}</h1>
      {loading ? <p style={styles.copy}>Loading policy...</p> : policy?.content ? <div style={styles.content}><RichTextPolicyContent content={policy.content} /></div> : <p style={styles.copy}>This policy is not available right now. Please contact us for help.</p>}
      <Link href="/" style={styles.backLink}>Back to home</Link>
    </article>
  </main>;
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f7f0e7, #eef8ff)", padding: "50px 20px", color: "#17211f" },
  card: { maxWidth: 880, margin: "0 auto", background: "#fff", borderRadius: 22, padding: 30, boxShadow: "0 18px 45px rgba(22, 34, 31, 0.08)" },
  brand: { display: "inline-block", marginBottom: 20, fontSize: 24, fontWeight: 900, letterSpacing: -0.8, color: "#17211f" },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { margin: "8px 0 24px", fontSize: 38, letterSpacing: -1.2 },
  content: { lineHeight: 1.75, color: "#3d4945" },
  copy: { lineHeight: 1.7, color: "#4d5653" },
  backLink: { display: "inline-block", marginTop: 28, background: "#17211f", color: "#fff", padding: "12px 16px", borderRadius: 10, fontWeight: 700 },
};
