"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { auth } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { getRegistrationsByUser, getSessions } from "../firebase/firestore";

const tabs = ["Upcoming", "Completed", "Closed", "Registered"];

export default function DashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Upcoming");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      setUser(currentUser);
      const sessionList = await getSessions();
      const registrationList = await getRegistrationsByUser(currentUser.uid);

      setSessions(sessionList);
      setRegistrations(registrationList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registeredSessionIds = useMemo(() => new Set(registrations.map((item) => item.sessionId)), [registrations]);

  const normalizedSessions = useMemo(() => {
    return sessions
      .map((session) => {
        const startDate = session.date && session.time ? new Date(`${session.date}T${session.time}`) : null;
        const durationMinutes = Number(session.duration || 0);
        const startMs = startDate ? startDate.getTime() : null;
        const endMs = startMs !== null ? startMs + durationMinutes * 60000 : null;
        const now = Date.now();
        const minutesUntilStart = startMs !== null ? (startMs - now) / 60000 : null;
        const isEnded = endMs !== null ? now > endMs : false;
        const isClosedForRegistration = minutesUntilStart !== null && minutesUntilStart <= 5 && minutesUntilStart >= 0;

        return {
          ...session,
          startDate,
          endMs,
          isEnded,
          isClosedForRegistration,
          minutesUntilStart,
          isRegistered: registeredSessionIds.has(session.id),
        };
      })
      .sort((a, b) => (a.startDate?.getTime?.() ?? 0) - (b.startDate?.getTime?.() ?? 0));
  }, [sessions, registeredSessionIds]);

  const tabData = useMemo(() => {
    const registeredSessions = normalizedSessions.filter((session) => session.isRegistered);

    return {
      Upcoming: normalizedSessions.filter((session) => !session.isEnded && !session.isClosedForRegistration && !session.isRegistered),
      Completed: normalizedSessions.filter((session) => session.isEnded),
      Closed: normalizedSessions.filter((session) => session.isClosedForRegistration && !session.isEnded),
      Registered: registeredSessions,
    };
  }, [normalizedSessions]);

  const visibleSessions = tabData[activeTab] || [];

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Dashboard</p>
            <h1 style={styles.title}>Welcome, {user?.displayName || user?.email || "User"} 👋</h1>
          </div>
        </header>

        {loading ? (
          <div style={styles.loadingCard}>Loading sessions...</div>
        ) : (
          <>
            <section style={styles.topGrid}>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>Upcoming sessions</span>
                <strong style={styles.statValue}>{normalizedSessions.filter((session) => !session.isEnded && !session.isClosedForRegistration).length}</strong>
              </div>
              <div style={styles.statCard}>
                <span style={styles.statLabel}>My registrations</span>
                <strong style={styles.statValue}>{registrations.length}</strong>
              </div>
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Webinars</h2>
                <span style={styles.sectionBadge}>Overview</span>
              </div>

              <div style={styles.tabsWrap}>
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={activeTab === tab ? styles.tabActive : styles.tab}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div style={styles.grid}>
                {visibleSessions.length ? (
                  visibleSessions.map((session) => (
                    <article key={session.id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <span style={styles.cardCategory}>{session.title}</span>
                        {session.isEnded ? (
                          <span style={styles.statusEnded}>Session Ended</span>
                        ) : session.isClosedForRegistration ? (
                          <span style={styles.statusClosed}>Closed</span>
                        ) : session.isRegistered ? (
                          <span style={styles.status}>Registered</span>
                        ) : (
                          <span style={styles.statusMuted}>Open</span>
                        )}
                      </div>

                      <h3 style={styles.cardTitle}>{session.title}</h3>
                      <p style={styles.cardMeta}>Date: {session.date}</p>
                      <p style={styles.cardMeta}>Time: {session.time}</p>
                      <p style={styles.cardMeta}>Duration: {session.duration} mins</p>

                      <div style={styles.cardActions}>
                        <Link href={`/dashboard/sessions/${session.id}`} style={styles.linkButton}>View Details</Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <div style={styles.emptyState}>No sessions in this tab.</div>
                )}
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
    background: "linear-gradient(180deg, #f7f0e7 0%, #f3f7fb 100%)",
    padding: "32px 20px",
    color: "#17211f",
  },
  container: { maxWidth: 1120, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 38, letterSpacing: -1.2 },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 18,
    marginBottom: 28,
  },
  statCard: {
    background: "#fff",
    borderRadius: 20,
    padding: "20px 22px",
    boxShadow: "0 12px 28px rgba(20, 29, 26, 0.06)",
    border: "1px solid rgba(20, 29, 26, 0.06)",
    display: "grid",
    gap: 8,
  },
  statLabel: { color: "#53615f", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.1 },
  statValue: { fontSize: 32, letterSpacing: -1 },
  section: {
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(20,29,26,0.05)",
    borderRadius: 24,
    padding: 24,
    boxShadow: "0 18px 35px rgba(17, 26, 25, 0.05)",
  },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  sectionTitle: { margin: 0, fontSize: 28, letterSpacing: -0.8 },
  sectionBadge: {
    background: "#dff7ec",
    color: "#1a6a47",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.08,
    textTransform: "uppercase",
  },
  tabsWrap: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  tab: {
    background: "#f2f6f8",
    border: "1px solid rgba(23, 33, 31, 0.08)",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    color: "#33413f",
    cursor: "pointer",
  },
  tabActive: {
    background: "#17211f",
    border: "1px solid #17211f",
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 },
  card: {
    border: "1px solid #ebdcc3",
    borderRadius: 18,
    padding: 20,
    background: "linear-gradient(180deg, #ffffff 0%, #fffaf4 100%)",
    boxShadow: "0 12px 24px rgba(34, 44, 41, 0.04)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  cardCategory: { color: "#ff764d", fontWeight: 800, fontSize: 12, letterSpacing: 0.08, textTransform: "uppercase" },
  cardTitle: { margin: "12px 0", fontSize: 24, letterSpacing: -0.7 },
  cardMeta: { margin: "4px 0", color: "#4d5653" },
  cardActions: { display: "flex", justifyContent: "flex-end", marginTop: 18 },
  linkButton: {
    background: "#f0f4ff",
    color: "#20313a",
    padding: "8px 12px",
    borderRadius: 10,
    fontWeight: 700,
  },
  status: { background: "#dff9e8", color: "#157347", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusMuted: { background: "#f4eadb", color: "#725f41", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusClosed: { background: "#fef2d8", color: "#8a5a07", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusEnded: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  loadingCard: {
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(20,29,26,0.06)",
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
