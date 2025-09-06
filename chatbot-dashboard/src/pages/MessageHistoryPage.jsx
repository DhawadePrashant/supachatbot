import { useEffect, useState } from "react";
import {
  Mail,
  Eye,
  Clock,
  User,
  ChevronDown,
  Filter,
  X,
  Download,
} from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";
import { Dialog, Menu } from "@headlessui/react";
import Layout from "../components/Layout";
import { saveAs } from "file-saver";

const isEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// --- Skeleton Loader Components ---
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 rounded-full w-24"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
    </td>
  </tr>
);

const TableSkeleton = ({ rows = 10 }) => (
  <div className="overflow-hidden shadow-md rounded-lg">
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="bg-indigo-50 text-indigo-900 uppercase text-xs font-semibold border-b border-indigo-100">
        <tr>
          <th scope="col" className="px-6 py-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> Time
            </div>
          </th>
          <th scope="col" className="px-6 py-4">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" /> Sender
            </div>
          </th>
          <th scope="col" className="px-6 py-4">
            Message
          </th>
          <th scope="col" className="px-6 py-4">
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" /> Email ID / Phone Number
            </div>
          </th>
          <th scope="col" className="px-6 py-4">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="text-sm divide-y divide-indigo-100">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </tbody>
    </table>
  </div>
);
// --- End Skeleton Components ---

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [emailFilter, setEmailFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [page, setPage] = useState(1);
  const [allEmails, setAllEmails] = useState([]);
  const [allPhoneNumbers, setAllPhoneNumbers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchMessages();
    fetchEmailsAndPhoneNumbers();
  }, [page, emailFilter, phoneFilter]);

  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      let url = `/user/messages?page=${page}&limit=10`;

      if (emailFilter) {
        url += `&email=${emailFilter}`;
      }

      if (phoneFilter) {
        url += `&phone=${phoneFilter}`;
      }

      const res = await api.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error("Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchEmailsAndPhoneNumbers = async () => {
    try {
      const res = await api.get("/user/messages/unique-emails-and-phones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllEmails(res.data.emails || []);
      setAllPhoneNumbers(res.data.phoneNumbers || []);
    } catch (err) {
      console.error("Failed to fetch emails and phone numbers", err);
    }
  };

  const openChatModal = async (contact) => {
    if (!contact) return; // safety

    setSelectedChat(contact);
    setLoadingChat(true);

    try {
      const key = isEmail(contact) ? "email" : "phone";
      const value = isEmail(contact) ? contact.toLowerCase() : contact;

      const res = await api.get(
        `/user/messages?${key}=${encodeURIComponent(value)}&limit=1000&page=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const msgs = (res.data?.messages ?? [])
        .slice()
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setChatHistory(msgs);
    } catch (err) {
      toast.error("Failed to load chat history");
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  };

  const closeModal = () => {
    setSelectedChat(null);
    setChatHistory([]);
  };

  const downloadChatPDF = async () => {
    if (!selectedChat) return;

    try {
      const isMail = isEmail(selectedChat);
      const url = isMail
        ? `/user/messages/${encodeURIComponent(selectedChat.toLowerCase())}/pdf`
        : `/user/messages/phone/${encodeURIComponent(selectedChat)}/pdf`;

      const res = await api.get(url, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const safeName = selectedChat.replace(/[^a-zA-Z0-9+@.]/g, "_");
      saveAs(blob, `chat_${safeName}.pdf`);
    } catch (err) {
      toast.error("Failed to download chat PDF");
      console.error(err);
    }
  };

  const downloadEmailsAndPhoneNumbersCSV = async () => {
    try {
      const response = await api.get(
        "/user/messages/download-emails-and-phone-numbers",
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const blob = new Blob([response.data], { type: "text/csv" });
      saveAs(blob, "emails_and_phone_numbers.csv");
    } catch (err) {
      toast.error("Failed to download combined CSV");
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="p-6 ml-64">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="text-purple-600 w-6 h-6" />
          <h2 className="text-2xl font-bold">Message History</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          View and manage all your message conversations in one place
        </p>

        <div className="flex justify-end mb-4">
          <button
            onClick={downloadEmailsAndPhoneNumbersCSV}
            className="inline-flex cursor-pointer mr-4 items-center gap-2 px-4 py-2 rounded-md bg-indigo-50 text-indigo-900 font-medium hover:bg-indigo-100 focus:outline-none"
          >
            <Download className="w-5 h-5" />
            Download Users Data
          </button>

          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-md bg-indigo-50 text-indigo-900 font-medium hover:bg-indigo-100 focus:outline-none">
              <Filter className="w-4 h-4" />
              Filter:{" "}
              {emailFilter || phoneFilter ? emailFilter || phoneFilter : "All"}
              <ChevronDown className="w-4 h-4" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg focus:outline-none z-50">
              <div className="py-1 max-h-64 overflow-y-auto overflow-x-hidden">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => {
                        setEmailFilter("");
                        setPhoneFilter("");
                        setPage(1);
                      }}
                      className={`w-full cursor-pointer text-left px-4 py-2 text-sm ${
                        !emailFilter && !phoneFilter
                          ? "bg-indigo-100 font-medium "
                          : active
                          ? "bg-gray-100"
                          : ""
                      }`}
                    >
                      All
                    </button>
                  )}
                </Menu.Item>
                {allEmails.map((email, idx) => (
                  <Menu.Item key={idx}>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          setEmailFilter(email);
                          setPhoneFilter("");
                          setPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          emailFilter === email
                            ? "bg-indigo-100 font-medium"
                            : active
                            ? "bg-gray-100"
                            : ""
                        }`}
                      >
                        {email}
                      </button>
                    )}
                  </Menu.Item>
                ))}
                {allPhoneNumbers.map((phone, idx) => (
                  <Menu.Item key={idx}>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          setPhoneFilter(phone);
                          setEmailFilter("");
                          setPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          phoneFilter === phone
                            ? "bg-indigo-100 font-medium"
                            : active
                            ? "bg-gray-100"
                            : ""
                        }`}
                      >
                        {phone}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Menu>
        </div>

        {/* 👇 UPDATED: Replaced spinner with skeleton loader */}
        {loadingMessages ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-hidden shadow-md rounded-lg">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="bg-indigo-50 text-indigo-900 uppercase text-xs font-semibold border-b border-indigo-100">
                <tr>
                  <th scope="col" className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Time
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" /> Sender
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Message
                  </th>
                  <th scope="col" className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> Email ID / Phone Number
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-indigo-100">
                {messages.map((msg, idx) => {
                  const contact = msg.email || msg.phone; // always present per your schema
                  return (
                    <tr
                      key={idx}
                      onClick={() => openChatModal(contact)}
                      className="hover:bg-indigo-50 cursor-pointer transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {new Date(msg.timestamp).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        <br />
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{msg.sender}</td>
                      <td className="px-6 py-4">{msg.content}</td>
                      <td className="px-6 py-4">
                        <span className="text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full text-xs font-medium">
                          {contact}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // avoid double triggering row click
                            openChatModal(contact);
                          }}
                          className="text-indigo-600 cursor-pointer hover:text-indigo-800 hover:scale-110 transition-transform duration-150"
                          title="View full chat"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end items-center px-4 py-4 bg-indigo-50 rounded-b-md text-sm text-gray-600 mt-2">
              <span className="mr-4">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className={`px-4 py-1.5 mr-2 rounded-full transition ${
                  page === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-indigo-100"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className={`px-4 py-1.5 rounded-full transition ${
                  page === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white hover:bg-indigo-100"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <Dialog
          open={!!selectedChat}
          onClose={closeModal}
          className="fixed z-50 inset-0 overflow-y-auto"
        >
          <div className="flex items-center justify-center min-h-screen bg-black/40 p-4">
            <Dialog.Panel className="bg-white w-full max-w-xl rounded-lg shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Mail className="text-purple-600 w-5 h-5" />
                  <span>Chat History: {selectedChat}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={downloadChatPDF}
                    className="text-gray-500 hover:text-blue-700 cursor-pointer"
                    title="Download Chat"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-red-700 cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {loadingChat ? (
                  <div className="flex justify-center items-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-indigo-600 border-solid"></div>
                  </div>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`max-w-[80%] rounded-2xl p-4 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "ml-auto bg-[#4f46e5] text-white rounded-tr-none"
                          : "bg-indigo-50 text-gray-800 rounded-tl-none"
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {msg.sender === "user" ? "You" : msg.sender}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-[11px] mt-2 opacity-80">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
}
