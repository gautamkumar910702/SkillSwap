
import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="footer-brand-icon">S</span>
          <span>SkillSwap</span>
        </div>

        <p className="footer-tagline">
          Learn by Teaching.
        </p>
      </div>

      <div className="footer-bottom">
        <p>
          © {currentYear} SkillSwap. All rights reserved.
        </p>

        <p className="footer-message">
          Share your skills. Grow together.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
