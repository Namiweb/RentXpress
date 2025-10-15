import { Link } from "react-router-dom";

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
      { label: "Register", to: "/register", variant: "primary" },
    ],
  },
  {
    title: "Vehicle Owners",
    description: "List vehicles, track bookings, and stay on top of inspection requirements.",
    actions: [
      { label: "Register", to: "/register/vehicle-owner", variant: "primary" },
    ],
  },
  {
    title: "Drivers",
    description: "Accept trip assignments, update real-time statuses, and review your earnings.",
    actions: [
      { label: "Register", to: "/register/driver", variant: "primary" },
    ],
  },
  {
    title: "Inspectors",
    description: "Log inspections, monitor vehicle compliance, and issue invoices.",
    actions: [
      { label: "Register", to: "/register/inspector", variant: "primary" },
    ],
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="fixed w-full bg-black/95 backdrop-blur-sm z-50 shadow-sm border-b border-gray-800">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
            <span className="text-2xl"></span>
            <span className="bg-gradient-to-r from-[#E85D00] to-orange-600 bg-clip-text text-transparent">
              RentXpress
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-[#E85D00] transition-colors duration-200 font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 text-gray-300 hover:text-[#E85D00] transition-colors duration-200 font-medium"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-[#E85D00] text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section with Background Image */}
        <section
          id="home"
          className="min-h-screen flex items-center justify-center relative bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="container mx-auto px-6 text-center text-white">
            <p className="text-[#E85D00] font-semibold uppercase tracking-wider mb-4">
              Unified fleet & rental platform
            </p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Rent<span className="text-[#E85D00]">Xpress</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Your unified hub for vehicle rentals, trip management, and fleet oversight.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="px-8 py-4 bg-[#E85D00] text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get Started
              </Link>
              <a
                href="#features"
                className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-neutral-600 hover:text-black transition-all duration-200 font-semibold text-lg"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section
          id="about"
          className="py-20 bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-6 text-white">
              Built for every step of the rental journey
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              RentXpress brings customers, vehicle owners, drivers, inspectors, and administrators together with
              integrated tools that keep vehicles moving and experiences seamless.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url('https://images.unsplash.com/photo-1486496572940-2bb2341fdbdf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-white">Platform highlights</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Streamline operations with connected workflows and real-time insights.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {FEATURE_ITEMS.map((item, index) => (
                <article
                  key={item.title}
                  className="bg-neutral-900 rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 border border-gray-800 hover:border-[#E85D00]/50 group backdrop-blur-sm bg-opacity-80"
                >
                  <div className="w-12 h-12 bg-[#E85D00] rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white font-bold text-lg">{index + 1}</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#E85D00] transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section
          id="roles"
          className="py-20 bg-black"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.9)), url('https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 text-white">Who we serve</h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Select your role to access tailored tools and workflows.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ROLE_CARDS.map((card) => (
                <article
                  key={card.title}
                  className="bg-neutral-900 rounded-xl p-6 hover:bg-neutral-900 transition-all duration-300 border border-gray-800 hover:border-[#E85D00] group backdrop-blur-sm bg-opacity-80"
                >
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#E85D00] transition-colors duration-200">
                    {card.title}
                  </h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {card.description}
                  </p>
                  <div className="space-y-3">
                    {card.actions.map((action) => (
                      <Link
                        key={action.label}
                        to={action.to}
                        className="block w-full text-center px-4 py-3 bg-[#E85D00] text-white rounded-lg font-medium hover:bg-orange-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-1"
                      >
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        id="contact"
        className="bg-neutral-900 text-white pt-16 pb-8"
        // style={{
        //   backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.98)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
        //   backgroundSize: 'cover',
        //   backgroundPosition: 'center'
        // }}
      >
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-2xl font-bold mb-4">
                <span className="bg-gradient-to-r from-[#E85D00] to-orange-600 bg-clip-text text-transparent">
                  RentXpress
                </span>
              </h4>
              <p className="text-gray-400 leading-relaxed">
                Your unified hub for vehicle rentals, trip management, and fleet oversight.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-2">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Support</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/support" className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/support" className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Connect With Us</h4>
              <ul className="space-y-2">
                {["Facebook", "Twitter", "Instagram", "LinkedIn"].map((platform) => (
                  <li key={platform}>
                    <a
                      href={`https://www.${platform.toLowerCase()}.com`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-[#E85D00] transition-colors duration-200"
                    >
                      {platform}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-500">
              © {new Date().getFullYear()} RentXpress. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;