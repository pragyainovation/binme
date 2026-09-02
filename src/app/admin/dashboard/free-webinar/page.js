"use client";

import { useEffect, useState } from "react";
import {
  createFreeWebinar,
  getFreeWebinarsWithRegistrations,
  updateFreeWebinar,
} from "../../../firebase/firestore";
import { IST_TIMEZONE, formatTimeIST, parseTimeInput } from "../../../firebase/time";
import DataTable from "../../../components/DataTable";

const emptyForm = { title: "", description: "", date: "", time: "", duration: "60", meetLink: "" };
const registrationColumns = [
  { header: "Name", accessorKey: "name", cell: ({ row }) => row.original.name || "Unnamed" },
  { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-" },
  { header: "Mobile", accessorKey: "mobile", cell: ({ row }) => row.original.mobile || "-" },
];

export default function AdminFreeWebinarPage() {
  const [webinars, setWebinars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedWebinarId, setSelectedWebinarId] = useState(null);

  const loadWebinars = async () => {
    const items = await getFreeWebinarsWithRegistrations();
    setWebinars(items);
    setLoading(false);
  };

  useEffect(() => {
    loadWebinars().catch(() => {
      setError("Unable to load free webinars.");
      setLoading(false);
    });
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const editWebinar = (webinar) => {
    setEditingId(webinar.id);
    setForm({
      title: webinar.title || "",
      description: webinar.description || "",
      date: webinar.date || "",
      time: webinar.time ? formatTimeIST(webinar.time) : "",
      duration: String(webinar.duration || 60),
      meetLink: webinar.meetLink || "",
    });
    setError("");
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const normalizedTime = parseTimeInput(form.time);
    if (!normalizedTime) {
      setError("Enter time in 12-hour format, for example 07:00 PM.");
      setSaving(false);
      return;
    }
    const payload = { ...form, time: normalizedTime, timezone: IST_TIMEZONE, duration: Number(form.duration) };

    try {
      if (editingId) await updateFreeWebinar(editingId, payload);
      else await createFreeWebinar(payload);
      resetForm();
      await loadWebinars();
    } catch (submitError) {
      setError(submitError.message || "Unable to save free webinar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (webinar) => {
    await updateFreeWebinar(webinar.id, { status: webinar.status === "inactive" ? "active" : "inactive" });
    await loadWebinars();
  };

  const webinarColumns = [
    { header: "Webinar", accessorKey: "title" },
    { header: "Date", accessorKey: "date" },
    { header: "Time", accessorKey: "time", cell: ({ row }) => `${formatTimeIST(row.original.time)} IST` },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => <span style={row.original.status === "inactive" ? styles.statusInactive : styles.statusActive}>{row.original.status === "inactive" ? "Inactive" : "Active"}</span>,
    },
    { header: "Registrations", accessorKey: "registrationCount", cell: ({ row }) => row.original.registrationCount || 0 },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => {
        const webinar = row.original;
        return <div style={styles.rowActions}>
          <button type="button" style={styles.viewButton} onClick={() => setSelectedWebinarId(selectedWebinarId === webinar.id ? null : webinar.id)}>{selectedWebinarId === webinar.id ? "Hide" : "View"}</button>
          <button type="button" style={styles.smallButton} onClick={() => editWebinar(webinar)}>Edit</button>
          <button type="button" style={styles.smallButton} onClick={() => toggleStatus(webinar)}>{webinar.status === "inactive" ? "Activate" : "Deactivate"}</button>
        </div>;
      },
    },
  ];
  const selectedWebinar = webinars.find((webinar) => webinar.id === selectedWebinarId);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Landing page</p>
            <h1 style={styles.title}>Free Webinar</h1>
          </div>
          <p style={styles.help}>The active webinar appears on the public landing page.</p>
        </header>

        <section style={styles.formCard}>
          <h2 style={styles.sectionTitle}>{editingId ? "Edit webinar" : "Create webinar"}</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>Title<input name="title" value={form.title} onChange={handleChange} style={styles.input} required /></label>
            <label style={styles.label}>Description<textarea name="description" value={form.description} onChange={handleChange} style={styles.textarea} required /></label>
            <div style={styles.formGrid}>
              <label style={styles.label}>Date<input name="date" type="date" value={form.date} onChange={handleChange} style={styles.input} required /></label>
              <label style={styles.label}>Time (IST)<input name="time" type="text" placeholder="07:00 PM" value={form.time} onChange={handleChange} style={styles.input} required /></label>
              <label style={styles.label}>Duration (minutes)<input name="duration" type="number" min="1" value={form.duration} onChange={handleChange} style={styles.input} required /></label>
            </div>
            <label style={styles.label}>Google Meet Link<input name="meetLink" type="url" value={form.meetLink} onChange={handleChange} style={styles.input} /></label>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.actions}>
              <button type="submit" style={styles.button} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Webinar" : "Create Webinar"}</button>
              {editingId && <button type="button" style={styles.secondaryButton} onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section style={styles.listSection}>
          <h2 style={styles.sectionTitle}>Managed webinars</h2>
          {loading ? <p>Loading webinars...</p> : <DataTable columns={webinarColumns} data={webinars} emptyMessage="No free webinars created yet." />}
          {selectedWebinar && (
            <div style={styles.registrationPanel}>
              <h3 style={styles.registrationTitle}>Registered users: {selectedWebinar.title}</h3>
              <DataTable columns={registrationColumns} data={selectedWebinar.registrations} emptyMessage="No registrations yet." />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #f7f1e9 0%, #eef4f8 100%)", padding: "32px 20px", color: "#17211f" },
  container: { maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 38 },
  help: { margin: 0, color: "#53615f" },
  formCard: { background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 14px 35px rgba(0,0,0,0.05)", marginBottom: 24 },
  listSection: { background: "rgba(255,255,255,0.82)", borderRadius: 18, padding: 24, boxShadow: "0 14px 35px rgba(0,0,0,0.04)" },
  sectionTitle: { margin: "0 0 18px", fontSize: 26 },
  form: { display: "grid", gap: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  label: { display: "grid", gap: 7, fontWeight: 700 },
  input: { padding: "11px 13px", border: "1px solid #e2d9c7", borderRadius: 10, fontSize: 16 },
  textarea: { minHeight: 100, padding: "11px 13px", border: "1px solid #e2d9c7", borderRadius: 10, fontSize: 16, resize: "vertical" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  button: { border: 0, borderRadius: 10, padding: "12px 16px", background: "#17211f", color: "#fff", fontWeight: 700, cursor: "pointer" },
  secondaryButton: { border: "1px solid #ccd5d1", borderRadius: 10, padding: "12px 16px", background: "#fff", color: "#17211f", fontWeight: 700, cursor: "pointer" },
  error: { color: "#b42318", fontWeight: 600 },
  webinarRow: { display: "grid", gridTemplateColumns: "1.2fr auto", gap: 14, padding: "18px 0", borderTop: "1px solid #e8dfd0" },
  webinarTitle: { margin: 0, fontSize: 21 },
  meta: { color: "#53615f", margin: "7px 0" },
  active: { display: "inline-block", background: "#dff9e8", color: "#157347", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  inactive: { display: "inline-block", background: "#f1e9df", color: "#725f41", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  rowActions: { display: "flex", gap: 8, alignItems: "start", flexWrap: "wrap", justifyContent: "end" },
  smallButton: { border: 0, borderRadius: 8, padding: "8px 11px", background: "#eef1ff", color: "#1e2c35", fontWeight: 700, cursor: "pointer" },
  viewButton: { border: 0, borderRadius: 8, padding: "8px 11px", background: "#dff9e8", color: "#157347", fontWeight: 700, cursor: "pointer" },
  statusActive: { display: "inline-block", background: "#dff9e8", color: "#157347", padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  statusInactive: { display: "inline-block", background: "#f7d9d9", color: "#a33131", padding: "5px 9px", borderRadius: 999, fontSize: 12, fontWeight: 800 },
  registrationPanel: { marginTop: 24, display: "grid", gap: 12 },
  registrationTitle: { margin: 0, fontSize: 20 },
  attendees: { gridColumn: "1 / -1", display: "grid", gap: 8, marginTop: 3 },
};
