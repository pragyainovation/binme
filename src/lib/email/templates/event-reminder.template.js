function escapeHtml(value) {
  return String(value || "").replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

export function createEventReminderEmail({ title, date, time, meetLink }) {
  const eventTitle = title || "your BinMe event";
  const details = [date, time].filter(Boolean).join(" at ");
  const reminder = details ? `is scheduled for ${details} IST.` : "is about to begin.";

  return {
    subject: `Reminder: ${eventTitle}`,
    text: `Reminder: ${eventTitle} ${reminder}\n\nJoin the meeting: ${meetLink}`,
    html: `<main style="max-width:600px;margin:0 auto;padding:32px;font-family:Arial,sans-serif;color:#17211f"><h1 style="margin:0 0 20px;font-size:24px">BinMe event reminder</h1><p><strong>${escapeHtml(eventTitle)}</strong> ${escapeHtml(reminder)}</p><p style="margin:28px 0"><a href="${escapeHtml(meetLink)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#16211f;color:#ffffff;text-decoration:none;font-weight:700">Join Google Meet</a></p><p style="color:#53615f;font-size:14px">If the button does not work, use this link:<br><a href="${escapeHtml(meetLink)}">${escapeHtml(meetLink)}</a></p></main>`,
  };
}
