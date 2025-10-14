import { ClipboardCheckIcon, FileTextIcon, HistoryIcon, LayoutDashboardIcon, LogOutIcon, CarIcon, UserIcon } from "lucide-react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "inspections", label: "Inspections", icon: ClipboardCheckIcon },
  { id: "vehicles", label: "Pending Approval", icon: CarIcon },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "records", label: "Records", icon: FileTextIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
];

function InspectorNavigation({ activeTab, onTabChange, user, onLogout }) {
  const initials = [user?.profile?.firstName, user?.profile?.lastName]
    .map((value) => value?.[0]?.toUpperCase())
    .filter(Boolean)
    .join("")
    .slice(0, 2) || "IN";

  return (
    <aside className="inspector-sidebar">
      <div className="inspector-sidebar__brand">
        <h1>RentXpress</h1>
        <p>Inspection Suite</p>
      </div>

      <div className="inspector-sidebar__profile">
        <div className="inspector-avatar" aria-hidden="true">
          {initials}
        </div>
        <div>
          <p className="inspector-sidebar__name">
            {user?.profile?.firstName && user?.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user?.email || "Inspector"}
          </p>
          <p className="inspector-sidebar__role">Vehicle inspector</p>
        </div>
      </div>

      <nav className="inspector-sidebar__nav">
        <ul>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={isActive ? "inspector-nav-item is-active" : "inspector-nav-item"}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="inspector-nav-item__icon" size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button type="button" className="inspector-sidebar__logout" onClick={onLogout}>
        <LogOutIcon size={18} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </aside>
  );
}

export default InspectorNavigation;
