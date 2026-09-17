"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import Loader from "@/components/ui/Loader";
import { getCourseById, getCourseEnrollments } from "@/features";
import { getUserProfile } from "@/features/users/user.repository";
import { getRegisteredUsers } from "@/features/users/user.repository";
import { browserAuth } from "@/lib/firebase/client-auth";

const dateValue = (value) => value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null);
const dateLabel = (value) => { const date = dateValue(value); return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"; };
const inputDate = (value) => { const date = dateValue(value); return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : ""; };

export default function AdminCourseEnrollmentsPage({ courseId }) {
  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollmentMessage, setEnrollmentMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [courseRecord, enrollmentRecords, registeredUsers] = await Promise.all([getCourseById(courseId), getCourseEnrollments(courseId), getRegisteredUsers()]);
        const enrollmentsWithUsers = await Promise.all(enrollmentRecords.map(async (enrollment) => {
          const user = await getUserProfile(enrollment.userId);
          return { ...enrollment, userName: user?.name || "Unknown user", userEmail: user?.email || "—", userMobile: user?.mobile || "—" };
        }));
        setCourse(courseRecord);
        setEnrollments(enrollmentsWithUsers);
        setUsers(registeredUsers);
      } catch (loadError) {
        setError(loadError.message || "Unable to load enrolled users.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const manuallyEnroll = async (event) => {
    event.preventDefault();
    setEnrollmentMessage("");
    setEnrolling(true);
    try {
      const token = await browserAuth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch("/api/admin/courses/enrollments", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: selectedUserId, courseId, notes: cashNotes }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to enroll user.");
      const [enrollmentRecords, registeredUsers] = await Promise.all([getCourseEnrollments(courseId), getRegisteredUsers()]);
      const usersById = new Map(registeredUsers.map((user) => [user.id, user]));
      setEnrollments(enrollmentRecords.map((enrollment) => ({ ...enrollment, userName: usersById.get(enrollment.userId)?.name || "Unknown user", userEmail: usersById.get(enrollment.userId)?.email || "—", userMobile: usersById.get(enrollment.userId)?.mobile || "—" })));
      setSelectedUserId("");
      setCashNotes("");
      setEnrollmentMessage("User enrolled successfully with cash payment.");
    } catch (enrollmentError) {
      setEnrollmentMessage(enrollmentError.message || "Unable to enroll user.");
    } finally { setEnrolling(false); }
  };

  const today = new Date().toISOString().slice(0, 10);
  const rows = useMemo(() => enrollments.filter((enrollment) => {
    const enrolledDate = inputDate(enrollment.enrolledAt);
    const expiry = dateValue(enrollment.expiresAt);
    const active = enrollment.status === "enrolled" && (enrollment.accessType === "free" || (expiry && expiry.getTime() > Date.now()));
    const expired = enrollment.status === "expired" || (enrollment.accessType === "paid" && expiry && expiry.getTime() <= Date.now());
    if (filter === "active" && !active) return false;
    if (filter === "expired" && !expired) return false;
    if (filter === "today" && enrolledDate !== today) return false;
    if (startDate && enrolledDate < startDate) return false;
    if (endDate && enrolledDate > endDate) return false;
    return true;
  }).sort((first, second) => (dateValue(second.enrolledAt)?.getTime() || 0) - (dateValue(first.enrolledAt)?.getTime() || 0)), [enrollments, filter, startDate, endDate, today]);

  const activeCount = enrollments.filter((enrollment) => enrollment.status === "enrolled" && (enrollment.accessType === "free" || (dateValue(enrollment.expiresAt)?.getTime() || 0) > Date.now())).length;
  const expiredCount = enrollments.filter((enrollment) => enrollment.status === "expired" || (enrollment.accessType === "paid" && (dateValue(enrollment.expiresAt)?.getTime() || Infinity) <= Date.now())).length;
  const columns = [
    { header: "User", accessorKey: "userName", cell: ({ row }) => <div><strong>{row.original.userName}</strong><br /><small>{row.original.userEmail}</small></div> },
    { header: "Mobile", accessorKey: "userMobile" },
    { header: "Purchased on", accessorKey: "enrolledAt", cell: ({ row }) => dateLabel(row.original.enrolledAt) },
    { header: "Access ends", accessorKey: "expiresAt", cell: ({ row }) => row.original.accessType === "free" ? "Free access" : dateLabel(row.original.expiresAt) },
    { header: "Payment", accessorKey: "paymentStatus", cell: ({ row }) => row.original.paymentStatus === "cash" ? "Cash" : row.original.paymentStatus === "captured" ? "Paid" : row.original.paymentStatus === "free_coupon" ? "Coupon" : "Free" },
    { header: "Access status", accessorKey: "status", cell: ({ row }) => <span style={{ ...styles.status, ...(row.original.status === "enrolled" && (row.original.accessType === "free" || (dateValue(row.original.expiresAt)?.getTime() || 0) > Date.now()) ? styles.active : styles.expired) }}>{row.original.status === "enrolled" && (row.original.accessType === "free" || (dateValue(row.original.expiresAt)?.getTime() || 0) > Date.now()) ? "Active" : "Expired"}</span> },
  ];

  if (loading) return <main style={styles.page}><Loader label="Loading enrolled users" /></main>;
  if (error || !course) return <main style={styles.page}><p style={styles.error}>{error || "Course not found."}</p></main>;

  return <main style={styles.page}><div style={styles.container}>
    <Link href="/admin/dashboard/courses" style={styles.back}>← All courses</Link>
    <header style={styles.header}><div><p style={styles.eyebrow}>Course analytics</p><h1 style={styles.title}>{course.title}</h1><p style={styles.subtitle}>Purchase and access status for every enrolled learner.</p></div></header>
    {course.accessType === "paid" ? <form onSubmit={manuallyEnroll} style={styles.manualForm}><div><strong>Manual cash enrollment</strong><p style={styles.manualHelp}>Give a registered user {course.validityDays} days of access after collecting ₹{Number(course.price || 0).toFixed(2)} in cash.</p></div><select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} style={styles.select}><option value="">Select registered user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name || "Unnamed user"} · {user.email || user.mobile || user.id}</option>)}</select><input value={cashNotes} onChange={(event) => setCashNotes(event.target.value)} placeholder="Cash receipt / note (optional)" style={styles.noteInput} /><button disabled={enrolling || !selectedUserId} style={styles.manualButton}>{enrolling ? "Enrolling…" : "Enroll with cash"}</button>{enrollmentMessage ? <p style={enrollmentMessage.includes("successfully") ? styles.success : styles.error}>{enrollmentMessage}</p> : null}</form> : null}
    <section style={styles.stats}><div style={styles.stat}><span>All enrollments</span><strong>{enrollments.length}</strong></div><div style={styles.stat}><span>Active access</span><strong>{activeCount}</strong></div><div style={styles.stat}><span>Expired access</span><strong>{expiredCount}</strong></div></section>
    <section style={styles.filters} aria-label="Enrollment filters"><div style={styles.filterButtons}>{[["all", "All"], ["active", "Active"], ["expired", "Expired"], ["today", "Today"]].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} style={filter === value ? { ...styles.filterButton, ...styles.filterButtonActive } : styles.filterButton}>{label}</button>)}</div><label style={styles.dateLabel}>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={styles.dateInput} /></label><label style={styles.dateLabel}>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={styles.dateInput} /></label>{(startDate || endDate) && <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} style={styles.clearButton}>Clear dates</button>}</section>
    <DataTable columns={columns} data={rows} emptyMessage="No enrolled users match these filters." searchPlaceholder="Search by name, email, or mobile..." />
  </div></main>;
}

const styles = { page: { minHeight: "100vh", background: "#f5f1ea", padding: "32px 20px" }, container: { maxWidth: 1180, margin: "0 auto" }, back: { color: "#2941a8", fontWeight: 700 }, header: { margin: "20px 0" }, eyebrow: { color: "#ff724f", fontWeight: 800, textTransform: "uppercase", margin: 0 }, title: { margin: "6px 0", fontSize: 36 }, subtitle: { margin: 0, color: "#56615d" }, manualForm: { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr) minmax(180px, 1fr) auto", alignItems: "end", gap: 12, background: "#fff", borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: "0 4px 14px rgba(22,33,31,.06)" }, manualHelp: { margin: "5px 0 0", color: "#56615d", fontSize: 14 }, select: { minWidth: 0, border: "1px solid #d8ddd8", borderRadius: 8, padding: 10, font: "inherit" }, noteInput: { minWidth: 0, border: "1px solid #d8ddd8", borderRadius: 8, padding: 10, font: "inherit" }, manualButton: { border: 0, background: "#16211f", color: "#fff", borderRadius: 8, padding: "11px 14px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }, success: { gridColumn: "1 / -1", margin: 0, color: "#116638", fontWeight: 700 }, stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, margin: "24px 0" }, stat: { background: "#fff", borderRadius: 12, padding: 18, display: "grid", gap: 6, boxShadow: "0 4px 14px rgba(22,33,31,.06)" }, filters: { display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap", background: "#fff", borderRadius: 12, padding: 14, marginBottom: 18 }, filterButtons: { display: "flex", gap: 8, flexWrap: "wrap" }, filterButton: { border: "1px solid #d8ddd8", background: "#fff", color: "#26332e", borderRadius: 8, padding: "9px 13px", fontWeight: 700, cursor: "pointer" }, filterButtonActive: { background: "#16211f", borderColor: "#16211f", color: "#fff" }, dateLabel: { display: "grid", gap: 4, fontSize: 13, fontWeight: 700, color: "#56615d" }, dateInput: { border: "1px solid #d8ddd8", borderRadius: 8, padding: 8, font: "inherit" }, clearButton: { border: 0, background: "transparent", color: "#8b2d2d", padding: 9, fontWeight: 700, cursor: "pointer" }, status: { display: "inline-block", padding: "5px 9px", borderRadius: 999, fontWeight: 800, fontSize: 13 }, active: { background: "#e3f6e9", color: "#116638" }, expired: { background: "#f9e4e4", color: "#8b2d2d" }, error: { color: "#8b2d2d", fontWeight: 700 } };
