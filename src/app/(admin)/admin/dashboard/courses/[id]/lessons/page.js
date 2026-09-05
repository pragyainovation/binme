import AdminLessonsPage from "@/features/courses/components/screens/AdminLessonsPage";
export default async function Page({params}){const {id}=await params;return <AdminLessonsPage courseId={id}/>;}
