import {
  ClipboardListIcon,
  SettingsIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  UserCheckIcon,
  WalletIcon,
} from "lucide-react";

const HERO_COPY = {
  overview: {
    title: "On the road to success",
    description: "Get a snapshot of assignments, requests, and performance for today.",
    icon: LayoutDashboardIcon,
  },
  requests: {
    title: "Claim new requests",
    description: "Browse customer driver requests and secure the next ride.",
    icon: UserCheckIcon,
  },
  assignments: {
    title: "Stay in sync",
    description: "Track current trips and update their progress in real time.",
    icon: ClipboardListIcon,
  },
  earnings: {
    title: "Monitor your earnings",
    description: "Review payouts, driver fees, and performance metrics.",
    icon: WalletIcon,
  },
  feedback: {
    title: "Hear from passengers",
    description: "See what customers are saying and respond to trends.",
    icon: MessageSquareIcon,
  },
  profile: {
    title: "Keep your profile ready",
    description: "Update availability and driver documents in a single place.",
    icon: SettingsIcon,
  },
};

function DriverHero({ activeTab, user, metrics = [] }) {
  const copy = HERO_COPY[activeTab] || HERO_COPY.overview;
  const Icon = copy.icon;
  const name = user?.profile?.firstName || user?.email || "driver";

  return (
    <header className="driver-hero">
      <div className="driver-hero__icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <div className="driver-hero__body">
        <p className="driver-hero__eyebrow">Welcome back, {name}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        {metrics.length > 0 && (
          <ul className="driver-hero__metrics">
            {metrics.map((stat) => (
              <li key={stat.label}>
                <span className="driver-hero__metric-value">{stat.value}</span>
                <span className="driver-hero__metric-label">{stat.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

export default DriverHero;
