import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./config";
import { createUserProfile, getUserProfile } from "./firestore";

export async function signUpWithEmail({ name, email, password, mobile }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await createUserProfile(user, {
    name,
    email,
    mobile,
    role: "user",
    createdAt: new Date().toISOString(),
  });

  return user;
}

export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logout() {
  await firebaseSignOut(auth);
}

export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getCurrentUserRole() {
  const user = auth.currentUser;
  if (!user) return null;

  const profile = await getUserProfile(user.uid);
  return profile?.role || null;
}
