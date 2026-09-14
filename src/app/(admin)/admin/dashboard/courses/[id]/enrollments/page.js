import AdminCourseEnrollmentsPage from "@/features/courses/components/screens/AdminCourseEnrollmentsPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <AdminCourseEnrollmentsPage courseId={id} />;
}
