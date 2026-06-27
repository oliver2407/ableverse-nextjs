"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);
  const [invalid, setInvalid]     = useState(false);

  useEffect(() => {
    // If there is no code in the URL, the link is invalid/expired
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code")) {
      setInvalid(true);
      return;
    }

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Fallback: if exchange takes too long or link is stale
    const timer = setTimeout(() => setInvalid(true), 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    alert("Password updated. Please sign in with your new password.");
    router.push("/sign-in");
  };

  if (invalid && !ready) {
    return (
      <main className="account-page" id="main-content">
        <div className="container">
          <section className="account-hero">
            <div className="account-heading">
              <p className="account-kicker">Account Security</p>
              <h1>Link Invalid or Expired</h1>
              <p className="account-subtext">
                This password reset link is no longer valid.{" "}
                <a href="/sign-in" className="text-link">
                  Request a new one from the sign-in page.
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="account-page" id="main-content">
        <div className="container">
          <p style={{ color: "var(--color-text-muted)", padding: "2rem 0" }}>
            Verifying reset link…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page" id="main-content">
      <div className="container">
        <section className="account-hero">
          <div className="account-heading">
            <p className="account-kicker">Account Security</p>
            <h1>Set a New Password</h1>
          </div>
        </section>

        <div className="auth-layout">
          <article className="account-card">
            <div className="card-header"><h2>Reset Password</h2></div>

            {error && (
              <ul className="auth-errors" role="alert" aria-live="assertive">
                <li>{error}</li>
              </ul>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-form-fields">
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <input
                    type="password"
                    id="new-password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          </article>
        </div>
      </div>
    </main>
  );
}
