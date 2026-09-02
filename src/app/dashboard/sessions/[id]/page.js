"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../firebase/config";
import { getSessionById, isUserRegistered, registerForSession } from "../../../firebase/firestore";

export default function SessionDetailPage({ params }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    const load = async () => {
      const sessionId = params?.id;
      if (!sessionId) return;

      const found = await getSessionById(sessionId);
      setSession(found);

      const unsub = onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser) return;
        setUser(currentUser);

        const isRegistered = await isUserRegistered(currentUser.uid, sessionId);
        setAlreadyRegistered(isRegistered);
      });

      setLoading(false);
      return () => unsub();
    };

    load();
  }, [params]);

  const handleRegister = async () => {
    if (!user || !session) return;
    setRegistering(true);
    setMessage("");

    const result = await registerForSession(user.uid, session.id);
    if (result.alreadyRegistered) {
      setAlreadyRegistered(true);
      setMessage("Already Registered");
    } else {
      setAlreadyRegistered(true);
      setMessage("Registration successful.");
    }
    setRegistering(false);
  };

  const minutesUntilStart = useMemo(() => {
    if (!session?.date || !session?.time) return null;

    const startDate = new Date(`${session.date}T${session.time}`);
    if (Number.isNaN(startDate.getTime())) return null;

    return (startDate.getTime() - Date.now()) / 60000;
  }, [session]);

  const sessionEnded = useMemo(() => {
    if (!session?.date || !session?.time || !session?.duration) return false;

    const startDate = new Date(`${session.date}T${session.time}`);
    if (Number.isNaN(startDate.getTime())) return false;

    const endDate = new Date(startDate.getTime() + Number(session.duration) * 60000);
    return Date.now() > endDate.getTime();
  }, [session]);

  const showJoinButton = Boolean(
    !sessionEnded &&
    session?.meetLink &&
    alreadyRegistered &&
    minutesUntilStart !== null &&
    minutesUntilStart <= 5 &&
    minutesUntilStart >= 0
  );

  const showRegisterButton = !sessionEnded && !alreadyRegistered;

  if (loading) return <div style={{ padding: 40 }}>Loading session...</div>;
  if (!session) return <div style={{ padding: 40 }}>Session not found.</div>;

  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <div style={styles.brand}>BinMe</div>
        <p style={styles.eyebrow}>Webinar</p>
        <h1 style={styles.title}>{session.title}</h1>

        <div style={styles.metaGrid}>
          <div><strong>Date</strong><p>{session.date}</p></div>
          <div><strong>Time</strong><p>{session.time}</p></div>
          <div><strong>Duration</strong><p>{session.duration} Minutes</p></div>
        </div>

        <p style={styles.description}>{session.description}</p>

        {sessionEnded ? (
          <div style={styles.endedBox}>Session Ended</div>
        ) : showJoinButton ? (
          <div style={styles.noticeBox}>
            <strong>Session is about to start.</strong>
            <p>Join the live meeting now.</p>
          </div>
        ) : null}

        {showRegisterButton ? (
          <button onClick={handleRegister} disabled={registering} style={styles.button}>
            {registering ? "Registering..." : "Register Now"}
          </button>
        ) : (
          <div style={styles.successBox}>
            <strong>✓ You are registered</strong>
            <p>Date: {session.date}</p>
            <p>Time: {session.time}</p>
            {showJoinButton && session.meetLink ? (
              <a href={session.meetLink} target="_blank" rel="noreferrer" style={styles.linkButton}>Join Google Meet</a>
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
  brand: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: -0.08,
    color: "#17211f",
  },
  card: {
    maxWidth: 900,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 22,
    padding: 28,
    boxShadow: "0 18px 45px rgba(22, 34, 31, 0.08)",
  },
  eyebrow: { color: "#ff764d", fontWeight: 800, letterSpacing: 1.3, margin: 0 },
  title: { fontSize: 42, margin: "10px 0 18px", letterSpacing: -1.2 },
  metaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 18 },
  description: { lineHeight: 1.7, color: "#4f5a56", fontSize: 16 },
  noticeBox: {
    marginTop: 16,
    background: "#fff7df",
    border: "1px solid #f0d98d",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#5d4a1d",
  },
  endedBox: {
    marginTop: 16,
    background: "#f7e7e7",
    border: "1px solid #d8a8a8",
    borderRadius: 12,
    padding: "14px 16px",
    color: "#7a2a2a",
    fontWeight: 800,
  },
  button: {
    background: "#16211f",
    color: "#fff",
    border: 0,
    borderRadius: 12,
    padding: "14px 18px",
    fontWeight: 800,
    marginTop: 18,
    cursor: "pointer",
  },
  linkButton: {
    display: "inline-block",
    background: "#d9f95d",
    color: "#16211f",
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 800,
    marginTop: 18,
    marginRight: 12,
    textDecoration: "none",
  },
  successBox: { marginTop: 20, background: "#eafaf1", padding: 18, borderRadius: 12 },
  message: { marginTop: 18, color: "#0d6b36", fontWeight: 700 },
};
