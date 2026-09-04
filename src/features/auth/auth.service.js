import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword } from "firebase/auth";
import { browserAuth } from "@/lib/firebase/client-auth";
import { createUserProfile } from "@/features/users/user.repository";
import { claimEventRegistrations } from "@/features/registrations/registration.repository";

export async function signUpWithEmail({ name, email, password, mobile }) {
  const credential = await createUserWithEmailAndPassword(browserAuth, email, password);
  await createUserProfile(credential.user, { name, email, mobile, role: "user" });
  await claimEventRegistrations(credential.user);
  return credential.user;
}

export async function loginWithEmail(email, password) {
  const user = (await signInWithEmailAndPassword(browserAuth, email, password)).user;
  await claimEventRegistrations(user);
  return user;
}

export async function logout() {
  await signOut(browserAuth);
}

export async function changeCurrentUserPassword(newPassword) {
  const user = browserAuth.currentUser;
  if (!user) throw new Error("Please sign in again before changing your password.");
  if (newPassword.length < 8) throw new Error("Use at least 8 characters for your new password.");
  try {
    await updatePassword(user, newPassword);
    // End the current session so the next authentication must use the new password.
    await signOut(browserAuth);
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      throw new Error("For security, sign out and sign in again, then change your password. Your old password is not required in this form.");
    }
    throw error;
  }
}
