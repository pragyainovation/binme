import CourseDetailsPage from "@/features/courses/components/screens/CourseDetailsPage";
export default async function Page({params}){const {id}=await params;return <CourseDetailsPage courseId={id}/>;}
