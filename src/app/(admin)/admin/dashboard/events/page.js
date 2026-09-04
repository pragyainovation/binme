"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import {
  cancelSession,
  deleteFreeWebinar,
  deleteSession,
  getFreeWebinarsWithRegistrations,
  getSessionsWithRegistrationData,
  updateFreeWebinar,
} from "@/features";
import { formatDateIST, formatTimeIST } from "@/lib/time/ist";
import { sendAdminNotification } from "@/features/notifications/notification.client";

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [notificationId, setNotificationId] = useState(null);

  const loadSessions = async () => {
    const items = await getSessionsWithRegistrationData();
    const freeWebinars = await getFreeWebinarsWithRegistrations();
    const freeWebinar = freeWebinars.find((webinar) => webinar.status !== "inactive");
    setSessions(freeWebinar ? [...items, { ...freeWebinar, isFreeWebinar: true }] : items);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const deactivate = async (session) => {
    if (!window.confirm(`Deactivate ${session.title}?`)) return;
    setActionId(session.id);
    try {
      if (session.isFreeWebinar) await updateFreeWebinar(session.id, { status: "inactive" });
      else await cancelSession(session.id);
      await loadSessions();
    } finally {
      setActionId(null);
    }
  };

  const notify = async (session) => {
    setNotificationId(session.id);
    try {
      const result = await sendAdminNotification(session.id, session.isFreeWebinar ? "webinar" : "session");
      window.alert(`Notification sent to ${result.sent} device${result.sent === 1 ? "" : "s"}.`);
    } catch (error) {
      window.alert(error.message || "Unable to send notification.");
    } finally {
      setNotificationId(null);
    }
  };

  const remove = async (session) => {
    if (!window.confirm(`Delete ${session.title}? This cannot be undone.`)) return;
    setActionId(session.id);
    try {
      if (session.isFreeWebinar) await deleteFreeWebinar(session.id);
      else await deleteSession(session.id);
      await loadSessions();
    } finally {
      setActionId(null);
    }
  };

  const columns = [
    {
      header: "Session",
      accessorKey: "title",
      cell: ({ row }) => <strong>{row.original.title}</strong>,
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: ({ row }) => formatDateIST(row.original.date),
    },
    {
      header: "Time",
      accessorKey: "time",
      cell: ({ row }) => `${formatTimeIST(row.original.time)} IST`,
    },
    {
      header: "Registrations",
      accessorKey: "registrationCount",
      cell: ({ row }) => row.original.isFreeWebinar ? "Landing-page free webinar" : row.original.registrationCount || 0,
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => {
        const session = row.original;
        return <div>
          <Link href={`/admin/dashboard/events/${session.id}`} style={styles.viewLink} aria-label="View" title="View">&#128065;</Link>
          <Link href={`/admin/dashboard/events/${session.id}/edit`} style={styles.editLink} aria-label="Edit" title="Edit">&#9998;</Link>
          <button type="button" style={styles.notificationButton} disabled={notificationId === session.id} onClick={() => notify(session)} aria-label="Send Notification" title="Send Notification">&#128276;</button>
          <button type="button" style={styles.actionButton} disabled={actionId === session.id} onClick={() => deactivate(session)} aria-label="Deactivate" title="Deactivate">&#9209;</button>
          <button type="button" style={styles.deleteButton} disabled={actionId === session.id} onClick={() => remove(session)} aria-label="Delete" title="Delete">&#128465;</button>
        </div>;
      },
    },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Sessions</h1>
          <Link href="/admin/dashboard/events/create" style={styles.primaryButton}>Create Event</Link>
        </header>

        {loading ? <p>Loading sessions...</p> : (
          <DataTable columns={columns} data={sessions} emptyMessage="No sessions available." />
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
  viewLink: { display: "inline-block", margin: "3px 8px 3px 0", borderRadius: 8, padding: "8px 11px", background: "#dfe8ff", color: "#2941a8", fontWeight: 700 },
  editLink: { display: "inline-block", margin: "3px 8px 3px 0", borderRadius: 8, padding: "8px 11px", background: "#f1e4ff", color: "#7040a8", fontWeight: 700 },
  actionButton: { display: "inline-block", margin: "3px 8px 3px 0", border: 0, borderRadius: 8, padding: "8px 11px", background: "#fef2d8", color: "#8a5a07", fontWeight: 700, cursor: "pointer" },
  notificationButton: { display: "inline-block", margin: "3px 8px 3px 0", border: 0, borderRadius: 8, padding: "8px 11px", background: "#d9f4f1", color: "#12665e", fontWeight: 700, cursor: "pointer" },
  deleteButton: { display: "inline-block", margin: "3px 0", border: 0, borderRadius: 8, padding: "8px 11px", background: "#f7d9d9", color: "#a33131", fontWeight: 700, cursor: "pointer" },
};
