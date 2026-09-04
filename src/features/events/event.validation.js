export function validateEvent(input) {
  if (!input?.title?.trim()) throw new Error("Event title is required.");
  if (!input?.date || !input?.time) throw new Error("Event date and time are required.");
  return input;
}
