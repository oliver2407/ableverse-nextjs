import Link from "next/link";

export default function Footer() {
  return (
    <footer aria-label="Website footer">
      <div className="footer__content">
        <div className="footer__section">
          <h4 className="footer__title">About Us</h4>
          <p>
            Discover the best accessible shops and services near you. We are
            committed to promoting inclusivity and providing reliable
            accessibility information.
          </p>
        </div>
        <div className="footer__section">
          <h4 className="footer__title">Contact</h4>
          <ul className="footer__links">
            <li>
              <a href="mailto:info@ableverse.com" aria-label="Email us">
                info@ableverse.com
              </a>
            </li>
            <li>
              <a href="tel:+1234567890" aria-label="Call us">
                +1 (234) 567-890
              </a>
            </li>
          </ul>
        </div>
        <div className="footer__section">
          <h4 className="footer__title">Quick Links</h4>
          <ul className="footer__links">
            <li><Link href="/consult" aria-label="About page">About</Link></li>
            <li><Link href="/sign-in" aria-label="Contact page">Contact</Link></li>
            <li><Link href="/" aria-label="Accessibility information">Accessibility</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer__bottom">
        <p>&copy; 2025 Ableverse. All rights reserved.</p>
      </div>
    </footer>
  );
}
