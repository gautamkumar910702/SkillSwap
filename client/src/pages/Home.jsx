
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import FeaturedSkills from "../components/FeaturedSkills";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">
      <Navbar />

      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <FeaturedSkills />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}

export default Home;
