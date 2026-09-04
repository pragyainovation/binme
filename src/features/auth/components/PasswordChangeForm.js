"use client";

import { useState } from "react";
import { changeCurrentUserPassword } from "../auth.service";
import PasswordInput from "@/components/ui/PasswordInput";

export default function PasswordChangeForm({ loginPath = "/login" }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) return setMessage("New password and confirmation must match.");
    setSaving(true);
    try {
      await changeCurrentUserPassword(password);
      setPassword(""); setConfirmPassword("");
      setMessage("Password changed successfully. Please sign in with your new password.");
      window.setTimeout(() => window.location.assign(loginPath), 900);
    } catch (error) { setMessage(error.message || "Unable to change password."); }
    finally { setSaving(false); }
  };

  return <form onSubmit={submit} className="profile-password-form">
    <label>New password<PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" autoComplete="new-password" required /></label>
    <label>Confirm new password<PasswordInput value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength="8" autoComplete="new-password" required /></label>
    <p className="profile-hint">Your old password is not required. Firebase may ask you to sign in again if this session is old.</p>
    {message ? <p role="status" className="profile-message">{message}</p> : null}
    <button type="submit" className="profile-submit" disabled={saving}>{saving ? "Updating..." : "Change password"}</button>
  </form>;
}
