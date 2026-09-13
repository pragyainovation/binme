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
