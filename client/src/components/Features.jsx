
import "./Features.css";

const features = [
  {
    icon: "🤝",
    title: "Peer-to-Peer Learning",
    description:
      "Learn directly from people who have real experience and are happy to share what they know.",
    className: "feature-purple",
  },
  {
    icon: "🔄",
    title: "Exchange Skills",
    description:
      "Teach a skill you know and learn something new in return. Everyone has something to offer.",
    className: "feature-green",
  },
  {
    icon: "🎯",
    title: "Find Your Match",
    description:
      "Discover people whose skills and learning goals complement your own interests.",
    className: "feature-orange",
  },
  {
    icon: "🌱",
    title: "Grow Together",
    description:
      "Build confidence, share knowledge, and grow your skills with a supportive community.",
    className: "feature-blue",
  },
];

function Features() {
  return (
    <section className="features-section" aria-labelledby="features-heading">
      <div className="features-container">
        <div className="features-heading">
          <span className="features-eyebrow">WHY SKILLSWAP?</span>

          <h2 id="features-heading">
            Learning is better <span>together.</span>
          </h2>

          <p>
            Your knowledge has value. Discover a more collaborative
            way to learn, teach, and connect with others.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <article
              className="feature-card"
              key={feature.title}
            >
              <div
                className={`feature-icon ${feature.className}`}
                aria-hidden="true"
              >
                {feature.icon}
              </div>

              <h3>{feature.title}</h3>

              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
