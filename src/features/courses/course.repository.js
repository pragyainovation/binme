import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { browserDb } from "@/lib/firebase/client-firestore";

const records = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

export async function getCourses() {
  const snapshot = await getDocs(query(collection(browserDb, "courses"), where("status", "==", "published")));
  return records(snapshot).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
}
export async function getAdminCourses() { return records(await getDocs(collection(browserDb, "courses"))).sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)); }
export async function getCourseById(courseId) { const snapshot = await getDoc(doc(browserDb, "courses", courseId)); return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null; }
export async function createCourse(data) { return (await addDoc(collection(browserDb, "courses"), { ...data, status: data.status || "published", enrollmentCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id; }
export async function updateCourse(courseId, data) { await updateDoc(doc(browserDb, "courses", courseId), { ...data, updatedAt: serverTimestamp() }); }
export async function deleteCourse(courseId) { await deleteDoc(doc(browserDb, "courses", courseId)); }
export async function getLessons(courseId) { const result = records(await getDocs(collection(browserDb, "courses", courseId, "lessons"))); return result.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)); }
export async function addLesson(courseId, data) { return (await addDoc(collection(browserDb, "courses", courseId, "lessons"), { ...data, order: Number(data.order || 0), createdAt: serverTimestamp(), updatedAt: serverTimestamp() })).id; }
export async function updateLesson(courseId, lessonId, data) { await updateDoc(doc(browserDb, "courses", courseId, "lessons", lessonId), { ...data, order: Number(data.order || 0), updatedAt: serverTimestamp() }); }
export async function deleteLesson(courseId, lessonId) { await deleteDoc(doc(browserDb, "courses", courseId, "lessons", lessonId)); }
export async function getEnrollment(userId, courseId) { const snapshot = await getDoc(doc(browserDb, "courseEnrollments", `${userId}_${courseId}`)); return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null; }
export async function enrollInFreeCourse(userId, courseId) { await setDoc(doc(browserDb, "courseEnrollments", `${userId}_${courseId}`), { userId, courseId, accessType: "free", status: "enrolled", enrolledAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }); }
export async function unsubscribeFromFreeCourse(userId, courseId) { await deleteDoc(doc(browserDb, "courseEnrollments", `${userId}_${courseId}`)); }
export async function getEnrollmentsByUser(userId) { return records(await getDocs(query(collection(browserDb, "courseEnrollments"), where("userId", "==", userId)))); }
