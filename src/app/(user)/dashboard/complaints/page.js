"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { createComplaint, getComplaintsByUser } from "@/features";

export default function ComplaintsPage() {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [form, setForm] = useState({ subject: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (currentUser) => {
    setComplaints(await getComplaintsByUser(currentUser.uid));
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) { setUser(currentUser); load(currentUser); }
    });
    return () => unsubscribe();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await createComplaint(user, form.subject, form.description);
      setForm({ subject: "", description: "" });
      setMessage("Complaint submitted.");
      await load(user);
    } catch (error) { setMessage(error.message || "Unable to submit complaint."); }
  };

  return <main style={styles.page}><div style={styles.container}>
    <h1>Complaints</h1>
    <form onSubmit={submit} style={styles.form}>
      <label>Subject<input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} required /></label>
      <label>Describe the issue<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label>
      <button type="submit">Submit Complaint</button>
      {message ? <p>{message}</p> : null}
    </form>
    <h2>Submitted complaints</h2>
    {loading ? <p>Loading complaints...</p> : complaints.length ? complaints.map((complaint) => <Link key={complaint.id} href={`/dashboard/complaints/${complaint.id}`} style={styles.item}><strong>{complaint.subject}</strong><span>{complaint.status}</span></Link>) : <p>No complaints submitted yet.</p>}
  </div></main>;
}

const styles = { page: { minHeight: "100vh", padding: "40px 20px", background: "#f7f1e8" }, container: { maxWidth: 820, margin: "0 auto", display: "grid", gap: 18 }, form: { display: "grid", gap: 14, background: "#fff", padding: 24, borderRadius: 16 }, item: { display: "flex", justifyContent: "space-between", gap: 16, background: "#fff", padding: 18, borderRadius: 12 }, input: { padding: 12 }, button: { width: "fit-content", padding: "12px 18px", background: "#17211f", color: "#fff", border: 0, borderRadius: 8 } };
