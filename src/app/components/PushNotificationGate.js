"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/config";
import { logout } from "../firebase/auth";
import { enablePushNotifications } from "../firebase/push";

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
      } else if (currentPermission === "default") {
        try {
          const nextPermission = await Notification.requestPermission();
          setPermission(nextPermission);
          if (nextPermission === "granted") {
            await enablePushNotifications(currentUser);
          } else {
            setError("Notifications are required to access the dashboard. Allow them in your browser settings, then try again.");
          }
        } catch (setupError) {
          setPermission("error");
          setError(setupError.message || "Unable to request notification permission.");
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
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        setError("Notifications are required to access the dashboard. Allow them in your browser settings, then reload this page.");
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

  const handleLogout = async () => {
    await logout();
    window.location.assign("/");
  };

  if (checking) return <div style={styles.center}>Checking notification access...</div>;
  if (permission === "granted") return children;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon} aria-hidden="true">!</div>
        <p style={styles.eyebrow}>One required permission</p>
          <h1 style={styles.title}>Turn on notifications</h1>
        <p style={styles.copy}>
          BinMe uses browser notifications for updates about webinars and sessions you register for. Enable notifications to continue to your dashboard.
        </p>
        {error ? <p role="alert" style={styles.error}>{error}</p> : null}
        <button type="button" onClick={handleEnable} disabled={enabling} style={styles.button}>
          {enabling ? "Enabling..." : "Enable notifications"}
        </button>
        <button type="button" onClick={handleLogout} style={styles.logout}>Log out</button>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #f7f0e7, #eef8ff)", padding: 24 },
  card: { width: "100%", maxWidth: 520, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 18px 45px rgba(22, 34, 31, 0.1)" },
  icon: { width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: "50%", background: "#d9f95d", color: "#16211f", fontWeight: 900, fontSize: 24 },
  eyebrow: { margin: "20px 0 8px", color: "#ff764d", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 },
  title: { margin: 0, color: "#17211f", fontSize: 34 },
  copy: { color: "#53615f", lineHeight: 1.6, margin: "14px 0 22px" },
  error: { color: "#b42318", fontWeight: 600, lineHeight: 1.5 },
  button: { width: "100%", border: 0, borderRadius: 10, padding: "14px 18px", background: "#16211f", color: "#fff", fontWeight: 800, cursor: "pointer" },
  logout: { display: "block", margin: "16px auto 0", border: 0, background: "transparent", color: "#53615f", cursor: "pointer" },
  center: { padding: 32, textAlign: "center" },
};
