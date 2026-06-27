"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let ok = true;
    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Please enter a valid email.");
      ok = false;
    } else {
      setEmailError("");
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      ok = false;
    } else {
      setPasswordError("");
    }
    return ok;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setFormError("Incorrect email or password.");
      return;
    }

    const profileRes = await fetch("/api/profile");
    const profile = await profileRes.json();
    router.push(profile.isAdmin ? "/admin" : "/");
    router.refresh();
  };

  const handleForgotPassword = async () => {
    if (!email.includes("@")) {
      setEmailError("Enter your email above first.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setFormError(error.message);
    } else {
      setFormError("");
      alert(`Password reset email sent to ${email}`);
    }
  };

  return (
    <main className="account-page" id="main-content">
      <div className="container">

        <section className="account-hero">
          <div className="account-heading">
            <p className="account-kicker">My Account</p>
            <h1>Welcome Back</h1>
            <p className="account-subtext">
              Sign in to manage your audits, badges, and directory listing.
            </p>
          </div>
        </section>

        <div className="auth-layout">
          <article className="account-card">

            <div className="card-header">
              <h2>Log In</h2>
            </div>

            {formError && (
              <ul className="auth-errors" role="alert" aria-live="assertive">
                <li>{formError}</li>
              </ul>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-form-fields">

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="Enter your email"
                    autoComplete="email"
                    aria-describedby={emailError ? "email-error" : undefined}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {emailError && (
                    <span className="field-error" id="email-error" aria-live="polite">
                      {emailError}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      required
                      minLength={8}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-describedby={passwordError ? "password-error" : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-pw"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {passwordError && (
                    <span className="field-error" id="password-error" aria-live="polite">
                      {passwordError}
                    </span>
                  )}
                </div>

              </div>

              <div className="form-options">
                <label className="checkbox">
                  <input type="checkbox" id="remember" />
                  Remember me
                </label>
                <button
                  type="button"
                  className="forgot-link"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Signing in…" : "Log In"}
              </button>
            </form>

            <p className="auth-switch">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up">Sign Up</Link>
            </p>

          </article>
        </div>

      </div>
    </main>
  );
}
