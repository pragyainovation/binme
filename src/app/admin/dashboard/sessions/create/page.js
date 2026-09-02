"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "../../../../firebase/firestore";

export default function CreateSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    meetLink: "",
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

    try {
      await createSession({
        ...form,
        duration: Number(form.duration),
      });
      router.push("/admin/dashboard/sessions");
    } catch (submitError) {
      setError(submitError.message || "Unable to create session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Session</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Title<input name="title" value={form.title} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Description<textarea name="description" value={form.description} onChange={handleChange} style={styles.textarea} required /></label>
          <label style={styles.label}>Date<input name="date" type="date" value={form.date} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Time<input name="time" type="time" value={form.time} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Duration<input name="duration" type="number" value={form.duration} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Google Meet Link<input name="meetLink" value={form.meetLink} onChange={handleChange} style={styles.input} /></label>

          {error ? <p style={styles.error}>{error}</p> : null}

          <button type="submit" style={styles.button} disabled={loading}>{loading ? "Creating..." : "Create Session"}</button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f9f4ee", padding: "40px 20px" },
  card: { maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 18px 45px rgba(0,0,0,0.06)" },
  title: { marginTop: 0, fontSize: 32 },
  form: { display: "grid", gap: 18 },
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid #e7dcc4", fontSize: 16 },
  textarea: { minHeight: 120, padding: "12px 14px", borderRadius: 10, border: "1px solid #e7dcc4", fontSize: 16, resize: "vertical" },
  button: { background: "#172120", color: "#fff", border: 0, borderRadius: 10, padding: "14px 18px", fontWeight: 700, cursor: "pointer" },
  error: { color: "#b42318", fontWeight: 600 },
};
