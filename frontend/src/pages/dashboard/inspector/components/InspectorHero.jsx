import { BellIcon, ClipboardCheckIcon, FileTextIcon, HistoryIcon, LayoutDashboardIcon } from "lucide-react";

const HERO_COPY = {
  overview: {
    title: "Keep the fleet road-ready",
    description: "Monitor inspection activity, follow-ups, and outstanding items at a glance.",
    icon: LayoutDashboardIcon,
  },
  inspections: {
    title: "Capture your findings",
    description: "Run through the checklist, attach evidence, and submit final decisions.",
    icon: ClipboardCheckIcon,
  },
  history: {
    title: "Review past inspections",
    description: "Reference previous reports and spot trends in vehicle conditions.",
    icon: HistoryIcon,
  },
  records: {
    title: "Filter official records",
    description: "Export compliant reports and drill into inspection outcomes.",
    icon: FileTextIcon,
  },
  notifications: {
    title: "Stay informed",
    description: "See alerts from dispatch and follow up on required maintenance.",
    icon: BellIcon,
  },
};

function InspectorHero({ activeTab, user, metrics = [] }) {
  const copy = HERO_COPY[activeTab] || HERO_COPY.overview;
  const Icon = copy.icon;
  const name = user?.profile?.firstName || user?.email || "inspector";

  return (
    <header className="inspector-hero">
      <div className="inspector-hero__icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <div className="inspector-hero__body">
        <p className="inspector-hero__eyebrow">Welcome back, {name}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        {metrics.length > 0 && (
          <ul className="inspector-hero__metrics">
            {metrics.map((stat) => (
              <li key={stat.label}>
                <span className="inspector-hero__metric-value">{stat.value}</span>
                <span className="inspector-hero__metric-label">{stat.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}

export default InspectorHero;
