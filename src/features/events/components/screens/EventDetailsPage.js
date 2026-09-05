"use client";

import { use, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { browserAuth as auth } from "@/lib/firebase/client-auth";
import { getSessionById, isUserRegistered, registerForSession } from "@/features";
import { formatDateIST, formatTimeIST, isSessionJoinable, parseISTDate } from "@/lib/time/ist";

export default function SessionDetailPage({ params }) {
  const { slug } = use(params);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      const sessionId = slug;
      if (!sessionId) return;

      try {
        const found = await getSessionById(sessionId);
        setSession(found);

        const eventId = found?.id || sessionId;
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
          if (!currentUser) {
            setAlreadyRegistered(localStorage.getItem(`binme:event:${eventId}`) === "registered");
            setLoading(false);
            return;
          }
          setUser(currentUser);

          const isRegistered = await isUserRegistered(currentUser.uid, eventId);
          setAlreadyRegistered(isRegistered || localStorage.getItem(`binme:event:${eventId}`) === "registered");
          setLoading(false);
        });

        return unsub;
      } catch (loadError) {
        setMessage(loadError.message || "Unable to load this event.");
        setLoading(false);
        return undefined;
      }
    };

    let unsubscribe;
    load().then((callback) => { unsubscribe = callback; });
    return () => unsubscribe?.();
  }, [slug]);

  const handleRegister = async () => {
    if (!user || !session) return;
    setRegistering(true);
    setMessage("");

    const result = await registerForSession(user.uid, session.id);
    if (result.alreadyRegistered) {
      setAlreadyRegistered(true);
      localStorage.setItem(`binme:event:${session.id}`, "registered");
      setMessage("Already Registered");
    } else {
      setAlreadyRegistered(true);
      localStorage.setItem(`binme:event:${session.id}`, "registered");
      setMessage("Registration successful.");
    }
    setRegistering(false);
  };

  const handlePayment = async () => {
    if (!user || !session) return;
    setPaying(true);
    setMessage("");
    try {
      const token = await user.getIdToken();
      const orderResponse = await fetch("/api/payments/razorpay/order", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id }) });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.error || "Unable to start payment.");
      await new Promise((resolve, reject) => {
        const existing = document.querySelector("script[src='https://checkout.razorpay.com/v1/checkout.js']");
        if (existing) return resolve();
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = resolve;
        script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
        document.body.appendChild(script);
      });
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({ key: order.keyId, amount: order.amount, currency: order.currency, name: "BinMe", description: session.title, order_id: order.orderId, handler: async (payment) => {
          try {
            const verifyResponse = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payment) });
            const result = await verifyResponse.json();
            if (!verifyResponse.ok) throw new Error(result.error || "Payment verification failed.");
            setAlreadyRegistered(Boolean(result.success));
            setMessage(result.success ? "Payment successful. You are registered." : (result.message || "Payment is being confirmed."));
            resolve();
          } catch (error) { reject(error); }
        }, modal: { ondismiss: resolve } });
        checkout.on("payment.failed", () => reject(new Error("Payment failed. Please try again.")));
        checkout.open();
      });
    } catch (error) {
      setMessage(error.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const sessionTiming = useMemo(() => {
    if (!session?.date || !session?.time || !session?.duration) return false;

    const startDate = parseISTDate(session.date, session.time);
    if (!startDate) return false;

    const startMs = startDate.getTime();
    const endMs = startMs + Number(session.duration) * 60000;
    const now = Date.now();
    return {
      ended: now > endMs,
      running: now >= startMs && now <= endMs,
    };
  }, [session, now]);
  const sessionEnded = sessionTiming?.ended ?? false;

  const showJoinButton = Boolean(
    isSessionJoinable(session) &&
    session?.status !== "cancelled" &&
    session?.meetLink &&
    alreadyRegistered
  );

  const showRegisterButton = !sessionEnded && !alreadyRegistered && session?.accessType !== "paid";
  const showPaymentButton = !sessionEnded && !alreadyRegistered && session?.accessType === "paid";

  if (loading) return <div style={{ padding: 40 }}>Loading session...</div>;
  if (!session) return <div style={{ padding: 40 }}>Session not found.</div>;

  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <div style={styles.brand}>BinMe</div>
        <p style={styles.eyebrow}>Webinar</p>
        <h1 style={styles.title}>{session.title}</h1>

        <div style={styles.metaGrid}>
          <div><strong>Date</strong><p>{formatDateIST(session.date)}</p></div>
          <div><strong>Time</strong><p>{formatTimeIST(session.time)} IST</p></div>
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
        ) : showPaymentButton ? (
          <button onClick={handlePayment} disabled={paying || !user} style={styles.button}>
            {paying ? "Opening payment..." : `Pay INR ${Number(session.price).toFixed(2)} and Register`}
          </button>
        ) : (
          <div style={styles.successBox}>
            <strong>✓ You are registered</strong>
            <p>Date: {formatDateIST(session.date)}</p>
            <p>Time: {formatTimeIST(session.time)} IST</p>
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
