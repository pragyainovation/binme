import Link from "next/link";

export const metadata = {
  title: "How to Register | BinMe",
  description: "Watch a quick guide to registering with BinMe.",
};

export default function HowToRegisterPage() {
  return (
    <main className="registration-guide-page">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Main navigation">
          <Link className="brand" href="/" aria-label="BinMe home">
            <span>Bin</span>Me<span className="brand-dot">.</span>
          </Link>
          <div className="guide-nav-actions">
            <Link className="guide-home-link" href="/">Home</Link>
            <Link className="button button-dark" href="/signup">Register now</Link>
          </div>
        </nav>
      </header>

      <section className="registration-guide section">
        <div className="container registration-guide-content">
          <p className="eyebrow orange"><span>✦</span> Quick video guide</p>
          <h1>How to <em>register</em> with BinMe</h1>
          <p className="registration-guide-copy">
            Watch this short video to see how to create your account and get started.
          </p>

          <div className="registration-video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/uNO9RWQQnpI"
              title="How to register with BinMe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <Link className="button button-lime registration-guide-cta" href="/signup">
            Create your account
          </Link>
        </div>
      </section>
    </main>
  );
}
