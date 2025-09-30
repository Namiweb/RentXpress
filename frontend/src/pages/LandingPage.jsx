import { Link } from "react-router-dom";
import "../App.css";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Contact", href: "#contact" },
];

const FEATURE_ITEMS = [
  {
    title: "Real-time visibility",
    description: "Track bookings, vehicle availability, and inspector progress from a single dashboard.",
  },
  {
    title: "Smart compliance",
    description: "Guided inspections and document workflows help every vehicle stay road-ready.",
  },
  {
    title: "Integrated finances",
    description: "Collect payments, release driver payouts, and audit earnings without leaving the platform.",
  },
];

const ROLE_CARDS = [
  {
    title: "Customers",
    description: "Browse vehicles, schedule trips, and manage your bookings with ease.",
    actions: [
      { label: "Login", to: "/login", variant: "primary" },
      { label: "Register", to: "/register", variant: "secondary" },
    ],
  },
  {
    title: "Vehicle Owners",
    description: "List vehicles, track bookings, and stay on top of inspection requirements.",
    actions: [
      { label: "Login", to: "/login/vehicle-owner", variant: "primary" },
      { label: "Register", to: "/register/vehicle-owner", variant: "secondary" },
    ],
  },
  {
    title: "Drivers",
    description: "Accept trip assignments, update real-time statuses, and review your earnings.",
    actions: [
      { label: "Driver Login", to: "/login/driver", variant: "primary" },
      { label: "Driver Register", to: "/register/driver", variant: "secondary" },
    ],
  },
  {
    title: "Inspectors",
    description: "Log inspections, monitor vehicle compliance, and issue invoices.",
    actions: [
      { label: "Inspector Login", to: "/login/inspector", variant: "primary" },
      { label: "Inspector Register", to: "/register/inspector", variant: "secondary" },
    ],
  },
  {
    title: "Administrators",
    description: "Manage users, approve vehicles and drivers, and oversee finances.",
    actions: [{ label: "Admin Login", to: "/login/admin", variant: "primary" }],
  },
];

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <span className="landing-logo" aria-hidden="true">
            🚗
          </span>
          <span>RentXpress</span>
        </Link>
        <nav className="landing-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="landing-nav-link">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="landing-auth">
          <Link to="/login" className="btn btn-secondary btn-small">
            Login
          </Link>
          <Link to="/register" className="btn btn-small">
            Get Started
          </Link>
        </div>
      </header>

      <main className="landing-main">
        <section id="home" className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-hero-eyebrow">Unified fleet &amp; rental platform</p>
            <h1>RentXpress</h1>
            <p className="landing-hero-text">
              Your unified hub for vehicle rentals, trip management, and fleet oversight.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="btn">
                Get Started
              </Link>
              <a href="#features" className="btn btn-outline">
                Learn More
              </a>
            </div>
          </div>
        </section>

        <section id="about" className="landing-section landing-about">
          <div className="landing-section-content">
            <h2>Built for every step of the rental journey</h2>
            <p>
              RentXpress brings customers, vehicle owners, drivers, inspectors, and administrators together with
              integrated tools that keep vehicles moving and experiences seamless.
            </p>
          </div>
        </section>

        <section id="features" className="landing-section landing-features">
          <div className="landing-section-header">
            <h2>Platform highlights</h2>
            <p>Streamline operations with connected workflows and real-time insights.</p>
          </div>
          <div className="landing-feature-grid">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="landing-feature-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="roles" className="landing-section landing-roles">
          <div className="landing-section-header">
            <h2>Who we serve</h2>
            <p>Select your role to access tailored tools and workflows.</p>
          </div>
          <div className="landing-card-grid">
            {ROLE_CARDS.map((card) => (
              <article key={card.title} className="landing-card">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <div className="landing-card-actions">
                  {card.actions.map((action) => (
                    <Link
                      key={action.label}
                      to={action.to}
                      className={`btn btn-small ${action.variant === "secondary" ? "btn-secondary" : ""}`.trim()}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="landing-footer">
        <div className="landing-footer-columns">
          <div>
            <h4>RentXpress</h4>
            <p>Your unified hub for vehicle rentals, trip management, and fleet oversight.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#roles">Roles</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li>
                <Link to="/support">Help Center</Link>
              </li>
              <li>
                <Link to="/support">FAQs</Link>
              </li>
              <li>
                <Link to="/terms">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy">Privacy Policy</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Connect With Us</h4>
            <ul className="landing-social-links">
              <li>
                <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </li>
              <li>
                <a href="https://www.twitter.com" target="_blank" rel="noreferrer">
                  Twitter
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>© {new Date().getFullYear()} RentXpress. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
