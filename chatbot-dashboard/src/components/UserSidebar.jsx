import React from "react";
import { LayoutDashboard, MessageSquare, LogOut, Inbox } from "lucide-react"; // ✅ Add Inbox icon
import { useLocation } from "react-router-dom";
import logo from "../assets/dashboard-logo.svg";


export default function Sidebar({ chatbotId }) {
  const menuItems = [
    {
      name: "Overview",
      icon: <LayoutDashboard size={18} />,
      path: "/user/dashboard",
    },
    {
      name: "Message History",
      icon: <MessageSquare size={18} />,
      path: "/user/message-history",
    },
    {
      name: "Enquiries", // ✅ New menu item
      icon: <Inbox size={18} />,
      path: `/user/enquiries/${chatbotId}`,
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const location = useLocation();
  const activePath = location.pathname;

  return (
    <aside className="w-64 fixed h-screen bg-[#f4f6ff] shadow-sm px-6 py-8 flex flex-col justify-between">
      {/* Top Section */}
      <div>
        <div className="flex items-center mb-12 space-x-3">
          <img src={logo} alt="Troika Tech Logo" className="h-10 w-auto" />
          <h1 className="bg-gradient-to-r from-[#008080] via-[#8000ff] to-[#ff2bb0] bg-clip-text text-transparent font-bold text-2xl">
            Troika Tech
          </h1>
        </div>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = item.path === activePath;
            return (
              <a
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-black hover:bg-gray-100"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Bottom Logout Button */}
      <div className="mt-10">
        <button
          onClick={handleLogout}
          className="flex cursor-pointer text-lg items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow transition"
        >
          <LogOut size={24} />
          Logout
        </button>
      </div>
    </aside>
  );
}
