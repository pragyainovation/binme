"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import Loader from "@/components/ui/Loader";
import { getAdminCourses, getCourseEnrollmentCount } from "@/features";
import { deleteCourseWithLessons } from "@/features/courses/course.client";
import { sendUpcomingCourseSessionReminderEmail } from "@/features/reminders/reminder.client";
import { emailActiveUsers } from "@/features/users/user-email.client";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]); const [loading, setLoading] = useState(true); const [reminderCourseId, setReminderCourseId] = useState(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false); const [emailSubject, setEmailSubject] = useState(""); const [emailMessage, setEmailMessage] = useState(""); const [sendingEmail, setSendingEmail] = useState(false);
  const load = async () => { const items = await getAdminCourses(); const coursesWithEnrollmentCounts = await Promise.all(items.map(async (course) => ({ ...course, enrolledCount: await getCourseEnrollmentCount(course.id) }))); setCourses(coursesWithEnrollmentCounts); setLoading(false); };
  useEffect(() => { load(); }, []);
  const remove = async (course) => { if (!window.confirm(`Delete ${course.title} and all its lessons? This cannot be undone.`)) return; await deleteCourseWithLessons(course.id); load(); };
  const sendReminder = async (course) => {
    if (!window.confirm(`Email all active learners of ${course.title} about its next upcoming session?`)) return;
    setReminderCourseId(course.id);
    try {
      const result = await sendUpcomingCourseSessionReminderEmail(course.id);
      window.alert(`Reminder sent for ${result.sessionTitle}. Sent: ${result.sent}; failed: ${result.failed}.`);
    } catch (error) {
      window.alert(error.message || "Unable to send the session reminder.");
    } finally {
      setReminderCourseId(null);
    }
  };
  const sendBroadcastEmail = async (event) => {
    event.preventDefault();
    if (!window.confirm("Send this email to all active user accounts?")) return;
    setSendingEmail(true);
    try {
      const result = await emailActiveUsers({ subject: emailSubject, message: emailMessage });
      window.alert(`Email complete. Sent: ${result.sent}; failed: ${result.failed}.`);
      setEmailSubject("");
      setEmailMessage("");
      setShowEmailComposer(false);
    } catch (error) {
      window.alert(error.message || "Unable to send email.");
    } finally {
      setSendingEmail(false);
    }
  };
  const columns = [
    { header: "Course", accessorKey: "title", cell: ({ row }) => <strong>{row.original.title}</strong> },
    { header: "Access", accessorKey: "accessType", cell: ({ row }) => row.original.accessType === "paid" ? `Paid · ₹${Number(row.original.price || 0).toFixed(2)}` : "Free" },
    { header: "Enrolled", accessorKey: "enrolledCount", cell: ({ row }) => row.original.enrolledCount },
    { header: "Status", accessorKey: "status", cell: ({ row }) => row.original.status },
    { header: "Actions", id: "actions", cell: ({ row }) => <div style={styles.actions}><Link href={`/admin/dashboard/courses/${row.original.id}/enrollments`} style={styles.enrollments} aria-label="View enrolled users" title="View enrolled users">👥</Link><Link href={`/admin/dashboard/courses/${row.original.id}/edit`} style={styles.edit} aria-label="Edit course" title="Edit course">✏️</Link><Link href={`/admin/dashboard/courses/${row.original.id}/lessons`} style={styles.lessons} aria-label="Manage lessons" title="Manage lessons">📚</Link><button type="button" onClick={() => sendReminder(row.original)} disabled={reminderCourseId === row.original.id} style={styles.reminder} aria-label="Send upcoming session reminder" title="Send upcoming session reminder">{reminderCourseId === row.original.id ? <Loader size={16} label="Sending reminder" /> : "✉ Reminder"}</button><button type="button" onClick={() => remove(row.original)} style={styles.delete} aria-label="Delete course" title="Delete course">🗑</button></div> },
  ];
  return <main style={styles.page}><div style={styles.container}><header style={styles.header}><div><p style={styles.eyebrow}>Learning</p><h1 style={styles.title}>Courses</h1></div><div style={styles.headerActions}><button type="button" onClick={() => setShowEmailComposer((visible) => !visible)} style={styles.emailButton}>✉ Email active users</button><Link href="/admin/dashboard/courses/create" style={styles.primary}>Create Course</Link></div></header>{showEmailComposer ? <form onSubmit={sendBroadcastEmail} style={styles.emailComposer}><div><strong>Email active users</strong><p style={styles.emailHelp}>This will go to enabled accounts with a user profile.</p></div><label style={styles.emailField}>Subject<input required maxLength={150} value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} style={styles.emailControl} /></label><label style={styles.emailField}>Message<textarea required maxLength={5000} rows={6} value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} style={styles.emailControl} /></label><div style={styles.composerActions}><button type="button" onClick={() => setShowEmailComposer(false)} style={styles.cancelButton} disabled={sendingEmail}>Cancel</button><button type="submit" style={styles.sendButton} disabled={sendingEmail}>{sendingEmail ? "Sending…" : "Send to all active users"}</button></div></form> : null}{loading ? <Loader label="Loading courses" /> : <DataTable columns={columns} data={courses} emptyMessage="No courses created yet." />}</div></main>;
}
const styles = { page:{minHeight:"100vh",background:"#f5f1ea",padding:"32px 20px"},container:{maxWidth:1100,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24},headerActions:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"},eyebrow:{margin:0,color:"#ff724f",fontWeight:800,textTransform:"uppercase"},title:{fontSize:36,margin:"6px 0 0"},primary:{background:"#16211f",color:"#fff",padding:"12px 18px",borderRadius:10,fontWeight:700},emailButton:{border:"1px solid #c8d2cc",background:"#fff",color:"#16211f",padding:"11px 14px",borderRadius:10,fontWeight:700},emailComposer:{display:"grid",gap:14,background:"#fff",border:"1px solid #e3ded4",borderRadius:12,padding:20,marginBottom:24},emailHelp:{margin:"4px 0 0",color:"#53615f",fontSize:14},emailField:{display:"grid",gap:6,fontWeight:700,color:"#34413d"},emailControl:{width:"100%",border:"1px solid #c8d2cc",borderRadius:8,padding:"10px 12px",color:"#16211f",resize:"vertical"},composerActions:{display:"flex",justifyContent:"flex-end",gap:10,flexWrap:"wrap"},cancelButton:{border:"1px solid #c8d2cc",background:"#fff",color:"#16211f",padding:"10px 14px",borderRadius:8,fontWeight:700},sendButton:{border:0,background:"#16211f",color:"#fff",padding:"10px 14px",borderRadius:8,fontWeight:700},actions:{display:"flex",gap:8,flexWrap:"wrap"},enrollments:{padding:"8px 10px",background:"#e4f5d2",color:"#285b16",borderRadius:8,fontWeight:700},edit:{padding:"8px 10px",background:"#eee9ff",color:"#5a3f9a",borderRadius:8,fontWeight:700},lessons:{padding:"8px 10px",background:"#dfe8ff",color:"#2941a8",borderRadius:8,fontWeight:700},reminder:{padding:"8px 10px",border:0,background:"#fff0cf",color:"#785600",borderRadius:8,fontWeight:700},delete:{padding:"8px 10px",border:0,background:"#f7d9d9",color:"#8b2d2d",borderRadius:8,fontWeight:700} };
