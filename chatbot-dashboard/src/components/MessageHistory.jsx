import { useEffect, useState } from "react";
import api from "../services/api";
import { saveAs } from "file-saver";

const MessageHistory = ({ chatbotId }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await api.get(`/chatbot/messages/${chatbotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = "User,Message,Response,Timestamp\n";
    const rows = [];

    let i = 0;
    while (i < messages.length) {
      const userMsg = messages[i];
      const botMsg = messages[i + 1];

      if (userMsg?.sender === "user" && botMsg?.sender === "bot") {
        rows.push(
          [
            userMsg.sender,
            `"${userMsg.content}"`,
            `"${botMsg.content}"`,
            new Date(userMsg.timestamp).toLocaleString(),
          ].join(",")
        );
        i += 2;
      } else {
        i += 1;
      }
    }

    const csv = headers + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    saveAs(blob, "chatbot_messages.csv");
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  if (loading)
    return <p className="text-gray-500 italic">Loading messages...</p>;

  if (!messages.length)
    return <p className="text-gray-500 italic">No messages found.</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {messages.length} message{messages.length !== 1 && "s"}
        </p>
        <button
          onClick={exportCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded text-sm font-medium shadow"
        >
          Export CSV
        </button>
      </div>

      {/* Messages */}
      <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-[60vh] divide-y divide-gray-200 bg-white shadow-sm">
        {messages.map((msg) => (
          <div key={msg.id} className="p-4">
            <p className="text-sm font-semibold text-gray-700 capitalize">
              {msg.sender}:
            </p>
            <p className="text-gray-800 mt-1">{msg.content}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(msg.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MessageHistory;
