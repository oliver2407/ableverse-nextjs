import Link from "next/link";

export const metadata = {
  title: "Our Services – Ableverse",
  description: "Digital audits, physical space audits, and accessibility training for businesses.",
};

export default function ServicesPage() {
  return (
    <>
      <header className="hero" id="main-content">
        <div className="container">
          <h1 className="hero__title">Our Services</h1>
          <p className="hero__subtitle">
            Helping businesses make their spaces and digital products accessible to everyone.
          </p>
        </div>
      </header>

      <main>
        <div className="pillars">
          <div className="pillar">
            <h3>Digital Audit</h3>
            <p>
              Comprehensive WCAG 2.2 AA evaluation of websites, mobile apps, and PDFs.
              We identify barriers and provide a prioritised remediation roadmap.
            </p>
            <Link href="/services/audit-request" className="btn btn--primary">
              Request Audit
            </Link>
          </div>

          <div className="pillar">
            <h3>Physical Audit</h3>
            <p>
              On-site or remote assessment of buildings, restaurants, retail stores, and public venues.
              Covers mobility, vision, and hearing accessibility.
            </p>
            <Link href="/services/audit-request" className="btn btn--primary">
              Request Audit
            </Link>
          </div>

          <div className="pillar">
            <h3>Training</h3>
            <p>
              Staff workshops on disability awareness, inclusive service, and assistive technology —
              delivered in English or Vietnamese.
            </p>
            <Link href="/services/audit-request" className="btn btn--primary">
              Book Training
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
