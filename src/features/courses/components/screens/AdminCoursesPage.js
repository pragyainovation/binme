"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import { getAdminCourses } from "@/features";
import { deleteCourseWithLessons } from "@/features/courses/course.client";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]); const [loading, setLoading] = useState(true);
  const load = async () => { setCourses(await getAdminCourses()); setLoading(false); };
  useEffect(() => { load(); }, []);
  const remove = async (course) => { if (!window.confirm(`Delete ${course.title} and all its lessons? This cannot be undone.`)) return; await deleteCourseWithLessons(course.id); load(); };
  const columns = [
    { header: "Course", accessorKey: "title", cell: ({ row }) => <strong>{row.original.title}</strong> },
    { header: "Access", accessorKey: "accessType", cell: ({ row }) => row.original.accessType === "paid" ? `Paid · ₹${Number(row.original.price || 0).toFixed(2)}` : "Free" },
    { header: "Status", accessorKey: "status", cell: ({ row }) => row.original.status },
    { header: "Actions", id: "actions", cell: ({ row }) => <div style={styles.actions}><Link href={`/admin/dashboard/courses/${row.original.id}/edit`} style={styles.edit}>Edit</Link><Link href={`/admin/dashboard/courses/${row.original.id}/lessons`} style={styles.lessons}>Lessons</Link><button onClick={() => remove(row.original)} style={styles.delete}>Delete</button></div> },
  ];
  return <main style={styles.page}><div style={styles.container}><header style={styles.header}><div><p style={styles.eyebrow}>Learning</p><h1 style={styles.title}>Courses</h1></div><Link href="/admin/dashboard/courses/create" style={styles.primary}>Create Course</Link></header>{loading ? <p>Loading courses...</p> : <DataTable columns={columns} data={courses} emptyMessage="No courses created yet." />}</div></main>;
}
const styles = { page:{minHeight:"100vh",background:"#f5f1ea",padding:"32px 20px"},container:{maxWidth:1100,margin:"0 auto"},header:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:24},eyebrow:{margin:0,color:"#ff724f",fontWeight:800,textTransform:"uppercase"},title:{fontSize:36,margin:"6px 0 0"},primary:{background:"#16211f",color:"#fff",padding:"12px 18px",borderRadius:10,fontWeight:700},actions:{display:"flex",gap:8,flexWrap:"wrap"},edit:{padding:"8px 10px",background:"#eee9ff",color:"#5a3f9a",borderRadius:8,fontWeight:700},lessons:{padding:"8px 10px",background:"#dfe8ff",color:"#2941a8",borderRadius:8,fontWeight:700},delete:{padding:"8px 10px",border:0,background:"#f7d9d9",color:"#8b2d2d",borderRadius:8,fontWeight:700} };
