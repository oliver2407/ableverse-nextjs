"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fullNameError, setFullNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    let ok = true;

    if (fullName.trim().length < 2) {
      setFullNameError("Please enter your full name.");
      ok = false;
    } else setFullNameError("");

    const usernameRe = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRe.test(username)) {
      setUsernameError("3–20 characters: letters, numbers, or _");
      ok = false;
    } else setUsernameError("");

    if (!email.includes("@") || !email.includes(".")) {
      setEmailError("Please enter a valid email.");
      ok = false;
    } else setEmailError("");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      ok = false;
    } else setPasswordError("");

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      ok = false;
    } else setConfirmError("");

    return ok;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: username.trim(),
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <main className="account-page" id="main-content">
        <div className="container">
          <div className="auth-layout">
            <article className="account-card" role="alert">
              <h2 style={{ color: "var(--color-success)", marginBottom: "1rem" }}>
                Check your email
              </h2>
              <p>
                We sent a confirmation link to <strong>{email}</strong>.
                Click it to activate your account, then{" "}
                <Link href="/sign-in" className="text-link">sign in</Link>.
              </p>
            </article>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="account-page" id="main-content">
      <div className="container">

        <section className="account-hero">
          <div className="account-heading">
            <p className="account-kicker">My Account</p>
            <h1>Create Account</h1>
            <p className="account-subtext">
              Join Ableverse to submit reviews and track accessibility.
            </p>
          </div>
        </section>

        <div className="auth-layout auth-layout--wide">
          <article className="account-card">

            <div className="card-header">
              <h2>Sign Up</h2>
            </div>

            {formError && (
              <ul className="auth-errors" role="alert" aria-live="assertive">
                <li>{formError}</li>
              </ul>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-form-fields auth-form-grid">

                <div className="form-group">
                  <label htmlFor="fullname">Full Name</label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    required
                    placeholder="Your full name"
                    autoComplete="name"
                    aria-describedby={fullNameError ? "fullname-error" : undefined}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  {fullNameError && (
                    <span className="field-error" id="fullname-error" aria-live="polite">
                      {fullNameError}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    placeholder="3–20 chars, letters / numbers / _"
                    autoComplete="username"
                    aria-describedby={usernameError ? "username-error" : undefined}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  {usernameError && (
                    <span className="field-error" id="username-error" aria-live="polite">
                      {usernameError}
                    </span>
                  )}
                </div>

                <div className="form-group auth-form-full">
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
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
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

                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <div className="input-wrap">
                    <input
                      type={showConfirm ? "text" : "password"}
                      id="confirm-password"
                      name="confirm-password"
                      required
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      aria-describedby={confirmError ? "confirm-error" : undefined}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="toggle-pw"
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      onClick={() => setShowConfirm((s) => !s)}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                  {confirmError && (
                    <span className="field-error" id="confirm-error" aria-live="polite">
                      {confirmError}
                    </span>
                  )}
                </div>

              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <Link href="/sign-in">Log In</Link>
            </p>

          </article>
        </div>

      </div>
    </main>
  );
}
