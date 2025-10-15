import { CalendarIcon, CarIcon, CreditCardIcon, SettingsIcon, StarIcon } from "lucide-react";

const HERO_COPY = {
  vehicles: {
    title: "Find your perfect ride",
    description: "Browse tailored recommendations and jump into a booking in minutes.",
    icon: CarIcon,
  },
  bookings: {
    title: "Manage your bookings",
    description: "Track upcoming trips, revisit past journeys, and take quick actions.",
    icon: CalendarIcon,
  },
  payments: {
    title: "Payment overview",
    description: "See recent transactions and keep tabs on saved payment methods.",
    icon: CreditCardIcon,
  },
  feedback: {
    title: "Share your experience",
    description: "Leave reviews for finished trips and see what you have already shared.",
    icon: StarIcon,
  },
  profile: {
    title: "Profile & preferences",
    description: "Keep your personal details current so reservations stay hassle-free.",
    icon: SettingsIcon,
  },
};

function DashboardHero({ activeTab, user }) {
  const copy = HERO_COPY[activeTab] || HERO_COPY.vehicles;
  const Icon = copy.icon;
  const name = user?.profile?.firstName || user?.email || "there";

  return (
    <header className="bg-gradient-to-r from-black to-neutral-900 rounded-2xl p-8 mb-8 border border-neutral-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      ></div>
      
      {/* Decorative Elements */}
      {/* <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff] rounded-full blur-3xl opacity-10 transform translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9f9f9f] rounded-full blur-2xl opacity-5 transform -translate-x-24 translate-y-24"></div> */}
      
      <div className="relative z-10 flex items-start space-x-6">
        {/* Icon Container */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gradient-to-br from-[#373737] to-neutral-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Icon className="text-white" size={28} aria-hidden="true" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[#FF5A00] font-semibold uppercase tracking-wider text-sm mb-2">
            Welcome back, <span className="text-white">{name}</span>
          </p>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {copy.title}
          </h1>
          
          <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
            {copy.description}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="hidden lg:flex flex-shrink-0 items-center space-x-2 bg-gray-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-700">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-gray-300 text-sm font-medium">Online</span>
        </div>
      </div>

      {/* Bottom Border Accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF5A00] to-orange-600 rounded-b-2xl"></div>
    </header>
  );
}

export default DashboardHero;