"use client";

import { useEffect, useState } from "react";
import { getRegistrationsBySession, getSessionById, getAllUsers } from "../../../../firebase/firestore";
import { formatTimeIST, parseISTDate } from "../../../../firebase/time";
import DataTable from "../../../../components/DataTable";

const userColumns = [
  { header: "Name", accessorKey: "name", cell: ({ row }) => row.original.name || "Unnamed" },
  { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-" },
  { header: "Mobile", accessorKey: "mobile", cell: ({ row }) => row.original.mobile || "-" },
];

export default function AdminSessionDetailPage({ params }) {
  const [session, setSession] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const sessionRunning = (() => {
    if (session?.status === "cancelled") return false;
    if (!session?.date || !session?.time || !session?.duration) return false;
    const startDate = parseISTDate(session.date, session.time);
    if (!startDate) return false;
    const startMs = startDate.getTime();
    const endMs = startMs + Number(session.duration) * 60000;
    return now >= startMs && now <= endMs;
  })();

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
        <p style={styles.meta}>Time: {formatTimeIST(session.time)} IST</p>
        <p style={styles.meta}>Duration: {session.duration} Minutes</p>
        <p style={styles.meta}>Registered Users: {users.length}</p>
        {sessionRunning && session.meetLink ? (
          <a href={session.meetLink} target="_blank" rel="noreferrer" style={styles.joinButton}>Join Google Meet</a>
        ) : null}

        <DataTable columns={userColumns} data={users} emptyMessage="No users registered yet." />
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f0e8", padding: "36px 20px" },
  container: { maxWidth: 980, margin: "0 auto" },
  title: { fontSize: 38, marginBottom: 10 },
  meta: { margin: "6px 0", color: "#4e5653" },
  joinButton: { display: "inline-block", margin: "14px 0 22px", background: "#d9f95d", color: "#16211f", borderRadius: 10, padding: "12px 16px", fontWeight: 800, textDecoration: "none" },
};
