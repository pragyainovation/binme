import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { requiredServerEnv } from "@/lib/config/env.server";

function getAdminApp() {
  return getApps().length
    ? getApp()
    : initializeApp({ credential: cert({
      projectId: requiredServerEnv("FIREBASE_PROJECT_ID", ["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]),
      clientEmail: requiredServerEnv("FIREBASE_CLIENT_EMAIL", ["NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL"]),
      privateKey: requiredServerEnv("FIREBASE_PRIVATE_KEY", ["NEXT_PUBLIC_FIREBASE_PRIVATE_KEY"]).replace(/\\n/g, "\n"),
    }) });
}

// Keep credential validation request-time only. Next.js imports route modules during build.
export function getAdminServices() {
  const app = getAdminApp();
  return { adminAuth: getAuth(app), adminDb: getFirestore(app), adminMessaging: getMessaging(app) };
}
