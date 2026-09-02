"use client";

import { useEffect, useState } from "react";
import { getRegistrationsBySession, getSessionById, getAllUsers } from "../../../../firebase/firestore";

export default function AdminSessionDetailPage({ params }) {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sessionData = await getSessionById(params.id);
      setSession(sessionData);

      const registrations = await getRegistrationsBySession(params.id);
      const allUsers = await getAllUsers();
      const userMap = Object.fromEntries(allUsers.map((user) => [user.uid, user]));
      const registeredUsers = registrations
        .map((reg) => userMap[reg.userId])
        .filter(Boolean);

      setUsers(registeredUsers);
      setLoading(false);
    };

    load();
  }, [params.id]);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!session) return <div style={{ padding: 40 }}>Session not found.</div>;

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>{session.title}</h1>
        <p style={styles.meta}>Date: {session.date}</p>
        <p style={styles.meta}>Time: {session.time}</p>
        <p style={styles.meta}>Registered Users: {users.length}</p>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((user) => (
                <tr key={user.uid}>
                  <td>{user.name || "Unnamed"}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.mobile || "-"}</td>
                </tr>
              )) : <tr><td colSpan={3}>No users registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f0e8", padding: "36px 20px" },
  container: { maxWidth: 980, margin: "0 auto" },
  title: { fontSize: 38, marginBottom: 10 },
  meta: { margin: "6px 0", color: "#4e5653" },
  tableWrap: { marginTop: 24, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 35px rgba(0,0,0,0.04)" },
  table: { width: "100%", borderCollapse: "collapse" },
  table: { width: "100%", borderCollapse: "collapse" },
};
