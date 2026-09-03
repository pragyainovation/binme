"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/config";
import {
  claimFreeWebinarRegistrations,
  getFreeWebinar,
  getUserProfile,
  registerForFreeWebinar,
} from "../../firebase/firestore";
import { formatTimeIST, isSessionJoinable, parseISTDate } from "../../firebase/time";

export default function FreeWebinarDetailPage() {
  const [webinar, setWebinar] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      try {
        const [webinarData, userProfile, registrations] = await Promise.all([
          getFreeWebinar(),
          getUserProfile(currentUser.uid),
          claimFreeWebinarRegistrations(currentUser),
        ]);
        if (!active) return;

        setUser(currentUser);
        setProfile(userProfile);
        setWebinar(webinarData);
        setRegistration(registrations.find((item) => item.webinarId === webinarData?.id) || null);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleRegister = async () => {
    if (!user || !webinar) return;
    setRegistering(true);
    setMessage("");

    try {
      const result = await registerForFreeWebinar(webinar.id, {
        name: profile?.name || user.displayName || "",
        email: user.email || "",
        mobile: profile?.mobile || "",
        userId: user.uid,
      });
      setRegistration({ webinarId: webinar.id });
      setMessage(result.alreadyRegistered ? "Already Registered" : "Registration successful.");
    } catch (registrationError) {
      setMessage(registrationError.message || "Unable to complete registration.");
    } finally {
      setRegistering(false);
    }
  };

  const webinarTiming = useMemo(() => {
    if (!webinar?.date || !webinar?.time || !webinar?.duration) return false;
    const startDate = parseISTDate(webinar.date, webinar.time);
    if (!startDate) return false;
    const startMs = startDate.getTime();
    const endMs = startMs + Number(webinar.duration) * 60000;
    const now = Date.now();
    return {
      ended: now > endMs,
      running: now >= startMs && now <= endMs,
    };
  }, [webinar, now]);
  const webinarEnded = webinarTiming?.ended ?? false;

  const showJoinButton = Boolean(
    isSessionJoinable(webinar) &&
    webinar?.meetLink &&
    registration
  );

  if (loading) return <div style={{ padding: 40 }}>Loading session...</div>;
  if (!webinar) return <div style={{ padding: 40 }}>Free webinar not found.</div>;

  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <div style={styles.brand}>BinMe</div>
        <p style={styles.eyebrow}>Free Webinar</p>
        <h1 style={styles.title}>{webinar.title}</h1>

        <div style={styles.metaGrid}>
          <div><strong>Date</strong><p>{webinar.date}</p></div>
          <div><strong>Time</strong><p>{formatTimeIST(webinar.time)} IST</p></div>
          <div><strong>Duration</strong><p>{webinar.duration} Minutes</p></div>
        </div>

        <p style={styles.description}>{webinar.description}</p>

        {webinarEnded ? (
          <div style={styles.endedBox}>Session Ended</div>
        ) : showJoinButton ? (
          <div style={styles.noticeBox}>
            <strong>Session is about to start.</strong>
            <p>Join the live meeting now.</p>
          </div>
        ) : null}

        {!webinarEnded && !registration ? (
          <button onClick={handleRegister} disabled={registering} style={styles.button}>
            {registering ? "Registering..." : "Register Now"}
          </button>
        ) : (
          <div style={styles.successBox}>
            <strong>✓ You are registered</strong>
            <p>Date: {webinar.date}</p>
            <p>Time: {formatTimeIST(webinar.time)} IST</p>
            {showJoinButton ? (
              <a href={webinar.meetLink} target="_blank" rel="noreferrer" style={styles.linkButton}>Join Google Meet</a>
            ) : null}
          </div>
        )}

        {message ? <p style={styles.message}>{message}</p> : null}
      </article>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f7f0e7, #eef8ff)",
    padding: "50px 20px",
  },
  brand: { marginBottom: 8, fontSize: 24, fontWeight: 900, letterSpacing: -0.08, color: "#17211f" },
  card: { maxWidth: 900, margin: "0 auto", background: "#fff", borderRadius: 22, padding: 28, boxShadow: "0 18px 45px rgba(22, 34, 31, 0.08)" },
  eyebrow: { color: "#ff764d", fontWeight: 800, letterSpacing: 1.3, margin: 0 },
  title: { fontSize: 42, margin: "10px 0 18px", letterSpacing: -1.2 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 18 },
  description: { lineHeight: 1.7, color: "#4f5a56", fontSize: 16 },
  noticeBox: { marginTop: 16, background: "#fff7df", border: "1px solid #f0d98d", borderRadius: 12, padding: "14px 16px", color: "#5d4a1d" },
  endedBox: { marginTop: 16, background: "#f7e7e7", border: "1px solid #d8a8a8", borderRadius: 12, padding: "14px 16px", color: "#7a2a2a", fontWeight: 800 },
  button: { background: "#16211f", color: "#fff", border: 0, borderRadius: 12, padding: "14px 18px", fontWeight: 800, marginTop: 18, cursor: "pointer" },
  linkButton: { display: "inline-block", background: "#d9f95d", color: "#16211f", borderRadius: 10, padding: "12px 16px", fontWeight: 800, marginTop: 18, marginRight: 12, textDecoration: "none" },
  successBox: { marginTop: 20, background: "#eafaf1", padding: 18, borderRadius: 12 },
  message: { marginTop: 18, color: "#0d6b36", fontWeight: 700 },
};
