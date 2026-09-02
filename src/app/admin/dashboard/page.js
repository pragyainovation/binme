"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllUsers, getSessionsWithRegistrationData } from "../../firebase/firestore";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, upcomingSessions: 0, totalRegistrations: 0 });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const users = await getAllUsers();
      const sessionList = await getSessionsWithRegistrationData();

      const totalRegistrations = sessionList.reduce((sum, session) => sum + Number(session.registrationCount || 0), 0);

      setStats({
        totalUsers: users.length,
        upcomingSessions: sessionList.length,
        totalRegistrations,
      });
      setSessions(sessionList);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>BinMe Admin</p>
            <h1 style={styles.title}>Admin Dashboard</h1>
          </div>
          <Link href="/admin/dashboard/sessions/create" style={styles.primaryButton}>Create Session</Link>
        </header>

        {loading ? (
          <div style={styles.loadingCard}>Loading stats...</div>
        ) : (
          <>
            <section style={styles.statGrid}>
              <div style={styles.card}><span style={styles.cardLabel}>Total Users</span><strong style={styles.cardValue}>{stats.totalUsers}</strong></div>
              <div style={styles.card}><span style={styles.cardLabel}>Upcoming Sessions</span><strong style={styles.cardValue}>{stats.upcomingSessions}</strong></div>
              <div style={styles.card}><span style={styles.cardLabel}>Total Registrations</span><strong style={styles.cardValue}>{stats.totalRegistrations}</strong></div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Upcoming Sessions</h2>
                <span style={styles.sectionBadge}>Operations</span>
              </div>
              <div style={styles.sessionList}>
                {sessions.length ? sessions.map((session) => (
                  <div key={session.id} style={styles.sessionRow}>
                    <div>
                      <strong style={styles.sessionTitle}>{session.title}</strong><br />
                      <span style={styles.sessionMeta}>{session.date}</span>
                    </div>
                    <div>
                      <span style={styles.sessionMeta}>Registered: {session.registrationCount || 0}</span>
                    </div>
                    <div style={styles.rowButtons}>
                      <Link href={`/admin/dashboard/sessions/${session.id}`} style={styles.smallButton}>View</Link>
                    </div>
                  </div>
                )) : <div style={styles.emptyState}>No sessions yet.</div>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f7f1e9 0%, #eef4f8 100%)",
    padding: "32px 20px",
    color: "#17211f",
  },
  container: { maxWidth: 1100, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 38, letterSpacing: -1.2 },
  primaryButton: {
    background: "linear-gradient(135deg, #182321 0%, #2e403d 100%)",
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    boxShadow: "0 12px 28px rgba(22, 32, 31, 0.15)",
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 30 },
  card: {
    background: "linear-gradient(180deg, #ffffff 0%, #fffaf5 100%)",
    borderRadius: 20,
    padding: 22,
    boxShadow: "0 16px 32px rgba(0,0,0,0.05)",
    display: "grid",
    gap: 8,
    border: "1px solid rgba(20,29,26,0.05)",
  },
  cardLabel: { color: "#53615f", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.08 },
  cardValue: { fontSize: 32, letterSpacing: -1 },
  section: {
    background: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(20,29,26,0.05)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 18px 35px rgba(17, 26, 25, 0.05)",
  },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 18 },
  sectionTitle: { fontSize: 28, margin: 0, letterSpacing: -0.8 },
  sectionBadge: {
    background: "#e2edff",
    color: "#2941a8",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.08,
    textTransform: "uppercase",
  },
  sessionList: { display: "grid", gap: 16 },
  sessionRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 0.7fr",
    alignItems: "center",
    gap: 16,
    border: "1px solid #ebdcc3",
    padding: 16,
    borderRadius: 16,
    background: "#fffdf8",
  },
  sessionTitle: { fontSize: 18 },
  sessionMeta: { color: "#53615f" },
  rowButtons: { display: "flex", justifyContent: "flex-end" },
  smallButton: {
    background: "#eef1ff",
    color: "#1e2c35",
    padding: "8px 12px",
    borderRadius: 10,
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
};
