"use client";

import { useState } from "react";

export default function AuditRequestPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <header className="hero" id="main-content">
        <div className="container">
          <h1 className="hero__title">Request an Accessibility Audit</h1>
          <p className="hero__subtitle">
            Tell us about your space or product and we&apos;ll be in touch within 24 hours.
          </p>
        </div>
      </header>

      <main>
        {submitted ? (
          <div className="audit-form" role="alert" aria-live="polite">
            <h2>Request received!</h2>
            <p>Thank you. You&apos;ll receive an auto-confirmation email shortly.</p>
          </div>
        ) : (
          <>
            <form className="audit-form" onSubmit={handleSubmit}>
              <label htmlFor="name">Your Name *</label>
              <input className="input" id="name" type="text" required placeholder="Full name" />

              <label htmlFor="email">Email *</label>
              <input className="input" id="email" type="email" required placeholder="you@business.com" />

              <label htmlFor="business">Business Name</label>
              <input className="input" id="business" type="text" placeholder="Optional" />

              <label htmlFor="website">Website URL (if applicable)</label>
              <input className="input" id="website" type="url" placeholder="https://..." />

              <label htmlFor="audit-type">Type of Audit</label>
              <select id="audit-type" className="input">
                <option>Digital (Website / App)</option>
                <option>Physical Space</option>
                <option>Both</option>
              </select>

              <label htmlFor="files">Upload Photos / Sitemap / Files</label>
              <input className="input" id="files" type="file" multiple />

              <label htmlFor="message">Message</label>
              <textarea
                className="input textarea"
                id="message"
                rows={4}
                placeholder="Tell us about your needs..."
              />

              <button type="submit" className="btn btn--primary" style={{ marginTop: "1rem" }}>
                Submit Request
              </button>
            </form>
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "1rem" }}>
              You&apos;ll receive an auto-confirmation email immediately.
            </p>
          </>
        )}
      </main>
    </>
  );
}
