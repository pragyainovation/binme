import { getFirestore } from "firebase/firestore";
import { firebaseApp } from "./client";

export const browserDb = getFirestore(firebaseApp);
