"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail, logout } from "../firebase/auth";
import { getUserProfile } from "../firebase/firestore";
import { auth } from "../firebase/config";

export default function LoginPage() {
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
        router.push("/dashboard");
      }
    } catch (submitError) {
      setError(submitError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>BinMe</div>
        <h1 style={styles.title}>Login</h1>
        <p style={styles.subtitle}>Welcome back to BinMe</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </label>

          {error ? <p style={styles.error}>{error}</p> : null}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={styles.text}>
          Don&apos;t have an account? <a href="/signup" style={styles.link}>Sign up</a>
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
    background: "linear-gradient(135deg, #f7f1e5, #efe6ff)",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#fffdf9",
    borderRadius: 18,
    boxShadow: "0 20px 50px rgba(30, 20, 20, 0.12)",
    padding: 32,
  },
  brand: {
    marginBottom: 12,
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: -0.08,
    color: "#17211f",
  },
  title: { margin: 0, fontSize: 32, letterSpacing: -1.2 },
  subtitle: { color: "#5b655f", margin: "8px 0 24px" },
  form: { display: "grid", gap: 18 },
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #ddd2c2",
    fontSize: 16,
    background: "#fff",
  },
  button: {
    border: 0,
    background: "#16211f",
    color: "#fff",
    borderRadius: 10,
    padding: "13px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: { margin: 0, color: "#b42318", fontWeight: 600 },
  text: { marginTop: 18, color: "#4d5653" },
  link: { color: "#3a3fda", fontWeight: 700 },
};
