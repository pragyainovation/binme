import { getMessaging, isSupported } from "firebase/messaging";
import { firebaseApp } from "./client";

export async function getBrowserMessaging() {
  if (typeof window === "undefined" || !(await isSupported())) return null;
  return getMessaging(firebaseApp);
}
