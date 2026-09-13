"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import PasswordInput from "@/components/ui/PasswordInput";
import Loader from "@/components/ui/Loader";
import { AuthCard, styles } from "./ForgotPasswordPage";

function ResetPasswordForm() {
  const params = useSearchParams(); const router = useRouter();
  const [form, setForm] = useState({ password: "", confirmPassword: "" }); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const submit = async (event) => { event.preventDefault(); setError(""); if (form.password !== form.confirmPassword) return setError("Passwords do not match."); setLoading(true); try { const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: params.get("uid"), token: params.get("token"), password: form.password }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); router.replace("/login"); } catch (submitError) { setError(submitError.message || "Unable to reset password."); } finally { setLoading(false); } };
  return <AuthCard title="Set new password" subtitle="Choose a new password for your account."><form onSubmit={submit} style={styles.form}><label style={styles.label}>New Password<PasswordInput value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} inputStyle={styles.input} required minLength={8} /></label><label style={styles.label}>Confirm Password<PasswordInput value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} inputStyle={styles.input} required minLength={8} /></label>{error && <p style={styles.error}>{error}</p>}<button style={styles.button} disabled={loading}>{loading ? <Loader size={18} label="Submitting" /> : "Submit"}</button></form></AuthCard>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}
