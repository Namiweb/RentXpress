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
    <header className="bg-gradient-to-r from-black to-neutral-900 rounded-2xl p-8 mb-8 border border-neutral-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      ></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffffff] rounded-full blur-3xl opacity-10 transform translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#9f9f9f] rounded-full blur-2xl opacity-5 transform -translate-x-24 translate-y-24"></div>
      
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

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="flex items-center space-x-8 mt-6">
              {metrics.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-gray-400 text-sm font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
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

export default InspectorHero;