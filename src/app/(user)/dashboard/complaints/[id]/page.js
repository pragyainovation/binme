"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { addComplaintMessage, closeComplaint, getComplaintById } from "@/features";

export default function ComplaintDetailPage({ params }) {
  const [user, setUser] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);

  const load = async () => setComplaint(await getComplaintById(params.id));
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, (currentUser) => { if (currentUser) { setUser(currentUser); load(); } }); return () => unsubscribe(); }, [params.id]);

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim() || complaint?.status === "closed") return;
    try { await addComplaintMessage(params.id, user, text, "user"); setText(""); await load(); } catch (submitError) { setError(submitError.message || "Unable to send message."); }
  };

  const closeTicket = async () => {
    if (!window.confirm("Close this complaint ticket? You will not be able to send more messages.")) return;
    setClosing(true);
    try { await closeComplaint(params.id); await load(); } catch (closeError) { setError(closeError.message || "Unable to close complaint."); } finally { setClosing(false); }
  };

  if (!complaint) return <main style={styles.page}><p>Loading complaint...</p></main>;
  if (complaint.userId !== user?.uid) return <main style={styles.page}><p>Complaint not found.</p></main>;
  return <main style={styles.page}><article style={styles.card}><h1>{complaint.subject}</h1><p>{complaint.description}</p><p>Status: <strong>{complaint.status}</strong></p><section style={styles.conversation}>{(complaint.messages || []).map((message, index) => <div key={`${message.createdAt}-${index}`} style={message.authorRole === "user" ? styles.userMessage : styles.adminMessage}><strong>{message.authorName}</strong><p>{message.text}</p></div>)}</section>{complaint.status === "closed" ? <p>This complaint is closed.</p> : <form onSubmit={send} style={styles.form}><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Add a message" required /><button type="submit">Send Message</button></form>}<button type="button" onClick={closeTicket} disabled={closing || complaint.status === "closed"}>{complaint.status === "closed" ? "Complaint Closed" : closing ? "Closing..." : "Close Complaint"}</button>{error ? <p>{error}</p> : null}</article></main>;
}

const styles = { page: { minHeight: "100vh", padding: "40px 20px", background: "#f7f1e8" }, card: { maxWidth: 820, margin: "0 auto", background: "#fff", padding: 24, borderRadius: 16 }, conversation: { display: "grid", gap: 12, margin: "24px 0" }, userMessage: { justifySelf: "end", maxWidth: "80%", padding: 14, background: "#e4f5d2", borderRadius: 12 }, adminMessage: { justifySelf: "start", maxWidth: "80%", padding: 14, background: "#edf1f3", borderRadius: 12 }, form: { display: "grid", gap: 12 }, button: { width: "fit-content", padding: "12px 18px", background: "#17211f", color: "#fff", border: 0, borderRadius: 8 } };
