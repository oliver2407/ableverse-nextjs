"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync nav height CSS variable so hero fills the viewport under the nav
  useEffect(() => {
    const update = () => {
      if (!navRef.current) return;
      const h = Math.ceil(navRef.current.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--nav-h", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const ro = new ResizeObserver(update);
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      ro.disconnect();
    };
  }, []);

  const toggleContrast = () => {
    const next = !contrast;
    setContrast(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "contrast" : "light"
    );
    announce(next ? "High contrast mode enabled" : "High contrast mode disabled");
  };

  const readPage = () => {
    const main = document.querySelector("main");
    if (!main) return;
    const utterance = new SpeechSynthesisUtterance(main.innerText);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
    announce("Reading page content");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const announce = (msg: string) => {
    const el = document.getElementById("sr-live");
    if (el) el.textContent = msg;
  };

  return (
    <nav role="navigation" aria-label="Main navigation" ref={navRef}>
      <div className="nav__bar container">
        <button
          className="nav__toggle"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((o) => !o);
            announce(menuOpen ? "Menu closed" : "Menu opened");
          }}
        >
          ☰
        </button>

        <ul className={`nav__list${menuOpen ? " nav__list--open" : ""}`} id="nav-list">
          <li className="nav__item">
            <Link href="/">Home</Link>
          </li>

          <li className="nav__item nav__item--dropdown">
            <a
              href="#"
              className="nav__link nav__link--dropdown"
              id="consulting-toggle"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Services
              <span className="nav__arrow" aria-hidden="true">▾</span>
            </a>
            <ul className="nav__dropdown" role="menu" aria-labelledby="consulting-toggle">
              <li role="none">
                <Link role="menuitem" href="/services">Our Services</Link>
              </li>
              <li role="none">
                <Link role="menuitem" href="/services/audit-request">Request Audit</Link>
              </li>
            </ul>
          </li>

          {user ? (
            <>
              <li className="nav__item">
                <Link href="/account">My Account</Link>
              </li>
            </>
          ) : (
            <li className="nav__item">
              <Link href="/sign-in">Sign in / Sign up</Link>
            </li>
          )}
        </ul>

        <div className="nav__controls" role="group" aria-label="Accessibility controls">
          <button
            type="button"
            className="btn btn--ghost"
            aria-pressed={contrast}
            aria-label="Toggle high contrast mode"
            onClick={toggleContrast}
          >
            High Contrast
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            aria-label="Read page content aloud"
            onClick={readPage}
          >
            Read Page
          </button>
        </div>
      </div>

      {/* Live region for screen reader announcements */}
      <div id="sr-live" aria-live="polite" className="sr-only" />
    </nav>
  );
}
