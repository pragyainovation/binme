"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail } from "@/features/auth/auth.service";
import { getUserProfile } from "@/features/users/user.repository";
import PasswordInput from "@/components/ui/PasswordInput";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
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

    try {
      const user = await loginWithEmail(form.email, form.password);
      const profile = await getUserProfile(user.uid);

      if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        setError("Access denied. This account is not an admin.");
      }
    } catch (submitError) {
      setError(submitError.code === "auth/invalid-credential" ? "Email or password is incorrect. If you just changed your password, use the new password." : (submitError.message || "Admin login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin Login</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} style={styles.input} required />
          </label>

          <label style={styles.label}>
            Password
            <PasswordInput name="password" value={form.password} onChange={handleChange} inputStyle={styles.input} required />
          </label>

          {error ? <p style={styles.error}>{error}</p> : null}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5efe7", padding: 24 },
  card: { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 18, padding: 30, boxShadow: "0 18px 40px rgba(0,0,0,0.08)" },
  title: { fontSize: 32, margin: "0 0 20px" },
  form: { display: "grid", gap: 18 },
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid #dfd7cb", fontSize: 16 },
  button: { background: "#16211f", color: "#fff", border: 0, borderRadius: 10, padding: "14px 18px", fontWeight: 700, cursor: "pointer" },
  error: { color: "#b42318", fontWeight: 600 },
};
