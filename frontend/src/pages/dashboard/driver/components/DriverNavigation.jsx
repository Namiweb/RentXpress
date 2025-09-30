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
    <aside className="driver-sidebar">
      <div className="driver-sidebar__brand">
        <h1>RentXpress</h1>
        <p>Driver Console</p>
      </div>

      <div className="driver-sidebar__profile">
        <div className="driver-avatar" aria-hidden="true">
          {initials}
        </div>
        <div>
          <p className="driver-sidebar__name">
            {user?.profile?.firstName && user?.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user?.email || "Driver"}
          </p>
          <p className="driver-sidebar__role">Active driver</p>
        </div>
      </div>

      <nav className="driver-sidebar__nav">
        <ul>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={isActive ? "driver-nav-item is-active" : "driver-nav-item"}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="driver-nav-item__icon" size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button type="button" className="driver-sidebar__logout" onClick={onLogout}>
        <LogOutIcon size={18} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </aside>
  );
}

export default DriverNavigation;
