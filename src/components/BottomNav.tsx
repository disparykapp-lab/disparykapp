import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export default function BottomNav() {
  const { profile } = useAuth();

  const items: NavItem[] = [
    { to: "/", label: "Beranda", icon: "🏠" },
    { to: "/kalender", label: "Kalender", icon: "📅" },
    { to: "/rekap", label: "Rekap", icon: "📊" },
  ];

  if (profile?.role === "admin") {
    items.push({ to: "/kelola", label: "Kelola", icon: "⚙️" });
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
                  isActive ? "text-brand-masuk" : "text-gray-500"
                }`
              }
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
