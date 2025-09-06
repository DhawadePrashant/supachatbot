import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
import SessionModal from "../components/SessionModal";
import Layout from "../components/Layout";
import {
  Mail,
  Globe,
  Crown,
  Calendar,
  Clock3,
  BarChart3,
  MessageSquare,
  Users,
  Briefcase,
  UserCircle,
  Bot,
  SquareUserRound,
  CircleUser,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

// --- Skeleton Loader Components ---
const CardSkeleton = () => (
  <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
    <div className="flex items-center gap-2 mb-8">
      <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
      <div className="h-4 bg-gray-200 rounded-full w-1/2"></div>
    </div>
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-1/4"></div>
            <div className="h-4 bg-gray-300 rounded-full w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MessageItemSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-7 h-7 bg-gray-300 rounded-full"></div>
      <div className="h-4 bg-gray-200 rounded-full w-20"></div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded-full w-full"></div>
      <div className="h-3 bg-gray-200 rounded-full w-5/6"></div>
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="max-w-6xl ml-64 mx-auto p-6 sm:p-10 space-y-10">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
      <div className="h-6 bg-gray-200 rounded-full w-1/3 mb-6"></div>
      <MessageItemSkeleton />
      <MessageItemSkeleton />
      <MessageItemSkeleton />
    </div>
  </div>
);
// --- End Skeleton Components ---

const UserDashboard = () => {
  const [company, setCompany] = useState(null);
  const [plan, setPlan] = useState(null);
  const [usage, setUsage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sessionFilter, setSessionFilter] = useState("");
  const [allSessions, setAllSessions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [sessionMessages, setSessionMessages] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [viewMode, setViewMode] = useState("email"); // default to 'session'
  const [allEmails, setAllEmails] = useState([]);

  const limit = 10;

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
  }

  const fetchSubscription = async (chatbotId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get(`/chatbot/${chatbotId}/subscription`, {
        headers,
      });

      if (!res.data || !res.data.end_date) {
        toast.error("Subscription not found");
        return;
      }

      setPlan(res.data);
    } catch (err) {
      toast.error("Failed to fetch subscription");
      console.error("Failed to fetch subscription:", err);
    }
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [companyRes, usageRes] = await Promise.all([
        api.get("/user/company", { headers }),
        api.get("/user/usage", { headers }),
      ]);

      const companyData = companyRes.data;
      console.log("👉 Company Response:", companyData);
      setCompany(companyData);
      setUsage(usageRes.data);

      const chatbotId = companyData.chatbot_id;

      if (chatbotId) {
        await fetchSubscription(chatbotId); // ✅ Fetch plan
      } else {
        toast.error("❌ No chatbot ID found for this user.");
        setPlan(null); // Prevent crashing
      }
    } catch (err) {
      toast.error("Failed to load dashboard data");
      console.error("fetchData error:", err);
      setPlan(null); // Ensure no crash
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      let url = `/user/messages?page=${page}&limit=${limit}`;

      if (viewMode === "session" && sessionFilter) {
        url += `&session_id=${sessionFilter}`;
      } else if (viewMode === "email" && sessionFilter) {
        url += `&email=${sessionFilter}`;
      }

      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(res.data.messages);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error("Failed to fetch messages");
      console.error(err);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [sessionRes, emailRes] = await Promise.all([
        api.get("/user/sessions", { headers }),
        api.get("/user/messages/unique-emails", { headers }),
      ]);

      setAllSessions(sessionRes.data.sessions);
      console.log("Fetched emails:", emailRes.data.emails);

      setAllEmails(emailRes.data.emails);
    } catch (err) {
      console.error("Failed to fetch filter options", err);
    }
  };

  const openSessionModal = async (sessionId) => {
    setSelectedSessionId(sessionId);
    try {
      const res = await api.get(
        `/user/messages?session_id=${sessionId}&limit=1000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSessionMessages(res.data.messages || []);
    } catch (err) {
      console.error("Error fetching session messages:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchMessages();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeout);
  }, [page, sessionFilter, viewMode]);

  useEffect(() => {
    setPage(1); // reset to page 1 when session changes
  }, [sessionFilter, viewMode]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };
  
  // 👇 UPDATED: Replaced spinner with skeleton loader
  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  if (!company || !usage)
    return (
      <div className="p-10 text-red-600 text-lg">
        Failed to load data. Please try again.
      </div>
    );

  const userLimit = plan?.max_users || 200;
  const userPercentage = Math.round((usage.unique_users / userLimit) * 100);

  return (
    <Layout chatbotId={company?.chatbot_id}>
      <div className="max-w-6xl ml-64 mx-auto p-6 sm:p-10 space-y-10 font-[Inter,sans-serif]">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border-blue-100 bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition duration-300">
            {/* Header */}
            <h3 className="flex items-center gap-2 text-lg font-bold text-blue-600 mb-8">
              <span className="bg-blue-600 text-white p-1.5 rounded-md">
                <SquareUserRound size={16} />
              </span>
              User Details
            </h3>

            {/* Company Name */}
            <div className="flex items-start gap-3 mb-6">
              <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md">
                <CircleUser size={16} />
              </span>
              <div>
                <div className="text-sm text-gray-500">User Name</div>
                <div className="font-semibold text-sm text-black">{company.name}</div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 mb-6">
              <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md">
                <Mail size={16} />
              </span>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-semibold text-sm text-black">{company.email}</div>
              </div>
            </div>

            {/* Domain */}
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md">
                <Globe size={16} />
              </span>
              <div>
                <div className="text-sm text-gray-500">Domain</div>
                <div className="font-semibold text-sm text-black">{company.url}</div>
              </div>
            </div>
          </div>

          {plan ? (
            <div className="bg-white border-amber-100 bg-gradient-to-br from-amber-50/50 via-green-50/30 to-white rounded-xl p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition duration-300">
              <h3 className="flex items-center gap-2 text-lg font-bold text-orange-600 mb-5">
                <span className="bg-green-600 text-white p-1.5 rounded-md"><Crown size={16} /></span>
                Plan Details
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="bg-yellow-100 text-yellow-600 p-1.5 rounded-md"><Crown size={16} /></span>
                  <div><div className="text-gray-500">Plan</div><div className="font-semibold">{plan.name}</div></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-green-100 text-green-600 p-1.5 rounded-md"><Calendar size={16} /></span>
                  <div><div className="text-gray-500">Validity</div><div className="font-semibold">{plan.duration_days} Days</div></div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-orange-100 text-orange-600 p-1.5 rounded-md"><Clock3 size={16} /></span>
                  <div><div className="text-gray-500">Remaining</div><div className="font-semibold">{plan.days_remaining} days left</div></div>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-blue-600 rounded-full"
                    style={{width: `${(plan.days_remaining / plan.duration_days) * 100}%`, transition: "width 0.5s ease-in-out"}}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">{plan.duration_days - plan.days_remaining} of {plan.duration_days} days used</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-yellow-200 text-center italic text-gray-500 rounded-xl p-6 shadow-sm">
              No active plan found.
            </div>
          )}

          <div className="bg-white hover:scale-[1.02] border-purple-100 bg-gradient-to-br from-purple-50/50 to-white rounded-xl p-6 shadow-sm hover:shadow-md transition duration-300">
            <h3 className="flex items-center gap-2 text-lg font-bold text-purple-600 mb-5">
              <span className="bg-purple-600 text-white p-1.5 rounded-md"><BarChart3 size={16} /></span>
              Usage Statistics
            </h3>
            <div className="flex items-start gap-3 mb-5">
              <span className="bg-purple-100 text-purple-600 p-1.5 rounded-md"><MessageSquare size={16} /></span>
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Messages Sent</div>
                <div className="font-bold text-black mb-1">{usage.total_messages}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-purple-100 text-purple-600 p-1.5 rounded-md"><Users size={16} /></span>
              <div className="flex-1">
                <div className="text-sm text-gray-500 mb-1">Total Users</div>
                <div className="font-bold text-black mb-1">{usage.unique_users} / {userLimit}</div>
                <p className="text-xs text-gray-500">{userPercentage}% of user limit reached</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-fuchsia-200 rounded-xl p-6 shadow-sm hover:shadow-md transition duration-300">
          <h3 className="flex items-center gap-2 text-lg font-bold text-fuchsia-700 mb-6">
            <span className="bg-fuchsia-700 text-white p-1.5 rounded-md"><Briefcase size={16} /></span>
            Recent Message History
          </h3>

          {messages?.slice(0, 6).map((msg, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white ${msg.sender === "user" ? "bg-pink-600" : "bg-violet-600"}`}>
                  {msg.sender === "user" ? (<UserCircle size={16} />) : (<Bot size={16} />)}
                </div>
                <span className={`text-xs font-medium ${msg.sender === "user" ? "bg-pink-100 text-pink-600" : "bg-violet-100 text-violet-600"} px-2 py-0.5 rounded-md`}>
                  {msg.sender === "user" ? "User" : "Bot"}
                </span>
                {msg.sender === "user" && (<span className="text-sm text-gray-700 font-medium">{msg.email}</span>)}
              </div>
              <p className="text-sm text-gray-900">{msg.content}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span>{dayjs(msg.timestamp).fromNow()}</span>
              </div>
            </div>
          ))}
        </div>

        <SessionModal
          sessionId={selectedSessionId}
          messages={sessionMessages}
          onClose={() => {
            setSelectedSessionId(null);
            setSessionMessages(null);
          }}
        />
      </div>
    </Layout>
  );
};

export default UserDashboard;