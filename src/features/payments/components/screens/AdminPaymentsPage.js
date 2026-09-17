"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import { getAllPayments, getAllUsers, getCourseById, getSessionById } from "@/features";
import { markPaymentRefunded } from "@/features/payments/payment.client";
import { parseISTDate } from "@/lib/time/ist";
import Loader from "@/components/ui/Loader";

const formatRupees = (paise) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(paise || 0) / 100);
const formatTimestamp = (timestamp) => timestamp?.seconds
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(timestamp.seconds * 1000))
  : "-";
const receiptDate = (timestamp) => timestamp?.seconds
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(timestamp.seconds * 1000))
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
        const courseIds = [...new Set(records.map((payment) => payment.courseId).filter(Boolean))];
        const [sessions, courses] = await Promise.all([Promise.all(eventIds.map((id) => getSessionById(id))), Promise.all(courseIds.map((id) => getCourseById(id)))]);
        const sessionMap = Object.fromEntries(sessions.filter(Boolean).map((session) => [session.id, session]));
        const courseMap = Object.fromEntries(courses.filter(Boolean).map((course) => [course.id, course]));
        setPayments(records.map((payment) => {
          const user = userMap[payment.userId];
          const session = sessionMap[payment.eventId];
          const course = courseMap[payment.courseId];
          return {
            ...payment,
            userName: user?.name || user?.displayName || "User",
            userEmail: user?.email || "-",
            sessionTitle: session?.title || course?.title || "-",
            resourceType: payment.resourceType || (payment.courseId ? "course" : "event"),
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
  const downloadCashReceipt = async (payment) => {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF({ unit: "mm", format: "a4" });
    const issuedAt = payment.capturedAt || payment.createdAt;
    const receiptId = payment.orderId || payment.id;
    const amount = `INR ${(Number(payment.amount || 0) / 100).toFixed(2)}`;
    const margin = 18;

    document.setFillColor(246, 241, 233);
    document.rect(0, 0, 210, 297, "F");
    document.setFillColor(22, 33, 31);
    document.rect(0, 0, 210, 50, "F");
    document.setFillColor(255, 114, 79);
    document.rect(0, 47, 210, 3, "F");
    document.setTextColor(255, 255, 255);
    document.setFont("helvetica", "bold");
    document.setFontSize(24);
    document.text("BinMe", margin, 22);
    document.setFont("helvetica", "normal");
    document.setFontSize(10);
    document.text("CASH PAYMENT RECEIPT", margin, 31);
    document.setFontSize(9);
    document.text("RECEIPT NO.", 192, 18, { align: "right" });
    document.setFont("helvetica", "bold");
    document.setFontSize(10);
    document.text(String(receiptId).slice(-30), 192, 26, { align: "right" });

    document.setFillColor(255, 255, 255);
    document.roundedRect(margin, 62, 174, 42, 4, 4, "F");
    document.setFillColor(229, 246, 233);
    document.roundedRect(120, 62, 72, 42, 4, 4, "F");
    document.setTextColor(23, 33, 31);
    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.setTextColor(83, 97, 95);
    document.text("RECEIVED FROM", 28, 76);
    document.setFont("helvetica", "bold");
    document.setFontSize(15);
    document.setTextColor(23, 33, 31);
    document.text(String(payment.userName || "Student"), 28, 87);
    document.setFont("helvetica", "normal");
    document.setFontSize(10);
    document.setTextColor(83, 97, 95);
    document.text(String(payment.userEmail || "-"), 28, 96);
    document.setFontSize(9);
    document.text("AMOUNT RECEIVED", 132, 76);
    document.setFont("helvetica", "bold");
    document.setFontSize(18);
    document.setTextColor(17, 102, 56);
    document.text(amount, 132, 89);
    document.setFont("helvetica", "normal");
    document.setFontSize(9);
    document.text("Cash - paid", 132, 97);

    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.setTextColor(23, 33, 31);
    document.text("Payment details", margin, 122);
    const details = [
      ["Course", payment.sessionTitle || "-"],
      ["Payment date", receiptDate(issuedAt)],
      ["Payment method", "Cash"],
      ["Payment status", "Paid"],
    ];
    let y = 134;
    details.forEach(([label, value], index) => {
      document.setFillColor(index % 2 ? 250 : 255, index % 2 ? 250 : 255, index % 2 ? 250 : 255);
      document.rect(margin, y - 6, 174, 10, "F");
      document.setFont("helvetica", "normal");
      document.setTextColor(83, 97, 95);
      document.setFontSize(9);
      document.text(label, 24, y);
      document.setFont("helvetica", "bold");
      document.setTextColor(23, 33, 31);
      document.text(String(value || "-"), 88, y);
      y += 10;
    });
    if (payment.notes) {
      document.setFont("helvetica", "bold");
      document.setFontSize(11);
      document.text("Admin note", margin, y + 15);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      document.setTextColor(83, 97, 95);
      const noteLines = document.splitTextToSize(String(payment.notes), 164);
      document.text(noteLines, margin, y + 24);
      y += 24 + Math.max(8, noteLines.length * 5);
    }
    document.setDrawColor(216, 221, 216);
    document.line(margin, 258, 192, 258);
    document.setTextColor(83, 97, 95);
    document.setFontSize(9);
    document.text("This receipt confirms a manually recorded cash payment.", margin, 269);
    document.text("Thank you for learning with BinMe.", margin, 276);
    document.setFont("helvetica", "bold");
    document.setTextColor(23, 33, 31);
    document.text("BINME", 192, 276, { align: "right" });
    document.save(`binme-cash-receipt-${receiptId}.pdf`);
  };
  const columns = [
    { header: "Course / Session", accessorKey: "sessionTitle", cell: ({ row }) => row.original.resourceType === "course" ? <span style={styles.sessionLink}>{row.original.sessionTitle}</span> : <Link href={`/admin/dashboard/events/${row.original.eventId}`} style={styles.sessionLink}>{row.original.sessionTitle}</Link> },
    { header: "Session status", accessorKey: "sessionStatus", cell: ({ row }) => row.original.sessionStatus === "cancelled" ? <span style={styles.statusCancelled}>Cancelled</span> : row.original.sessionStatus },
    { header: "User", accessorKey: "userName", cell: ({ row }) => <div><strong>{row.original.userName}</strong><br /><span style={styles.email}>{row.original.userEmail}</span></div> },
    { header: "Amount", accessorKey: "amount", cell: ({ row }) => formatRupees(row.original.amount) },
    { header: "Payment status", accessorKey: "status", cell: ({ row }) => <span style={paymentStatusStyle(row.original.status)}>{paymentStatus(row.original.status)}</span> },
    { header: "Method", accessorKey: "method", cell: ({ row }) => row.original.method ? row.original.method.toUpperCase() : "-" },
    { header: "Razorpay payment ID", accessorKey: "paymentId", cell: ({ row }) => row.original.paymentId ? <div style={styles.idCell}><code style={styles.paymentId}>{row.original.paymentId}</code><button type="button" onClick={() => copyPaymentId(row.original.paymentId)} style={styles.copyButton}>{copiedPaymentId === row.original.paymentId ? "Copied" : "Copy"}</button></div> : "-" },
    { header: "Date", id: "date", accessorFn: (item) => item.capturedAt?.seconds || item.createdAt?.seconds || 0, cell: ({ row }) => formatTimestamp(row.original.capturedAt || row.original.createdAt) },
    { header: "Refund", accessorKey: "refundStatus", cell: ({ row }) => row.original.refundStatus ? <span style={styles.refund}>{row.original.refundStatus}</span> : "-" },
    { header: "Receipt", id: "receipt", cell: ({ row }) => row.original.method === "cash" ? <button type="button" style={styles.receiptButton} onClick={() => downloadCashReceipt(row.original)}>PDF receipt</button> : "-" },
    { header: "Action", id: "action", cell: ({ row }) => row.original.sessionStatus === "cancelled" && row.original.status === "captured" ? <button type="button" style={styles.refundButton} disabled={updatingOrderId === row.original.orderId} onClick={() => markRefunded(row.original)} aria-label="Mark refunded" title="Mark refunded">{updatingOrderId === row.original.orderId ? <Loader size={18} label="Updating refund" /> : "↩"}</button> : "-" },
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
        {loading ? <div style={styles.loadingCard}><Loader label="Loading payments" /></div> : <>
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
  return <Suspense fallback={<main style={styles.page}><div style={styles.container}><div style={styles.loadingCard}><Loader label="Loading payments" /></div></div></main>}><AdminPaymentsContent /></Suspense>;
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
  receiptButton: { background: "#e4f5d2", color: "#285b16", border: 0, borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  refundButton: { background: "#f4e1e1", color: "#8b2d2d", border: 0, borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer" },
  statusPaid: { background: "#dff9e8", color: "#157347", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusRefunded: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusPending: { background: "#fef2d8", color: "#8a5a07", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusFailed: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  statusCancelled: { background: "#f4e1e1", color: "#8b2d2d", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12 },
  refund: { background: "#eee9ff", color: "#5a3f9a", padding: "6px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12, textTransform: "capitalize" },
};
