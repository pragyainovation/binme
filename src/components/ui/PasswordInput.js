"use client";

import { useState } from "react";

export default function PasswordInput({ inputStyle, ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input-wrap">
    <input {...props} type={visible ? "text" : "password"} style={inputStyle} />
    <button type="button" className="password-visibility-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide password" : "Show password"} title={visible ? "Hide password" : "Show password"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{visible ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.3 5.2 9.8 6-.4.8-1.8 2.8-4 4.2" /><path d="M6.2 6.2C4 7.6 2.6 9.6 2.2 10c.5.8 4.3 6 9.8 6 1.3 0 2.5-.3 3.5-.7" /></> : <><path d="M2.2 12S6 6 12 6s9.8 6 9.8 6-3.8 6-9.8 6S2.2 12 2.2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg>
    </button>
  </span>;
}
