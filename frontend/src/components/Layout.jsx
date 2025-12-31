import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import {
  LayoutDashboard,
  Upload,
  List,
  BookOpen,
  Handshake,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/upload", icon: Upload, label: "Bank Upload" },
  { path: "/transactions", icon: List, label: "Transactions" },
  { path: "/ledgers", icon: BookOpen, label: "Ledgers" },
  { path: "/loans", icon: Handshake, label: "Loans" },
  { path: "/cash", icon: Wallet, label: "Cash Book" },
  { path: "/reports", icon: BarChart3, label: "Reports" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-container" data-testid="app-layout">
      {/* Sidebar */}
      <aside className="sidebar" data-testid="sidebar">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold text-indigo-400 tracking-tight">LedgerOS</h1>
          <p className="text-xs text-slate-500 mt-1">Personal Accounting</p>
        </div>

        <nav className="py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon size={18} strokeWidth={1.5} />
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="nav-item w-full hover:text-rose-400"
            data-testid="logout-btn"
          >
            <LogOut size={18} strokeWidth={1.5} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" data-testid="main-content">
        {children}
      </main>
    </div>
  );
}
