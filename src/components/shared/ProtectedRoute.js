"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { getUserProfile } from "@/features/users/user.repository";

export default function ProtectedRoute({ children, requiredRole = null, redirectTo = "/" }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace(redirectTo);
        setReady(true);
        setAllowed(false);
        return;
      }

      if (requiredRole) {
        const profile = await getUserProfile(user.uid);
        const hasAccess = profile?.role === requiredRole;
        setAllowed(hasAccess);
        setReady(true);

        if (!hasAccess) {
          router.replace(requiredRole === "admin" ? "/admin/login" : "/");
        }
        return;
      }

      setAllowed(true);
      setReady(true);
    });

    return () => unsubscribe();
  }, [redirectTo, requiredRole, router]);

  if (!ready) {
    return <div style={{ padding: 32, textAlign: "center" }}>Checking access...</div>;
  }

  if (!allowed) {
    return <div style={{ padding: 32, textAlign: "center" }}>Access denied.</div>;
  }

  return children;
}
