"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import { getAllPayments, getAllUsers, getSessionById } from "@/features";
import { markPaymentRefunded } from "@/features/payments/payment.client";
import { parseISTDate } from "@/lib/time/ist";

const formatRupees = (paise) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(paise || 0) / 100);
const formatTimestamp = (timestamp) => timestamp?.seconds
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(timestamp.seconds * 1000))
  : "-";

function paymentStatus(status) {
  return ({ captured: "Paid", created: "Payment started", authorized: "Confirming", failed: "Failed" }[status] || status || "Processing");
}

function paymentStatusStyle(status) {
  if (status === "captured") return styles.statusPaid;
  if (status === "refunded") return styles.statusRefunded;
  if (status === "failed") return styles.statusFailed;
  return styles.statusPending;
}

function AdminPaymentsContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState("all");
  const [copiedPaymentId, setCopiedPaymentId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [records, users] = await Promise.all([getAllPayments(), getAllUsers()]);
        const userMap = Object.fromEntries(users.map((user) => [user.uid || user.id, user]));
        const eventIds = [...new Set(records.map((payment) => payment.eventId).filter(Boolean))];
        const sessions = await Promise.all(eventIds.map((id) => getSessionById(id)));
        const sessionMap = Object.fromEntries(sessions.filter(Boolean).map((session) => [session.id, session]));
        setPayments(records.map((payment) => {
          const user = userMap[payment.userId];
          const session = sessionMap[payment.eventId];
          return {
            ...payment,
            userName: user?.name || user?.displayName || "User",
            userEmail: user?.email || "-",
            sessionTitle: session?.title || "Session",
            sessionStatus: session?.status || "-",
            sessionDate: session?.date || null,
            sessionTime: session?.time || null,
          };
        }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visiblePayments = useMemo(() => payments.filter((payment) => {
    if (eventId && payment.eventId !== eventId) return false;
    if (sessionFilter === "cancelled") return payment.sessionStatus === "cancelled";
    if (sessionFilter === "upcoming") {
      const start = parseISTDate(payment.sessionDate, payment.sessionTime);
      return payment.sessionStatus !== "cancelled" && start && start.getTime() > Date.now();
    }
    return true;
  }), [eventId, payments, sessionFilter]);
  const currentSessionName = visiblePayments[0]?.sessionTitle;
  const copyPaymentId = async (paymentId) => {
    if (!paymentId) return;
    try {
      await navigator.clipboard.writeText(paymentId);
      setCopiedPaymentId(paymentId);
      window.setTimeout(() => setCopiedPaymentId(null), 1800);
    } catch {
      window.alert("Unable to copy the payment ID. Please copy it manually.");
    }
  };
  const markRefunded = async (payment) => {
    if (!window.confirm(`Confirm that refund for ${payment.paymentId} has already been completed in Razorpay Dashboard?`)) return;
    setUpdatingOrderId(payment.orderId);
    try {
      await markPaymentRefunded(payment.orderId);
      setPayments((items) => items.map((item) => item.orderId === payment.orderId ? { ...item, status: "refunded", refundStatus: "processed" } : item));
    } catch (error) {
      window.alert(error.message || "Unable to update refund status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };
  const columns = [
    { header: "Session", accessorKey: "sessionTitle", cell: ({ row }) => <Link href={`/admin/dashboard/events/${row.original.eventId}`} style={styles.sessionLink}>{row.original.sessionTitle}</Link> },
    { header: "Session status", accessorKey: "sessionStatus", cell: ({ row }) => row.original.sessionStatus === "cancelled" ? <span style={styles.statusCancelled}>Cancelled</span> : row.original.sessionStatus },
    { header: "User", accessorKey: "userName", cell: ({ row }) => <div><strong>{row.original.userName}</strong><br /><span style={styles.email}>{row.original.userEmail}</span></div> },
    { header: "Amount", accessorKey: "amount", cell: ({ row }) => formatRupees(row.original.amount) },
    { header: "Payment status", accessorKey: "status", cell: ({ row }) => <span style={paymentStatusStyle(row.original.status)}>{paymentStatus(row.original.status)}</span> },
    { header: "Method", accessorKey: "method", cell: ({ row }) => row.original.method ? row.original.method.toUpperCase() : "-" },
    { header: "Razorpay payment ID", accessorKey: "paymentId", cell: ({ row }) => row.original.paymentId ? <div style={styles.idCell}><code style={styles.paymentId}>{row.original.paymentId}</code><button type="button" onClick={() => copyPaymentId(row.original.paymentId)} style={styles.copyButton}>{copiedPaymentId === row.original.paymentId ? "Copied" : "Copy"}</button></div> : "-" },
    { header: "Date", id: "date", accessorFn: (item) => item.capturedAt?.seconds || item.createdAt?.seconds || 0, cell: ({ row }) => formatTimestamp(row.original.capturedAt || row.original.createdAt) },
    { header: "Refund", accessorKey: "refundStatus", cell: ({ row }) => row.original.refundStatus ? <span style={styles.refund}>{row.original.refundStatus}</span> : "-" },
    { header: "Action", id: "action", cell: ({ row }) => row.original.sessionStatus === "cancelled" && row.original.status === "captured" ? <button type="button" style={styles.refundButton} disabled={updatingOrderId === row.original.orderId} onClick={() => markRefunded(row.original)}>{updatingOrderId === row.original.orderId ? "Updating..." : "Mark refunded"}</button> : "-" },
  ];

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>Payments</p>
            <h1 style={styles.title}>{currentSessionName ? `${currentSessionName} payments` : "Payment history"}</h1>
            {eventId ? <p style={styles.note}>Use the Razorpay payment ID below to issue the refund manually from the Razorpay Dashboard.</p> : null}
          </div>
          {eventId ? <Link href="/admin/dashboard/payments" style={styles.primaryButton}>All Payments</Link> : <Link href="/admin/dashboard/events" style={styles.primaryButton}>View Events</Link>}
        </header>
        {loading ? <div style={styles.loadingCard}>Loading payments...</div> : <>
          <div style={styles.filters} aria-label="Session payment filters">
            {[{ id: "all", label: "All sessions" }, { id: "cancelled", label: "Cancelled sessions" }, { id: "upcoming", label: "Upcoming sessions" }].map((filter) => <button key={filter.id} type="button" onClick={() => setSessionFilter(filter.id)} style={sessionFilter === filter.id ? styles.filterActive : styles.filterButton}>{filter.label}</button>)}
          </div>
          <DataTable columns={columns} data={visiblePayments} emptyMessage="No payment records found." searchPlaceholder="Search payment ID, user, or session..." />
        </>}
      </div>
    </main>
  );
}

export default function AdminPaymentsPage() {
  return <Suspense fallback={<main style={styles.page}><div style={styles.container}><div style={styles.loadingCard}>Loading payments...</div></div></main>}><AdminPaymentsContent /></Suspense>;
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #f7f1e9 0%, #eef4f8 100%)", padding: "32px 20px", color: "#17211f" },
  container: { maxWidth: 1240, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginBottom: 22, flexWrap: "wrap" },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" },
  title: { margin: "8px 0 0", fontSize: 38, letterSpacing: -1.2 },
  note: { margin: "10px 0 0", color: "#53615f" },
  primaryButton: { background: "linear-gradient(135deg, #182321 0%, #2e403d 100%)", color: "#fff", padding: "12px 18px", borderRadius: 12, fontWeight: 700 },
  loadingCard: { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(20,29,26,0.05)", borderRadius: 18, padding: "18px 20px", color: "#4d5653" },
  filters: { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  filterButton: { background: "#f2f6f8", border: "1px solid rgba(23, 33, 31, 0.08)", borderRadius: 999, padding: "10px 16px", fontWeight: 700, color: "#33413f", cursor: "pointer" },
  filterActive: { background: "#17211f", border: "1px solid #17211f", borderRadius: 999, padding: "10px 16px", fontWeight: 700, color: "#fff", cursor: "pointer" },
  sessionLink: { color: "#2941a8", fontWeight: 700 },
  email: { color: "#53615f", fontSize: 12 },
  idCell: { display: "flex", alignItems: "center", gap: 8 },
  paymentId: { fontSize: 12, color: "#33413f" },
  copyButton: { background: "#eef1ff", color: "#2941a8", border: 0, borderRadius: 8, padding: "6px 8px", fontWeight: 700, cursor: "pointer" },
  refundButton: { background: "#f4e1e1", color: "#8b2d2d", border: 0, borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer" },
  statusPaid: { background: "#dff9e8", color: "#157347", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusRefunded: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusPending: { background: "#fef2d8", color: "#8a5a07", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusFailed: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusCancelled: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  refund: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, textTransform: "capitalize" },
};
