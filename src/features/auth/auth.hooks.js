import { onAuthStateChanged } from "firebase/auth";
import { browserAuth } from "@/lib/firebase/client-auth";
export const subscribeToAuth = (callback) => onAuthStateChanged(browserAuth, callback);
