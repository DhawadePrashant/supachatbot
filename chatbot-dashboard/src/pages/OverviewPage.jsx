import { useEffect, useState } from "react";
import api from "../services/api";
import {
  Bot,
  Building2,
  Users,
  MessageSquareText,
  BarChart3,
} from "lucide-react";
import ClipLoader from "react-spinners/ClipLoader";

const OverviewPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.get("/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Shimmer loader
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-lg bg-gray-200 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(5)].map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-red-500 text-center mt-6">Failed to load stats.</p>;
  }

  const statData = [
    {
      label: "Total Chatbots",
      value: stats.totalChatbots,
      iconBg: "from-blue-500 to-indigo-500",
      icon: <Bot className="w-7 h-7 text-white" />,
    },
    {
      label: "Total Companies",
      value: stats.totalCompanies,
      iconBg: "from-teal-500 to-green-500",
      icon: <Building2 className="w-7 h-7 text-white" />,
    },
    {
      label: "Unique Users",
      value: stats.unique_users,
      iconBg: "from-yellow-500 to-orange-500",
      icon: <Users className="w-7 h-7 text-white" />,
    },
    {
      label: "Total Messages",
      value: stats.totalMessages,
      iconBg: "from-purple-500 to-pink-500",
      icon: <MessageSquareText className="w-7 h-7 text-white" />,
    },
    {
      label: "Monthly Tokens",
      value: stats.monthlyTokenUsage.toLocaleString(),
      iconBg: "from-pink-500 to-red-500",
      icon: <BarChart3 className="w-7 h-7 text-white" />,
    },
  ];

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Overview
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statData.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-md hover:shadow-lg hover:-translate-y-1 transform transition-all duration-300"
          >
            <div
              className={`w-14 h-14 rounded-lg bg-gradient-to-r ${stat.iconBg} flex items-center justify-center shadow-md mb-4`}
            >
              {stat.icon}
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <h3 className="text-3xl font-bold text-gray-800 mt-1">
              {stat.value}
            </h3>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OverviewPage;
