
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "./Button";
import "./FeaturedSkills.css";

const sampleSkills = [
  {
    id: "web-development",
    title: "Web Development",
    category: "TECHNOLOGY",
    description:
      "Learn to build modern websites and interactive web applications.",
    icon: "</>",
    iconClass: "skill-web",
    level: "Beginner friendly",
  },
  {
    id: "graphic-design",
    title: "Graphic Design",
    category: "CREATIVE",
    description:
      "Explore visual design, creative layouts, and digital artwork.",
    icon: "✎",
    iconClass: "skill-design",
    level: "All levels",
  },
  {
    id: "photography",
    title: "Photography",
    category: "ART & MEDIA",
    description:
      "Improve your composition, camera skills, and visual storytelling.",
    icon: "◎",
    iconClass: "skill-photo",
    level: "All levels",
  },
  {
    id: "public-speaking",
    title: "Public Speaking",
    category: "PERSONAL GROWTH",
    description:
      "Build confidence and communicate your ideas more effectively.",
    icon: "◉",
    iconClass: "skill-speaking",
    level: "Beginner friendly",
  },
];

function FeaturedSkills() {
  const [skills] = useState(sampleSkills);

  return (
    <section
      className="featured-skills-section"
      id="explore-skills"
      aria-labelledby="featured-skills-heading"
    >
      <div className="featured-skills-container">
        <div className="featured-skills-heading">
          <div className="featured-skills-heading-copy">
            <span className="featured-skills-eyebrow">
              EXPLORE POSSIBILITIES
            </span>

            <h2 id="featured-skills-heading">
              A world of skills.
              <br />
              <span>One community.</span>
            </h2>

            <p>
              Discover something new to learn or find someone who
              could benefit from what you already know.
            </p>
          </div>

          <Link to="/register" className="featured-skills-text-link">
            Share your skills <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="featured-skills-grid">
          {skills.map((skill) => (
            <article className="featured-skill-card" key={skill.id}>
              <div className="featured-skill-card-top">
                <div
                  className={`featured-skill-icon ${skill.iconClass}`}
                  aria-hidden="true"
                >
                  {skill.icon}
                </div>

                <span className="featured-skill-level">
                  {skill.level}
                </span>
              </div>

              <span className="featured-skill-category">
                {skill.category}
              </span>

              <h3>{skill.title}</h3>

              <p>{skill.description}</p>

              <Link
                to="/register"
                className="featured-skill-link"
                aria-label={`Sign up to explore ${skill.title}`}
              >
                Explore skill <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>

        <div className="featured-skills-bottom">
          <p>
            Have a different skill in mind? There is room for
            everyone to teach and learn.
          </p>

          <Button to="/register" variant="secondary">
            Join the Community
          </Button>
        </div>
      </div>
    </section>
  );
}

export default FeaturedSkills;
