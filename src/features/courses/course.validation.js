export function validateCourse(input) {
  if (!input?.title?.trim()) throw new Error("Course title is required.");
  if (!input?.description?.trim()) throw new Error("Course description is required.");
  if (!["free", "paid"].includes(input.accessType)) throw new Error("Choose free or paid access.");
  if (input.accessType === "paid" && Number(input.price) <= 0) throw new Error("Enter a valid course price.");
  if (input.accessType === "paid" && (!Number.isInteger(Number(input.validityDays)) || Number(input.validityDays) < 1)) throw new Error("Enter a validity period of at least one day.");
  return input;
}
