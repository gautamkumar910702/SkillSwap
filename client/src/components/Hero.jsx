
import { Link } from "react-router-dom";
import Button from "./Button";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero-section">
      {/* Left side: main message and actions */}
      <div className="hero-content">
        <span className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          LEARN SOMETHING. SHARE SOMETHING.
        </span>

        <h1>
          Your Skills Are
          <br />
          <span>Worth Sharing.</span>
        </h1>

        <p className="hero-description">
          Teach what you know. Learn what you love. Connect with
          people who share your curiosity and grow together through
          meaningful skill exchange.
        </p>

        <div className="hero-actions">
          <Button to="/register" variant="primary" className="hero-primary-button">
            Get Started Free
            <span aria-hidden="true">→</span>
          </Button>

          <Link to="/login" className="hero-login-link">
            Already a member? <span>Log in</span>
          </Link>
        </div>

        <div className="hero-trust-note">
          <span className="hero-trust-icon" aria-hidden="true">✓</span>
          <p>Meet learners. Share knowledge. Grow together.</p>
        </div>
      </div>

      {/* Right side: visual representation of skill exchange */}
      <div className="hero-visual">
        <div className="hero-visual-decoration hero-decoration-one" />
        <div className="hero-visual-decoration hero-decoration-two" />

        <div className="hero-floating-label">
          <span aria-hidden="true">✦</span>
          Knowledge goes both ways
        </div>

        <div className="hero-skill-card hero-skill-card-top">
          <div className="hero-skill-icon hero-design-icon" aria-hidden="true">
            ✎
          </div>

          <div className="hero-skill-info">
            <span className="hero-skill-category">CREATIVE SKILLS</span>
            <h3>Graphic Design</h3>
            <p>Learn to create something amazing</p>
          </div>

          <span className="hero-skill-arrow" aria-hidden="true">↗</span>
        </div>

        <div className="hero-exchange-symbol" aria-label="Skills exchanged both ways">
          <span aria-hidden="true">⇄</span>
        </div>

        <div className="hero-skill-card hero-skill-card-bottom">
          <div className="hero-skill-icon hero-code-icon" aria-hidden="true">
            {"</>"}
          </div>

          <div className="hero-skill-info">
            <span className="hero-skill-category">TECH SKILLS</span>
            <h3>Web Development</h3>
            <p>Share your knowledge of code</p>
          </div>

          <span className="hero-skill-arrow" aria-hidden="true">↗</span>
        </div>

        <div className="hero-visual-caption">
          <span className="hero-caption-dot" />
          <p>Everyone has something valuable to teach.</p>
        </div>
      </div>
    </section>
  );
}

export default Hero;
