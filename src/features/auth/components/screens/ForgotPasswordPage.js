"use client";

import { useState } from "react";
import Loader from "@/components/ui/Loader";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.message);
    } catch (submitError) { setError(submitError.message || "Unable to send password-reset link."); }
    finally { setLoading(false); }
  };

  return <AuthCard title="Forgot Password" subtitle="Enter your registered email address to receive a reset link."><form onSubmit={submit} style={styles.form}><label style={styles.label}>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={styles.input} required /></label>{error && <p style={styles.error}>{error}</p>}{message && <p style={styles.success}>{message}</p>}<button style={styles.button} disabled={loading}>{loading ? <Loader size={18} label="Sending" /> : "Send reset link"}</button></form><p style={styles.text}>Remembered your password? <a href="/login" style={styles.link}>Login</a></p></AuthCard>;
}

export function AuthCard({ title, subtitle, children }) { return <main style={styles.page}><div style={styles.card}><div style={styles.brand}>BinMe</div><h1 style={styles.title}>{title}</h1><p style={styles.subtitle}>{subtitle}</p>{children}</div></main>; }
export const styles = { page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f7f1e5, #efe6ff)", padding: 24 }, card: { width: "100%", maxWidth: 440, background: "#fffdf9", borderRadius: 18, boxShadow: "0 20px 50px rgba(30, 20, 20, 0.12)", padding: 32 }, brand: { marginBottom: 12, fontSize: 28, fontWeight: 900, letterSpacing: -0.08, color: "#17211f" }, title: { margin: 0, fontSize: 32, letterSpacing: -1.2 }, subtitle: { color: "#5b655f", margin: "8px 0 24px" }, form: { display: "grid", gap: 18 }, label: { display: "grid", gap: 8, fontWeight: 700 }, input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #ddd2c2", fontSize: 16, background: "#fff" }, button: { border: 0, background: "#16211f", color: "#fff", borderRadius: 10, padding: "13px 18px", fontWeight: 700, cursor: "pointer" }, error: { margin: 0, color: "#b42318", fontWeight: 600 }, success: { margin: 0, color: "#157347", fontWeight: 600 }, text: { marginTop: 18, color: "#4d5653" }, link: { color: "#3a3fda", fontWeight: 700 } };
