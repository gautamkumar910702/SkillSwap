
import Button from "./Button";
import "./HowItWorks.css";

const steps = [
  {
    number: "01",
    icon: "👤",
    title: "Create Your Profile",
    description:
      "Sign up and tell the community which skills you can teach and which skills you want to learn.",
  },
  {
    number: "02",
    icon: "🔍",
    title: "Find Your Skill Match",
    description:
      "Explore skills and discover people whose knowledge matches your learning goals.",
  },
  {
    number: "03",
    icon: "🤝",
    title: "Connect & Exchange",
    description:
      "Connect with your match, arrange a learning session, and help each other grow.",
  },
];

function HowItWorks() {
  return (
    <section
      className="how-it-works-section"
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
    >
      <div className="how-it-works-container">
        <div className="how-it-works-heading">
          <span className="how-it-works-eyebrow">
            YOUR JOURNEY STARTS HERE
          </span>

          <h2 id="how-it-works-heading">
            Three steps to <span>something new.</span>
          </h2>

          <p>
            Getting started is simple. Bring your skills, meet
            curious people, and start learning from each other.
          </p>
        </div>

        <div className="how-it-works-grid">
          {steps.map((step) => (
            <article className="how-step-card" key={step.number}>
              <div className="how-step-top">
                <span className="how-step-number">
                  STEP {step.number}
                </span>

                <span className="how-step-icon" aria-hidden="true">
                  {step.icon}
                </span>
              </div>

              <h3>{step.title}</h3>

              <p>{step.description}</p>
            </article>
          ))}
        </div>

        <div className="how-it-works-cta">
          <p>Ready to share what you know?</p>

          <Button to="/register" variant="primary">
            Join SkillSwap <span aria-hidden="true">→</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
