"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import DataTable from "@/components/ui/DataTable";
import { formatDateIST, formatTimeIST } from "@/lib/time/ist";
import {
  claimFreeWebinarRegistrations,
  getFreeWebinarById,
  getRegistrationsByUser,
  getSessionById,
} from "@/features";
import { isSessionJoinable } from "@/lib/time/ist";

export default function MyRegistrationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const registrationColumns = [
    { header: "Session", id: "title", accessorFn: (item) => item.freeWebinar?.title || item.session?.title || "Session" },
    { header: "Date", id: "date", accessorFn: (item) => item.freeWebinar?.date || item.session?.date || "-", cell: ({ row }) => formatDateIST(row.original.freeWebinar?.date || row.original.session?.date) },
    { header: "Time", id: "time", accessorFn: (item) => formatTimeIST(item.freeWebinar?.time || item.session?.time) || "-" + 'IST'},
    { header: "Type", id: "type", accessorFn: (item) => item.freeWebinar ? "Free webinar" : "Session" },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => row.original.freeWebinar ? (
        row.original.freeWebinar.meetLink && isSessionJoinable(row.original.freeWebinar, now) ? <a href={row.original.freeWebinar.meetLink} target="_blank" rel="noreferrer" style={styles.linkButton}>Join Webinar</a> : <Link href="/dashboard/free-webinar" style={styles.linkButton}>View Details</Link>
      ) : row.original.session?.meetLink && isSessionJoinable(row.original.session, now) ? (
        <a href={row.original.session.meetLink} target="_blank" rel="noreferrer" style={styles.linkButton}>Join Webinar</a>
      ) : <Link href={`/dashboard/events/${row.original.sessionId}`} style={styles.linkButton}>View Details</Link>,
    },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const registrationList = await getRegistrationsByUser(user.uid);
      const sessionPromises = registrationList.map(async (registration) => {
        const session = await getSessionById(registration.sessionId);
        return session ? { ...registration, session } : null;
      });

      const transformed = (await Promise.all(sessionPromises)).filter(Boolean);

      const freeRegistrations = await claimFreeWebinarRegistrations(user);
      const freeItems = await Promise.all(freeRegistrations.map(async (registration) => ({
        ...registration,
        freeWebinar: await getFreeWebinarById(registration.webinarId),
      })));
      setItems([...transformed, ...freeItems]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>BinMe</div>
            <p style={styles.eyebrow}>My registrations</p>
            <h1 style={styles.title}>Your booked sessions</h1>
          </div>
          <Link href="/dashboard" style={styles.primaryButton}>Back to Dashboard</Link>
        </header>

        {loading ? (
          <div style={styles.loadingCard}>Loading registrations...</div>
        ) : items.length === 0 ? (
          <div style={styles.emptyState}>No registrations yet.</div>
        ) : (
          <DataTable columns={registrationColumns} data={items} emptyMessage="No registrations yet." />
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f0e7 0%, #f1f5f9 100%)",
    padding: "32px 20px",
    color: "#17211f",
  },
  container: { maxWidth: 960, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  brand: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.08,
    color: "#17211f",
  },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { fontSize: 36, margin: "8px 0 0", letterSpacing: -1 },
  primaryButton: {
    background: "linear-gradient(135deg, #182321 0%, #2a3d39 100%)",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
  },
  loadingCard: {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(20,29,26,0.05)",
    borderRadius: 18,
    padding: "18px 20px",
    color: "#4d5653",
  },
  emptyState: {
    background: "#fff",
    borderRadius: 18,
    padding: "20px",
    color: "#4d5653",
    border: "1px dashed #d9d1bf",
  },
  list: { display: "grid", gap: 18 },
  card: {
    background: "linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 12px 28px rgba(0,0,0,0.05)",
    border: "1px solid rgba(20,29,26,0.05)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18, flexWrap: "wrap" },
  cardLabel: { margin: 0, color: "#ff764d", fontWeight: 800, fontSize: 12, letterSpacing: 0.08, textTransform: "uppercase" },
  cardTitle: { margin: "8px 0 0", fontSize: 26, letterSpacing: -0.7 },
  status: { display: "inline-block", background: "#dff9e8", color: "#157347", padding: "7px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 18, marginBottom: 20 },
  metaLabel: { display: "block", color: "#53615f", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.08 },
  cardMeta: { margin: "8px 0 0", color: "#4d5653" },
  linkButton: { display: "inline-block", background: "#182321", color: "#fff", padding: "10px 14px", borderRadius: 10, fontWeight: 700 },
};
