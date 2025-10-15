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
    title: "On The Road to Success",
    description: "Get a snapshot of assignments, requests, and performance for today.",
    icon: LayoutDashboardIcon,
  },
  requests: {
    title: "Claim New Requests",
    description: "Browse Customer driver requests and secure The Next ride.",
    icon: UserCheckIcon,
  },
  assignments: {
    title: "Stay in Sync",
    description: "Track current trips and update their progress in real time.",
    icon: ClipboardListIcon,
  },
  earnings: {
    title: "Monitor Your Earnings",
    description: "Review payouts, driver fees, and performance metrics.",
    icon: WalletIcon,
  },
  feedback: {
    title: "Hear From Passengers",
    description: "See What Customers are saying and respond to trends.",
    icon: MessageSquareIcon,
  },
  profile: {
    title: "Keep Your Profile Ready",
    description: "Update availability and driver documents in a single place.",
    icon: SettingsIcon,
  },
};

function DriverHero({ activeTab, user, metrics = [] }) {

  const copy = HERO_COPY[activeTab] || HERO_COPY.overview;
  const Icon = copy.icon;
  const name = user?.profile?.firstName || user?.email || "driver";

  return (
    <header className="bg-gradient-to-r from-black to-black rounded-2xl p-8 mb-8 border border-neutral-950 relative overflow-hidden">
      {/* Background Pattern */}
      {/* <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      ></div> */}
      
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 transform translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-400 rounded-full blur-2xl opacity-5 transform -translate-x-24 translate-y-24"></div>
      
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
            <div className="flex gap-8 mt-4">
              {metrics.map((stat) => (
                <div key={stat.label} className="flex flex-col items-start">
                  <span className="text-[#FF5A00] font-bold text-xl">
                    {stat.value}
                  </span>
                  <span className="text-gray-400 text-sm font-medium">
                    {stat.label}
                  </span>
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

export default DriverHero;