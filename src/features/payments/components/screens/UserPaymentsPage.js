"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import DataTable from "@/components/ui/DataTable";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { getPaymentsByUser, getSessionById } from "@/features";

function formatRupees(paise) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(paise || 0) / 100);
}

function formatTimestamp(timestamp) {
  if (!timestamp?.seconds) return "Processing";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(timestamp.seconds * 1000));
}

function statusLabel(status) {
  return ({ captured: "Paid", refunded: "Refunded", created: "Payment started", authorized: "Confirming", failed: "Failed" }[status] || status || "Processing");
}

function statusStyle(status) {
  if (status === "captured") return styles.statusPaid;
  if (status === "refunded") return styles.statusRefunded;
  if (status === "failed") return styles.statusFailed;
  return styles.statusPending;
}

export default function UserPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { header: "Session", accessorKey: "sessionTitle", cell: ({ row }) => row.original.sessionTitle || "Session" },
    { header: "Amount", accessorKey: "amount", cell: ({ row }) => formatRupees(row.original.amount) },
    { header: "Payment status", accessorKey: "status", cell: ({ row }) => <span style={statusStyle(row.original.status)}>{statusLabel(row.original.status)}</span> },
    { header: "Method", accessorKey: "method", cell: ({ row }) => row.original.method ? row.original.method.toUpperCase() : "-" },
    { header: "Date", id: "date", accessorFn: (item) => item.capturedAt?.seconds || item.createdAt?.seconds || 0, cell: ({ row }) => formatTimestamp(row.original.capturedAt || row.original.createdAt) },
    { header: "Refund", accessorKey: "refundStatus", cell: ({ row }) => row.original.refundStatus ? <span style={styles.refund}>{row.original.refundStatus}</span> : "-" },
    { header: "Details", id: "details", cell: ({ row }) => <Link href={`/dashboard/events/${row.original.sessionSlug || row.original.eventId}`} style={styles.detailsLink}>View session</Link> },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const records = await getPaymentsByUser(user.uid);
        const withSessions = await Promise.all(records.map(async (payment) => {
          const session = payment.eventId ? await getSessionById(payment.eventId) : null;
          return { ...payment, sessionTitle: session?.title || "Session", sessionSlug: session?.slug || payment.eventId };
        }));
        setPayments(withSessions);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.brand}>BinMe</div>
            <p style={styles.eyebrow}>My payments</p>
            <h1 style={styles.title}>Your payment history</h1>
          </div>
          <Link href="/dashboard" style={styles.primaryButton}>Back to Dashboard</Link>
        </header>
        {loading ? <div style={styles.loadingCard}>Loading payments...</div> : (
          <DataTable columns={columns} data={payments} emptyMessage="You have not made any payments yet." searchPlaceholder="Search payments..." />
        )}
      </div>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #f7f0e7 0%, #f1f5f9 100%)", padding: "32px 20px", color: "#17211f" },
  container: { maxWidth: 1120, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, marginBottom: 22, flexWrap: "wrap" },
  brand: { marginBottom: 8, fontSize: 24, fontWeight: 900, letterSpacing: -0.08, color: "#17211f" },
  eyebrow: { margin: 0, color: "#ff764d", fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  title: { fontSize: 36, margin: "8px 0 0", letterSpacing: -1 },
  primaryButton: { background: "linear-gradient(135deg, #182321 0%, #2a3d39 100%)", color: "#fff", padding: "12px 18px", borderRadius: 12, fontWeight: 700 },
  loadingCard: { background: "rgba(255,255,255,0.7)", border: "1px solid rgba(20,29,26,0.05)", borderRadius: 18, padding: "18px 20px", color: "#4d5653" },
  detailsLink: { color: "#20313a", fontWeight: 700 },
  statusPaid: { background: "#dff9e8", color: "#157347", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusRefunded: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusPending: { background: "#fef2d8", color: "#8a5a07", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusFailed: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  refund: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, textTransform: "capitalize" },
};
