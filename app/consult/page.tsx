import Link from "next/link";

export const metadata = {
  title: "Consulting Platform – Ableverse",
  description:
    "Evaluate, improve, and certify the accessibility of your spaces and digital products.",
};

export default function ConsultPage() {
  return (
    <>
      <header className="hero" id="main-content">
        <div className="container">
          <h1 className="hero__title">Accessibility Design Consulting</h1>
          <p className="hero__subtitle">
            Evaluate, improve, and certify the accessibility of your spaces and digital products.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn--primary">Check Your Score</Link>
            <Link href="/services/audit-request" className="btn btn--primary">Book a Consultation</Link>
          </div>
        </div>
      </header>

      <main>
        <section style={{ padding: "40px 20px", textAlign: "center" }}>
          <h2>What We Do</h2>
          <p style={{ maxWidth: 640, margin: "0 auto 32px" }}>
            We help businesses make their physical spaces and digital products accessible to everyone,
            building trust and inclusivity through audits, improvements, and certifications.
          </p>

          <div className="consult-pillars">
            <div className="consult-pillar">
              <h3>Audit</h3>
              <p>Assess your current accessibility levels with expert evaluations.</p>
            </div>
            <div className="consult-pillar">
              <h3>Improve</h3>
              <p>Get tailored plans to enhance accessibility features.</p>
            </div>
            <div className="consult-pillar">
              <h3>Verify</h3>
              <p>Earn badges like &ldquo;Just Verified&rdquo; or &ldquo;Verified+&rdquo; to showcase your commitment.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
