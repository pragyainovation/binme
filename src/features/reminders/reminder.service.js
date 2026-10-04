import "server-only";
import { getAdminServices } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/email/mailer";
import { createEventReminderEmail } from "@/lib/email/templates/event-reminder.template";

function failure(message, status) { const error = new Error(message); error.status = status; return error; }

export async function sendEventReminderEmails(adminUserId, { eventId, eventType }) {
  if (!eventId || !["session", "webinar", "event"].includes(eventType)) throw failure("A valid event is required.", 400);
  const { adminDb: db } = getAdminServices();
  const profile = await db.collection("users").doc(adminUserId).get();
  if (profile.data()?.role !== "admin") throw failure("Admin access required.", 403);

  const isFreeWebinar = eventType === "webinar";
  const eventSnap = await db.collection(isFreeWebinar ? "freeWebinars" : "events").doc(eventId).get();
  if (!eventSnap.exists) throw failure("Event not found.", 404);
  const event = eventSnap.data();
  if (!event.meetLink) throw failure("Add a Google Meet link before sending an email reminder.", 409);
  const registrations = await db.collection(isFreeWebinar ? "freeWebinarRegistrations" : "eventRegistrations").where(isFreeWebinar ? "webinarId" : "eventId", "==", eventId).where("status", "==", "registered").get();
  const users = (await db.collection("users").get()).docs.map((item) => ({ id: item.id, ...item.data() }));
  const emailByUserId = new Map(users.map((user) => [user.id, String(user.email || "").trim().toLowerCase()]));
  const recipients = [...new Set(registrations.docs.map((item) => {
    const registration = item.data();
    return String(registration.email || emailByUserId.get(registration.userId) || "").trim().toLowerCase();
  }).filter(Boolean))];
  if (!recipients.length) return { registered: registrations.size, sent: 0, failed: 0 };

  const email = createEventReminderEmail(event);
  const result = await Promise.allSettled(recipients.map((to) => sendEmail({ to, ...email, emailType: "event_reminder" })));
  const sent = result.filter((item) => item.status === "fulfilled").length;
  return { registered: registrations.size, sent, failed: recipients.length - sent };
}

export async function sendUpcomingCourseSessionReminderEmails(adminUserId, { courseId }) {
  if (!courseId) throw failure("A course is required.", 400);
  const { adminDb: db } = getAdminServices();
  const profile = await db.collection("users").doc(adminUserId).get();
  if (profile.data()?.role !== "admin") throw failure("Admin access required.", 403);

  const now = Date.now();
  const events = await db.collection("events").where("courseId", "==", courseId).where("status", "==", "active").get();
  const upcomingSession = events.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .map((event) => ({ ...event, startsAt: new Date(`${event.date}T${event.time}:00+05:30`).getTime() }))
    .filter((event) => Number.isFinite(event.startsAt) && event.startsAt > now)
    .sort((first, second) => first.startsAt - second.startsAt)[0];

  if (!upcomingSession) throw failure("This course has no upcoming active session.", 404);
  if (!upcomingSession.meetLink) throw failure("Add a Google Meet link to the upcoming session before sending a reminder.", 409);

  const enrollments = await db.collection("courseEnrollments").where("courseId", "==", courseId).get();
  const activeEnrollments = enrollments.docs.map((item) => item.data()).filter((enrollment) => {
    if (enrollment.status !== "enrolled") return false;
    if (enrollment.accessType === "free") return true;
    return enrollment.expiresAt?.toMillis?.() > now;
  });
  const users = await Promise.all(activeEnrollments.map(async (enrollment) => {
    const user = await db.collection("users").doc(enrollment.userId).get();
    return { enrollment, user: user.data() };
  }));
  const recipients = [...new Set(users.map(({ enrollment, user }) => String(enrollment.email || user?.email || "").trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) return { sessionId: upcomingSession.id, sessionTitle: upcomingSession.title, activeLearners: activeEnrollments.length, sent: 0, failed: 0 };

  const email = createEventReminderEmail(upcomingSession);
  const result = await Promise.allSettled(recipients.map((to) => sendEmail({ to, ...email, emailType: "course_session_reminder" })));
  const sent = result.filter((item) => item.status === "fulfilled").length;
  return { sessionId: upcomingSession.id, sessionTitle: upcomingSession.title, activeLearners: activeEnrollments.length, sent, failed: recipients.length - sent };
}
