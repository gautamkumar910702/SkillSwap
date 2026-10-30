
import { Link } from "react-router-dom";
import "./CTASection.css";

function CTASection() {
  return (
    <section className="cta-section" id="about">
      <div className="cta-container">
        <div className="cta-decoration cta-decoration-one" aria-hidden="true" />
        <div className="cta-decoration cta-decoration-two" aria-hidden="true" />

        <div className="cta-content">
          <span className="cta-eyebrow">
            YOUR NEXT CHAPTER STARTS HERE
          </span>

          <h2>
            You have a skill.
            <br />
            Someone wants to learn it.
          </h2>

          <p>
            Join a community where knowledge is shared, connections
            are built, and everyone has something valuable to offer.
          </p>

          <div className="cta-actions">
            <Link to="/register" className="cta-primary-button">
              Get Started for Free
              <span aria-hidden="true">→</span>
            </Link>

            <Link to="/login" className="cta-secondary-link">
              Already a member? Log in
            </Link>
          </div>

          <div className="cta-note">
            <span aria-hidden="true">✓</span>
            <p>Learn by teaching. Grow by sharing.</p>
          </div>
        </div>

        <div className="cta-visual" aria-hidden="true">
          <div className="cta-orbit cta-orbit-outer">
            <div className="cta-orbit cta-orbit-inner">
              <div className="cta-center-icon">⇄</div>

              <div className="cta-floating-icon cta-floating-top">
                ✨
              </div>

              <div className="cta-floating-icon cta-floating-right">
                💡
              </div>

              <div className="cta-floating-icon cta-floating-bottom">
                🎯
              </div>

              <div className="cta-floating-icon cta-floating-left">
                🌱
              </div>
            </div>
          </div>

          <div className="cta-visual-caption">
            <span className="cta-caption-dot" />
            <span>Knowledge connects us</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
