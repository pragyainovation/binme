"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessionsWithRegistrationData } from "../../../firebase/firestore";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const items = await getSessionsWithRegistrationData();
      setSessions(items);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Sessions</h1>
          <Link href="/admin/dashboard/sessions/create" style={styles.primaryButton}>Create Session</Link>
        </header>

        {loading ? <p>Loading sessions...</p> : (
          <div style={styles.tableWrap}>
            {sessions.length ? sessions.map((session) => (
              <div key={session.id} style={styles.row}>
                <div>
                  <strong>{session.title}</strong><br />
                  <span>{session.date}</span>
                </div>
                <div>
                  <span>{session.time}</span><br />
                  <small>Registrations: {session.registrationCount || 0}</small>
                </div>
                <div>
                  <Link href={`/admin/dashboard/sessions/${session.id}`} style={styles.actionLink}>View</Link>
                  <Link href={`/admin/dashboard/sessions/${session.id}/edit`} style={styles.actionLink}>Edit</Link>
                </div>
              </div>
            )) : <p>No sessions available.</p>}
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f5f1ea", padding: "32px 20px" },
  container: { maxWidth: 1000, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 },
  title: { fontSize: 36, margin: 0 },
  primaryButton: { background: "#16211f", color: "#fff", padding: "12px 18px", borderRadius: 10, fontWeight: 700 },
  tableWrap: { background: "#fff", borderRadius: 18, padding: 20, boxShadow: "0 12px 32px rgba(10,10,10,0.05)" },
  row: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16, alignItems: "center", borderBottom: "1px solid #ece1cc", padding: "12px 0" },
  actionLink: { display: "inline-block", marginRight: 12, color: "#2634d6", fontWeight: 700 },
};
