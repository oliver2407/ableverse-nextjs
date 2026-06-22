"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/sign-in");
      } else {
        setUser(data.user);
        setLoading(false);
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="account-page" id="main-content">
        <div className="container">
          <p>Loading…</p>
        </div>
      </main>
    );
  }

  const email = user?.email ?? "";
  const fullName = user?.user_metadata?.full_name as string | undefined;
  const username = user?.user_metadata?.username as string | undefined;
  const displayName = fullName || username || email.split("@")[0];
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <main className="account-page" id="main-content">
      <div className="container">

        <section className="account-hero">
          <div className="account-heading">
            <p className="account-kicker">My Account</p>
            <h1>Welcome back, {displayName}</h1>
            <p className="account-subtext">Manage your profile and account settings.</p>
          </div>
        </section>

        <div className="account-layout">

          <aside className="account-sidebar" aria-label="Account menu">
            <div className="profile-summary">
              <div className="profile-summary-avatar" aria-hidden="true">
                {avatarLetter}
              </div>
              <h2>{displayName}</h2>
              {username && <p>@{username}</p>}
              <p>{email}</p>
            </div>
            <nav className="account-nav">
              <ul>
                <li><a href="/account" className="active-link">Account Settings</a></li>
                <li>
                  <button type="button" onClick={handleSignOut} className="nav-signout-btn">
                    Log Out
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          <section className="account-content">

            <article className="account-card">
              <div className="card-header">
                <h2>Profile Information</h2>
              </div>
              <div className="info-grid">
                {fullName && (
                  <div className="info-item">
                    <span className="label">Full Name</span>
                    <p>{fullName}</p>
                  </div>
                )}
                {username && (
                  <div className="info-item">
                    <span className="label">Username</span>
                    <p>@{username}</p>
                  </div>
                )}
                <div className="info-item">
                  <span className="label">Email</span>
                  <p>{email}</p>
                </div>
                <div className="info-item">
                  <span className="label">Member Since</span>
                  <p>{memberSince}</p>
                </div>
              </div>
            </article>

            <article className="account-card">
              <div className="card-header">
                <h2>Password</h2>
              </div>
              <div className="settings-text">
                <p>
                  Keep your account secure by updating your password regularly.{" "}
                  <Link href="/sign-in" className="text-link">Reset via sign-in page</Link>.
                </p>
              </div>
            </article>

          </section>
        </div>

      </div>
    </main>
  );
}
