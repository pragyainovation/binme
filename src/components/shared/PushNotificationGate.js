"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { enablePushNotifications } from "@/features/notifications/notification.client";

export default function PushNotificationGate({ children }) {
  const [user, setUser] = useState(null);
  const [permission, setPermission] = useState("default");
  const [checking, setChecking] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) return;

      const currentPermission = "Notification" in window ? Notification.permission : "denied";
      setPermission(currentPermission);
      if (currentPermission === "granted") {
        try {
          await enablePushNotifications(currentUser);
        } catch (setupError) {
          setError(setupError.message || "Unable to configure push notifications.");
          setPermission("error");
        }
      }
      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    setError("");

    try {
      if (!("Notification" in window)) {
        setPermission("error");
        setError("This browser does not support notifications.");
        return;
      }
      if (Notification.permission === "denied") {
        setPermission("denied");
        setError("Notifications are blocked for this site. Enable them from the browser address-bar/site settings, then reload this page.");
        return;
      }
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission === "default") {
        setError("Notification permission was dismissed. Click Enable notifications again and choose Allow in the browser popup.");
        return;
      }
      if (nextPermission === "denied") {
        setError("Notifications were blocked. Enable them from the browser address-bar/site settings, then reload this page.");
        return;
      }
      await enablePushNotifications(user);
    } catch (setupError) {
      setPermission("error");
      setError(setupError.message || "Unable to configure push notifications.");
    } finally {
      setEnabling(false);
    }
  };

  if (checking || permission === "granted" || permission === "denied" || permission === "error") return children;

  return (
    <>
      {children}
      <aside style={styles.banner} role="status">
        <div>
          <strong style={styles.bannerTitle}>Stay updated about your events</strong>
          <span style={styles.bannerCopy}>Allow notifications to receive reminders for registered sessions.</span>
          {error ? <span role="alert" style={styles.error}>{error}</span> : null}
        </div>
        <button type="button" onClick={handleEnable} disabled={enabling} style={styles.button}>
          {enabling ? "Enabling..." : "Enable notifications"}
        </button>
      </aside>
    </>
  );
}

const styles = {
  banner: { position: "fixed", right: 20, bottom: 20, zIndex: 50, display: "flex", alignItems: "center", gap: 16, maxWidth: 540, padding: 16, borderRadius: 14, background: "#fff", boxShadow: "0 12px 35px rgba(22, 34, 31, 0.18)", border: "1px solid #dce5df" },
  bannerTitle: { display: "block", color: "#17211f", marginBottom: 4 },
  bannerCopy: { display: "block", color: "#53615f", lineHeight: 1.45 },
  error: { display: "block", color: "#b42318", fontWeight: 600, lineHeight: 1.45, marginTop: 8 },
  button: { flexShrink: 0, border: 0, borderRadius: 10, padding: "12px 16px", background: "#16211f", color: "#fff", fontWeight: 800, cursor: "pointer" },
};
