"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth } from "@/lib/firebase/client-auth";
import { getUserProfile } from "@/features/users/user.repository";
import PasswordChangeForm from "./PasswordChangeForm";

export default function ProfileSecurityTabs({ admin = false }) {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(browserAuth, async (user) => {
      if (!user) return setProfile(null);
      const savedProfile = await getUserProfile(user.uid);
      setProfile({ name: savedProfile?.name || user.displayName || "—", email: user.email || "—", mobile: savedProfile?.mobile || "—" });
    });
    return () => unsubscribe();
  }, []);

  return <main className="profile-page"><section className="profile-card">
    <p className="profile-eyebrow">{admin ? "Admin account" : "Account settings"}</p>
    <h1>Profile & security</h1>
    <div className="profile-tabs" role="tablist" aria-label="Profile settings">
      <button type="button" role="tab" aria-selected={activeTab === "profile"} className={activeTab === "profile" ? "active" : ""} onClick={() => setActiveTab("profile")}>Profile</button>
      <button type="button" role="tab" aria-selected={activeTab === "security"} className={activeTab === "security" ? "active" : ""} onClick={() => setActiveTab("security")}>Security</button>
    </div>
    {activeTab === "profile" ? <section className="profile-details" aria-label="Profile details">
      <p><span>Name</span><strong>{profile?.name || "Loading..."}</strong></p>
      <p><span>Email</span><strong>{profile?.email || "Loading..."}</strong></p>
      <p><span>Mobile number</span><strong>{profile?.mobile || "Loading..."}</strong></p>
    </section> : <section><p className="profile-tab-copy">Set a new password for your Firebase account.</p><PasswordChangeForm loginPath={admin ? "/admin/login" : "/login"} /></section>}
  </section></main>;
}
