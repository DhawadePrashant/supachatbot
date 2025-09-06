import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import the useAuth hook
import {
  LayoutDashboard,
  Building2,
  Bot,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";

const Sidebar = () => {
  // Use the user and logout function from the AuthContext
  const { user, logout } = useAuth();

  const navItemClass = ({ isActive }) =>
    `flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? "bg-blue-100 text-blue-600 font-semibold shadow-sm"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
    }`;

  // Helper to get initials from name
  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  return (
    <aside className="h-screen fixed w-64 bg-white border-r border-gray-200 p-4 hidden md:flex flex-col justify-between shadow-md">
      <div>
        <h2 className="text-2xl font-bold text-blue-600 mb-6 text-center tracking-wide">
          Supa Agent
        </h2>

        {/* --- ADDED: Profile Info Section --- */}
        {user && (
          <div className="flex flex-col items-center mb-6 border-b border-gray-200 pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-400 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-lg">
              {getInitials(user.name)}
            </div>
            <p className="font-semibold text-gray-800 text-md">{user.name}</p>
            <p className="text-xs text-white bg-slate-700 rounded-full px-3 py-1 mt-1 font-medium tracking-wide">
              {user.isSuperAdmin ? "Super Admin" : "Admin"}
            </p>
          </div>
        )}
        {/* --- END: Profile Info Section --- */}

        <nav className="space-y-2">
          <NavLink to="/dashboard/overview" className={navItemClass}>
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Overview
          </NavLink>

          <NavLink to="/dashboard/companies" className={navItemClass}>
            <Building2 className="mr-3 h-5 w-5" />
            Manage Companies
          </NavLink>

          <NavLink to="/dashboard/chatbots" className={navItemClass}>
            <Bot className="mr-3 h-5 w-5" />
            Manage Chatbots
          </NavLink>

          <NavLink to="/dashboard/config" className={navItemClass}>
            <Settings className="mr-3 h-5 w-5" />
            Client Config
          </NavLink>

          {/* This link is now only visible to super admins */}
          {user && user.isSuperAdmin && (
            <NavLink to="/dashboard/manage-admins" className={navItemClass}>
              <ShieldCheck className="mr-3 h-5 w-5" />
              Manage Admins
            </NavLink>
          )}
        </nav>
      </div>

      <button
        onClick={logout} // Use the logout function from the context
        className="flex cursor-pointer items-center px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:text-white hover:bg-red-500 transition-all"
      >
        <LogOut className="mr-3 h-5 w-5" />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;