import {
  ClipboardListIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageSquareIcon,
  UserCheckIcon,
  WalletIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "requests", label: "Requests", icon: UserCheckIcon },
  { id: "assignments", label: "Assignments", icon: ClipboardListIcon },
  { id: "earnings", label: "Earnings", icon: WalletIcon },
  { id: "feedback", label: "Feedback", icon: MessageSquareIcon },
  { id: "profile", label: "Profile", icon: IdCardIcon },
];

function DriverNavigation({ activeTab, onTabChange, user, onLogout }) {
  const initials = [user?.profile?.firstName, user?.profile?.lastName]
    .map((value) => value?.[0]?.toUpperCase())
    .filter(Boolean)
    .join("")
    .slice(0, 2) || "DR";

  return (
    <aside 
      className="w-80 min-h-screen bg-gradient-to-b from-black to-gray-900 border-r border-gray-800 flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.95)), url("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Brand Section */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF5A00] to-orange-600 bg-clip-text text-transparent">
              RentXpress
            </h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">Driver Console</p>
        </div>

        {/* Profile Section */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <div 
              className="w-14 h-14 bg-gradient-to-br from-[#484848] to-neutral-900 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg"
              aria-hidden="true"
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg truncate">
                {user?.profile?.firstName && user?.profile?.lastName
                  ? `${user.profile.firstName} ${user.profile.lastName}`
                  : user?.email || "Driver"}
              </p>
              <p className="text-gray-400 text-sm">Active Driver</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#FF5A00] text-white shadow-lg transform scale-105' 
                        : 'text-gray-300 hover:bg-neutral-900 hover:text-white hover:transform hover:scale-105'
                    }`}
                  >
                    <Icon 
                      className={`${isActive ? 'text-white' : 'text-gray-400'} transition-colors duration-200`} 
                      size={20} 
                      aria-hidden="true" 
                    />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Section */}
        <div className="p-6 border-t border-gray-800">
          <button 
            type="button" 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-200 group"
          >
            <LogOutIcon 
              className="text-gray-400 group-hover:text-white transition-colors duration-200" 
              size={20} 
              aria-hidden="true" 
            />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="text-center">
            <p className="text-gray-500 text-xs">
              RentXpress Driver Portal
            </p>
            <p className="text-gray-600 text-xs mt-1">
              v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-0 w-32 h-32 bg-[#FF5A00] rounded-full blur-3xl opacity-10"></div>
      <div className="absolute bottom-20 left-0 w-24 h-24 bg-[#FF5A00] rounded-full blur-2xl opacity-5"></div>
    </aside>
  );
}

export default DriverNavigation;