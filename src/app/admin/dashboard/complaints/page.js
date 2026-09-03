"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllComplaints } from "../../../firebase/firestore";

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  useEffect(() => { getAllComplaints().then(setComplaints).catch(() => setComplaints([])); }, []);
  return <main style={styles.page}><div style={styles.container}><h1>Complaints</h1>{complaints.length ? complaints.map((complaint) => <Link key={complaint.id} href={`/admin/dashboard/complaints/${complaint.id}`} style={styles.item}><span><strong>{complaint.subject}</strong><small>{complaint.userName} · {complaint.userEmail}</small></span><b>{complaint.status}</b></Link>) : <p>No complaints submitted yet.</p>}</div></main>;
}
const styles = { page: { minHeight: "100vh", padding: "40px 20px", background: "#f5f1ea" }, container: { maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }, item: { display: "flex", justifyContent: "space-between", gap: 16, padding: 20, borderRadius: 12, background: "#fff" }, small: { display: "block", color: "#53615f", marginTop: 6 } };
