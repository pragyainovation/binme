import { browserAuth } from "@/lib/firebase/client-auth";

export async function emailActiveUsers({ subject, message }) {
  const user = browserAuth.currentUser;
  if (!user) throw new Error("You must be signed in as an admin.");
  const response = await fetch("/api/admin/users/email-active", {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ subject, message }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to send email.");
  return result;
}