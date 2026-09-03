"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionById, updateSession } from "../../../../../firebase/firestore";
import { IST_TIMEZONE, formatTimeIST, parseTimeInput } from "../../../../../firebase/time";

export default function EditSessionPage({ params }) {
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = await getSessionById(params.id);
      if (session) {
        setForm({
          title: session.title || "",
          description: session.description || "",
          date: session.date || "",
          time: session.time ? formatTimeIST(session.time) : "",
          duration: String(session.duration || 60),
          meetLink: session.meetLink || "",
          accessType: session.accessType || "free",
          price: session.price ? String(session.price) : "",
        });
      }
      setLoading(false);
    };

    load();
  }, [params.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const normalizedTime = parseTimeInput(form.time);
    if (!normalizedTime) {
      setError("Enter time in 12-hour format, for example 07:00 PM.");
      return;
    }
    await updateSession(params.id, {
      ...form,
      time: normalizedTime,
      timezone: IST_TIMEZONE,
      duration: Number(form.duration),
      accessType: form.accessType,
      price: form.accessType === "paid" ? Number(form.price) : 0,
    });
    router.push(`/admin/dashboard/sessions/${params.id}`);
  };

  if (loading) return <div style={{ padding: 40 }}>Loading session...</div>;

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Edit Session</h1>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Title<input name="title" value={form.title} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Description<textarea name="description" value={form.description} onChange={handleChange} style={styles.textarea} required /></label>
          <label style={styles.label}>Date<input name="date" type="date" value={form.date} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Time (IST)<input name="time" type="text" placeholder="07:00 PM" value={form.time} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Duration<input name="duration" type="number" value={form.duration} onChange={handleChange} style={styles.input} required /></label>
          <label style={styles.label}>Google Meet Link<input name="meetLink" value={form.meetLink} onChange={handleChange} style={styles.input} /></label>
          <label style={styles.label}>Access<select name="accessType" value={form.accessType} onChange={handleChange} style={styles.input}><option value="free">Free</option><option value="paid">Paid</option></select></label>
          {form.accessType === "paid" ? <label style={styles.label}>Price (INR)<input name="price" type="number" min="1" step="0.01" value={form.price} onChange={handleChange} style={styles.input} required /></label> : null}
          {error ? <p style={styles.error}>{error}</p> : null}
          <button type="submit" style={styles.button}>Update Session</button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f7f0ea", padding: "40px 20px" },
  card: { maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 18, padding: 28, boxShadow: "0 18px 45px rgba(0,0,0,0.05)" },
  title: { marginTop: 0, fontSize: 32 },
  form: { display: "grid", gap: 18 },
  label: { display: "grid", gap: 8, fontWeight: 700 },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid #e8dbbf", fontSize: 16 },
  textarea: { minHeight: 120, padding: "12px 14px", borderRadius: 10, border: "1px solid #e8dbbf", fontSize: 16, resize: "vertical" },
  button: { background: "#1a201e", color: "#fff", border: 0, borderRadius: 10, padding: "14px 18px", fontWeight: 700, cursor: "pointer" },
  error: { color: "#b42318", fontWeight: 600 },
};
