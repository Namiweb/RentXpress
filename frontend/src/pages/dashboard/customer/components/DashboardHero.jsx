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
    <header className="customer-hero">
      <div className="customer-hero__icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <div>
        <p className="customer-hero__eyebrow">Welcome back, {name}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    </header>
  );
}

export default DashboardHero;
