
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Button from "./Button";
import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="brand" onClick={closeMenu}>
          <span className="brand-icon" aria-hidden="true">
            ⇄
          </span>
          <span className="brand-name">SkillSwap</span>
        </Link>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="navbar-toggle"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Navigation links */}
        <nav
          id="primary-navigation"
          className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" end onClick={closeMenu}>
            Home
          </NavLink>

          <a href="/#how-it-works" onClick={closeMenu}>
            How It Works
          </a>

          <a href="/#explore-skills" onClick={closeMenu}>
            Explore Skills
          </a>

          <a href="/#about" onClick={closeMenu}>
            About
          </a>
        </nav>

        {/* Account actions */}
        <div className="nav-actions">
          <Link to="/login" className="login-link" onClick={closeMenu}>
            Log In
          </Link>

          <Button to="/register" variant="primary" className="navbar-signup">
            Sign Up
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
