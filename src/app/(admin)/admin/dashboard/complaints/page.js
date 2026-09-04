"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllComplaints } from "@/features";

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  useEffect(() => { getAllComplaints().then(setComplaints).catch(() => setComplaints([])); }, []);
  return <main className="complaint-page"><div className="complaint-container"><header className="complaint-heading"><div><p>Support operations</p><h1>Complaints</h1><span>Review, reply to, and close learner support tickets.</span></div><strong className="complaint-total">{complaints.length} total</strong></header><section className="complaint-list">{complaints.length ? complaints.map((complaint) => <Link key={complaint.id} href={`/admin/dashboard/complaints/${complaint.id}`} className="complaint-list-item"><span><strong>{complaint.subject}</strong><small>{complaint.userName} · {complaint.userEmail}</small></span><b className={`complaint-status ${complaint.status}`}>{complaint.status}</b></Link>) : <p className="complaint-empty">No complaints submitted yet.</p>}</section></div></main>;
}
const styles = { page: { minHeight: "100vh", padding: "40px 20px", background: "#f5f1ea" }, container: { maxWidth: 900, margin: "0 auto", display: "grid", gap: 16 }, item: { display: "flex", justifyContent: "space-between", gap: 16, padding: 20, borderRadius: 12, background: "#fff" }, small: { display: "block", color: "#53615f", marginTop: 6 } };
