import { CalendarIcon, CarIcon, CreditCardIcon, LogOutIcon, SettingsIcon, StarIcon, UserIcon } from "lucide-react";

const NAV_ITEMS = [
  { id: "vehicles", label: "Vehicles", icon: CarIcon },
  { id: "bookings", label: "Bookings", icon: CalendarIcon },
  { id: "payments", label: "Payments", icon: CreditCardIcon },
  { id: "feedback", label: "Feedback", icon: StarIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
];

function CustomerNavigation({ activeTab, onTabChange, user, onLogout }) {
  const initials = [user?.profile?.firstName, user?.profile?.lastName]
    .map((value) => value?.[0]?.toUpperCase())
    .filter(Boolean)
    .join("")
    .slice(0, 2) || "CU";

  return (
    <aside className="customer-sidebar">
      <div className="customer-sidebar__brand">
        <h1>RentXpress</h1>
      </div>

      <div className="customer-sidebar__profile">
        <div className="customer-avatar" aria-hidden="true">
          {initials}
        </div>
        <div>
          <p className="customer-sidebar__name">
            {user?.profile?.firstName && user?.profile?.lastName
              ? `${user.profile.firstName} ${user.profile.lastName}`
              : user?.email || "Customer"}
          </p>
          <p className="customer-sidebar__role">Customer</p>
        </div>
      </div>

      <nav className="customer-sidebar__nav">
        <ul>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={isActive ? "customer-nav-item is-active" : "customer-nav-item"}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="customer-nav-item__icon" size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <button type="button" className="customer-sidebar__logout" onClick={onLogout}>
        <LogOutIcon size={18} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </aside>
  );
}

export default CustomerNavigation;
