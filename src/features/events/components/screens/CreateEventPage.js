"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/features";
import { IST_TIMEZONE, parseTimeInput } from "@/lib/time/ist";

export default function CreateSessionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    meetLink: "",
    accessType: "free",
    price: "",
    showOnLanding: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const normalizedTime = parseTimeInput(form.time);
    if (!normalizedTime) {
      setError("Enter time in 12-hour format, for example 07:00 PM.");
      setLoading(false);
      return;
    }
    try {
      await createSession({
        ...form,
        time: normalizedTime,
        timezone: IST_TIMEZONE,
        duration: Number(form.duration),
        accessType: form.accessType,
        price: form.accessType === "paid" ? Number(form.price) : 0,
      });
      router.push("/admin/dashboard/events");
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
          <label style={styles.label}>Time (IST)<input name="time" type="time" value={form.time} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Duration<input name="duration" type="number" value={form.duration} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Google Meet Link<input name="meetLink" value={form.meetLink} onChange={handleChange} style={styles.input} /></label>
          <label style={styles.label}>Access<select name="accessType" value={form.accessType} onChange={handleChange} style={styles.input}><option value="free">Free</option><option value="paid">Paid</option></select></label>
          {form.accessType === "paid" ? <label style={styles.label}>Price (INR)<input name="price" type="number" min="1" step="0.01" value={form.price} onChange={handleChange} style={styles.input} required /></label> : null}
          <label style={styles.checkLabel}><input name="showOnLanding" type="checkbox" checked={form.showOnLanding} onChange={handleChange} /> Show on landing page</label>

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
  checkLabel: { display: "flex", alignItems: "center", gap: 10, fontWeight: 700 },
  button: { background: "#172120", color: "#fff", border: 0, borderRadius: 10, padding: "14px 18px", fontWeight: 700, cursor: "pointer" },
  error: { color: "#b42318", fontWeight: 600 },
};
