import { getAuth } from "firebase/auth";
import { firebaseApp } from "./client";

export const browserAuth = getAuth(firebaseApp);
