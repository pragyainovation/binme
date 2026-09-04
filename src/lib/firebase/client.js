import { getApp, getApps, initializeApp } from "firebase/app";
import { firebaseClientConfig } from "@/lib/config/env.client";

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseClientConfig);
