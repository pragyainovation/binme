"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth } from "@/lib/firebase/client-auth";
import { getUserProfile } from "@/features/users/user.repository";
import PasswordChangeForm from "./PasswordChangeForm";
import { disablePushNotifications, enablePushNotifications } from "@/features/notifications/notification.client";

export default function ProfileSecurityTabs({ admin = false }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(browserAuth, async (user) => {
      if (!user) return setProfile(null);
      const savedProfile = await getUserProfile(user.uid);
      setProfile({ name: savedProfile?.name || user.displayName || "—", email: user.email || "—", mobile: savedProfile?.mobile || "—" });
      setNotificationsEnabled(savedProfile?.pushNotificationsEnabled ?? ("Notification" in window && Notification.permission === "granted"));
    });
    return () => unsubscribe();
  }, []);

  const toggleNotifications = async () => {
    const user = browserAuth.currentUser;
    if (!user) return;
    setNotificationBusy(true);
    setNotificationError("");
    try {
      if (notificationsEnabled) {
        await disablePushNotifications(user);
        setNotificationsEnabled(false);
      } else {
        if (!("Notification" in window)) throw new Error("This browser does not support notifications.");
        if (Notification.permission === "denied") throw new Error("Notifications are blocked in your browser. Enable them from browser site settings to turn them on.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission was not allowed.");
        await enablePushNotifications(user);
        setNotificationsEnabled(true);
      }
    } catch (error) {
      setNotificationError(error.message || "Unable to update notification settings.");
    } finally {
      setNotificationBusy(false);
    }
  };

  return <main className="profile-page"><section className="profile-card">
    <p className="profile-eyebrow">{admin ? "Admin account" : "Account settings"}</p>
    <h1>Profile & security</h1>
    <div className="profile-tabs" role="tablist" aria-label="Profile settings">
      <button type="button" role="tab" aria-selected={activeTab === "profile"} className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
      <button type="button" role="tab" aria-selected={activeTab === "security"} className={activeTab === "security" ? "active" : ""} onClick={() => setActiveTab("security")}>Security</button>
      <button type="button" role="tab" aria-selected={activeTab === "notifications"} className={activeTab === "notifications" ? "active" : ""} onClick={() => setActiveTab("notifications")}>Notifications</button>
    </div>
    {activeTab === "profile" ? <section className="profile-details" aria-label="Profile details">
      <p><span>Name</span><strong>{profile?.name || "Loading..."}</strong></p>
      <p><span>Email</span><strong>{profile?.email || "Loading..."}</strong></p>
      <p><span>Mobile number</span><strong>{profile?.mobile || "Loading..."}</strong></p>
    </section> : activeTab === "security" ? <section><p className="profile-tab-copy">Set a new password for your Firebase account.</p><PasswordChangeForm loginPath={admin ? "/admin/login" : "/login"} /></section> : <section className="profile-details" aria-label="Notification settings">
      <p><span>Event reminders</span><strong>{notificationsEnabled ? "On" : "Off"}</strong></p>
      <p className="profile-tab-copy">Get browser reminders when your registered event is about to begin.</p>
      {notificationError ? <p role="alert" className="profile-tab-copy" style={{ color: "#b42318" }}>{notificationError}</p> : null}
      <button type="button" role="switch" aria-checked={notificationsEnabled} onClick={toggleNotifications} disabled={notificationBusy} className="dashboard-logout" style={{ marginTop: 12 }}>
        {notificationBusy ? "Saving..." : notificationsEnabled ? "Turn notifications off" : "Turn notifications on"}
      </button>
    </section>}
  </section></main>;
}
