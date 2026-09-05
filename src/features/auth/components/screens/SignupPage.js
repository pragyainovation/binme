"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/features/auth/auth.service";
import PasswordInput from "@/components/ui/PasswordInput";
import { registerForSession } from "@/features/registrations/registration.repository";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const user = await signUpWithEmail({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
      });
      const pendingEventId = localStorage.getItem("binme:pendingFreeDemoEventId");
      if (pendingEventId) await registerForSession(user.uid, pendingEventId);
      localStorage.removeItem("binme:pendingFreeDemoEventId");
      router.push(pendingEventId ? `/dashboard/events/${pendingEventId}` : "/dashboard");
    } catch (submitError) {
      setError(submitError.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>BinMe</div>
        <h1 style={styles.title}>Create your account</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Full Name
            <input name="name" value={form.name} onChange={handleChange} style={styles.input} required />
          </label>

          <label style={styles.label}>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} style={styles.input} required />
          </label>

          <label style={styles.label}>
            Mobile Number
            <input name="mobile" value={form.mobile} onChange={handleChange} style={styles.input} required />
          </label>

          <label style={styles.label}>
            Password
            <PasswordInput name="password" value={form.password} onChange={handleChange} inputStyle={styles.input} required />
          </label>

          <label style={styles.label}>
            Confirm Password
            <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={handleChange} inputStyle={styles.input} required />
          </label>

          {error ? <p style={styles.error}>{error}</p> : null}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p style={styles.text}>
          Already registered? <a href="/login" style={styles.link}>Login</a>
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #fdf7eb, #ebf3ff)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 18px 45px rgba(25, 35, 30, 0.12)",
    padding: 28,
  },
  brand: {
    marginBottom: 12,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: -0.08,
    color: "#17211f",
  },
  title: { margin: "0 0 24px", fontSize: 30 },
  form: { display: "grid", gap: 16 },
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: {
    padding: "12px 14px",
    border: "1px solid #e2d9c7",
    borderRadius: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    border: 0,
    borderRadius: 10,
    padding: "13px 18px",
    background: "#1f2d2b",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { color: "#b42318", fontWeight: 600 },
  text: { marginTop: 16, color: "#4e5653" },
  link: { color: "#2544d5", fontWeight: 700 },
};
