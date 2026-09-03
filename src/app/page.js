"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import { getFreeWebinar, getUserProfile, registerForFreeWebinar } from "./firebase/firestore";
import { formatTimeIST } from "./firebase/time";

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [webinar, setWebinar] = useState(null);
  const [webinarLoading, setWebinarLoading] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState("");
  const [registrationForm, setRegistrationForm] = useState({ name: "", email: "", mobile: "" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      const profile = await getUserProfile(user.uid);
      if (profile?.role === "user") {
        router.replace("/dashboard");
        return;
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    getFreeWebinar()
      .then(setWebinar)
      .catch(() => setWebinar(null))
      .finally(() => setWebinarLoading(false));
  }, []);

  const register = () => {
    router.push("/signup");
  };

  const openWebinarRegistration = () => {
    setNotice("");
    setRegistrationError("");
    setRegistrationOpen(true);
  };

  const handleRegistrationChange = (event) => {
    const { name, value } = event.target;
    setRegistrationForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault();
    if (!webinar) return;

    setRegistrationLoading(true);
    setRegistrationError("");
    try {
      const result = await registerForFreeWebinar(webinar.id, registrationForm);
      setRegistrationOpen(false);
      setRegistrationForm({ name: "", email: "", mobile: "" });
      setNotice(result.alreadyRegistered ? "You are already registered for this webinar." : "You are registered. See you at the webinar!");
    } catch (submitError) {
      setRegistrationError(submitError.message || "Unable to complete registration.");
    } finally {
      setRegistrationLoading(false);
    }
  };

  const goToLogin = () => router.push("/login");

  if (checkingAuth) {
    return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f1e8" }}>Checking session...</main>;
  }

  return (
    <main>
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Main navigation">
          <a className="brand" href="#top" aria-label="BinMe home">
            <span>Bin</span>Me<span className="brand-dot">.</span>
          </a>

          <button
            type="button"
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? "×" : "☰"}
          </button>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="/login">Login</a>
            <a href="/signup">Register</a>
            <a href="#why">Why BinMe</a>
            <a href="#webinar">Free Webinar</a>
            <a href="#stories">Success Stories</a>
            <a href="#about">About us</a>
          </div>

          <div className="nav-actions">
            <button type="button" className="login" onClick={goToLogin}>Log in</button>
            <button type="button" className="button button-dark" onClick={register}>
              Start learning <Arrow />
            </button>
          </div>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="sparkle">✦</span> Your English era starts here
            </p>
            <h1>
              Speak English
              <br />
              <em>with ease.</em>
            </h1>
            <p className="hero-text">
              Build the confidence to speak up, connect deeply, and show the world what you&apos;re capable of.
            </p>

            <div className="hero-buttons">
              <a  className="button button-lime" href="#webinar">
                Join the free webinar <Arrow />
              </a>
              <a className="text-link" href="#why">
                Explore how it works <span>↓</span>
              </a>
            </div>

            <div className="social-proof">
              <div className="avatars" aria-label="Customer community">
                <i>RM</i>
                <i>AS</i>
                <i>NK</i>
                <i>+</i>
              </div>
              <p>
                <strong>10,000+ learners</strong>
                <br />
                finding their voice
              </p>
            </div>
          </div>

          <div className="hero-art" aria-label="Online English speaking class illustration">
            <div className="sun" />
            <div className="orange-shape" />
            <div className="purple-shape" />

            <div className="person">
              <div className="hair" />
              <div className="head">
                <span className="eye left" />
                <span className="eye right" />
                <span className="smile" />
              </div>
              <div className="neck" />
              <div className="body">
                <div className="shirt-line" />
              </div>
              <div className="hand" />
            </div>

            <div className="bubble bubble-top">
              <span className="mic">◖</span>
              <div>
                <b>Let&apos;s speak!</b>
                <small>You&apos;re doing great</small>
              </div>
            </div>

            <div className="bubble bubble-bottom">
              <span className="bubble-check">✓</span>
              <div>
                <b>Beautiful sentence!</b>
                <small>Keep going</small>
              </div>
            </div>

            <div className="word-card">
              hello<span>!</span>
            </div>
            <span className="float-star star-a">✦</span>
            <span className="float-star star-b">✦</span>
          </div>
        </div>

        <div className="marquee" aria-label="Brand message ticker">
          <div className="marquee-track">
            <span>SPEAK FREELY</span>
            <b>✦</b>
            <span>GROW CONFIDENTLY</span>
            <b>✦</b>
            <span>CONNECT GLOBALLY</span>
            <b>✦</b>
            <span>SPEAK FREELY</span>
            <b>✦</b>
            <span>GROW CONFIDENTLY</span>
            <b>✦</b>
            <span>CONNECT GLOBALLY</span>
            <b>✦</b>
          </div>
        </div>
      </section>

      <section className="benefits section" id="why">
        <div className="container">
          <p className="eyebrow orange">
            <span>✦</span> Made for real life
          </p>

          <div className="section-heading">
            <h2>
              English that fits <em>your world.</em>
            </h2>
            <p>
              No boring grammar drills. Just practical, confidence-building English for the moments that matter.
            </p>
          </div>

          <div className="benefit-grid">
            <Card number="01" kind="peach" icon="☷" title="Speak from day one" text="Small, friendly conversations that get you talking right away." />
            <Card number="02" kind="lilac" icon="✺" title="Grow your confidence" text="A supportive space to make mistakes, learn, and shine." />
            <Card number="03" kind="mint" icon="◌" title="Use it in real life" text="From job interviews to travel chats — be ready for anything." />
          </div>
        </div>
      </section>

      <section className="webinar-section section" id="webinar">
        <div className="container webinar-box">
          <div className="webinar-visual">
            <div className="mini-sun" />
            <div className="speech big-speech">I can do this!</div>
            <div className="webinar-person">
              <div className="wp-head" />
              <div className="wp-body" />
            </div>
            <div className="tiny-bubble">hello!</div>
          </div>

          <div className="webinar-content">
            {webinarLoading ? <p className="notice" role="status">Loading free webinar...</p> : !webinar ? (
              <>
                <p className="eyebrow"><span className="sparkle">✦</span> Live &amp; completely free</p>
                <h2>No free webinar is currently available.</h2>
              </>
            ) : (
              <>
            <p className="eyebrow">
              <span className="sparkle">✦</span> Live &amp; completely free
            </p>
            <h2>
              {webinar.title}
              <br />
              <em>speaking freely.</em>
            </h2>
            <p>{webinar.description}</p>

            <div className="event-details">
              <div>
                <span>Date</span>
                <b>{webinar.date}</b>
              </div>
              <div>
                <span>Time</span>
                <b>{formatTimeIST(webinar.time)} IST</b>
              </div>
              <div>
                <span>Duration</span>
                <b>{webinar.duration} minutes</b>
              </div>
            </div>

            <button type="button" className="button button-lime" onClick={openWebinarRegistration}>
              Reserve my free spot <Arrow />
            </button>
              </>
            )}

            {notice && <p className="notice" role="status">{notice}</p>}
          </div>
        </div>
      </section>

      {registrationOpen && webinar && (
        <div className="webinar-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setRegistrationOpen(false)}>
          <section className="webinar-modal" role="dialog" aria-modal="true" aria-labelledby="webinar-registration-title">
            <button type="button" className="webinar-modal-close" aria-label="Close registration" onClick={() => setRegistrationOpen(false)}>×</button>
            <p className="eyebrow orange">Free webinar</p>
            <h2 id="webinar-registration-title">Reserve your spot.</h2>
            <p>Tell us where to send your webinar details.</p>
            <form className="webinar-registration-form" onSubmit={handleRegistrationSubmit}>
              <label>Name<input name="name" value={registrationForm.name} onChange={handleRegistrationChange} required /></label>
              <label>Email<input name="email" type="email" value={registrationForm.email} onChange={handleRegistrationChange} required /></label>
              <label>Mobile Number<input name="mobile" type="tel" value={registrationForm.mobile} onChange={handleRegistrationChange} required /></label>
              {registrationError && <p className="notice error" role="alert">{registrationError}</p>}
              <button type="submit" className="button button-dark" disabled={registrationLoading}>
                {registrationLoading ? "Registering..." : "Register for free"}
              </button>
            </form>
          </section>
        </div>
      )}

      <section className="story section" id="stories">
        <div className="container story-grid">
          <div>
            <p className="eyebrow orange">
              <span>✦</span> Real people, real growth
            </p>
            <h2>
              “I stopped translating
              <br />
              in my head. I just <em>speak.</em>”
            </h2>
            <p className="quote-text">
              BinMe made English feel less like a subject and more like a superpower. Now I speak up in every meeting.
            </p>
            <div className="quote-person">
              <span>PV</span>
              <p>
                <b>Priya Verma</b>
                <br />
                Product Designer, Bengaluru
              </p>
            </div>
          </div>

          <aside className="stat-panel">
            <div>
              <b>4.9<span>/5</span></b>
              <p>average learner rating</p>
            </div>
            <hr />
            <div>
              <b>92<span>%</span></b>
              <p>feel more confident in 30 days</p>
            </div>
            <hr />
            <div className="stars">★★★★★</div>
          </aside>
        </div>
      </section>

      <section className="about-section section" id="about">
        <div className="container about-shell">
          <div className="about-intro">
            <p className="eyebrow orange">
              <span>✦</span> About BinMe
            </p>
            <h2>About BinMe</h2>
            <p>
              BinMe is a friendly online platform focused on helping learners improve their spoken English, build confidence, and communicate more freely in everyday life.
            </p>
            <a className="button button-dark about-cta" href="#webinar">
              Join BinMe <Arrow />
            </a>
          </div>

          <div className="about-grid">
            <article className="about-card about-card-peach">
              <span className="about-card-icon">✦</span>
              <h3>Speak with Confidence</h3>
              <p>Improve your communication skills through practical speaking practice.</p>
            </article>

            <article className="about-card about-card-lilac">
              <span className="about-card-icon">◌</span>
              <h3>Learn in a Friendly Environment</h3>
              <p>Learn without pressure and feel comfortable while speaking.</p>
            </article>

            <article className="about-card about-card-mint">
              <span className="about-card-icon">✓</span>
              <h3>Connect Globally</h3>
              <p>Build English skills that help you communicate with people around the world.</p>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div className="container footer-inner">
          <a className="brand" href="#top">
            <span>Bin</span>Me<span className="brand-dot">.</span>
          </a>
          <p>Made for brave voices everywhere.</p>
          <div>
            <a href="#top">Instagram</a>
            <a href="#top">LinkedIn</a>
            <a href="#top">YouTube</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Card({ number, kind, icon, title, text }) {
  return (
    <article className={`benefit-card ${kind}`}>
      <span className="card-number">{number}</span>
      <div className="icon-talk">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      <a href="#webinar">
        Learn more <Arrow />
      </a>
    </article>
  );
}
