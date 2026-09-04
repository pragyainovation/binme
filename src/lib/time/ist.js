const IST_TIME_ZONE = "Asia/Kolkata";
export const IST_TIMEZONE = IST_TIME_ZONE;

export function parseTimeInput(time) {
  const value = String(time || "").trim().toUpperCase();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  const match = value.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)$/);
  if (!match) return null;
  let hours = Number(match[1]);
  if (match[3] === "AM" && hours === 12) hours = 0;
  if (match[3] === "PM" && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function formatTimeIST(time) {
  if (!time) return "-";
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time;
  const date = new Date(`1970-01-01T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { timeZone: IST_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(date).replace(/\s(am|pm)$/i, (_, meridiem) => ` ${meridiem.toUpperCase()}`);
}

export function formatDateIST(date) {
  const value = String(date || "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value || "-";
}

export function parseISTDate(date, time) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isSessionJoinable(session, now = Date.now()) {
  const startDate = parseISTDate(session?.date, session?.time);
  const durationMinutes = Number(session?.duration || 0);
  if (!startDate || durationMinutes <= 0) return false;
  return now >= startDate.getTime() - 5 * 60000 && now <= startDate.getTime() + durationMinutes * 60000;
}
