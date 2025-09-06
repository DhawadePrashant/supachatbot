import { useEffect, useState } from "react";
import { fetchClientConfig, updateClientConfig } from "../services/api";

const EditClientConfigModal = ({ chatbot, onClose }) => {
  const [config, setConfig] = useState({
    demo_message: "",
    demo_link: "",
    default_suggestions: "",
    demo_keywords: "",
    curtom_intro: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatbot?._id) {
      fetchClientConfig(chatbot._id)
        .then((res) => {
          // console.log("Fetched config:", res.data);
          const data = res.data.config;
          setConfig({
            demo_message: data.demo_message || "",
            demo_link: data.demo_link || "",
            default_suggestions: (data.default_suggestions || []).join(", "),
            demo_keywords: (data.demo_keywords || []).join(", "),
          });
          setLoading(false); // ✅ correctly placed
        })
        .catch((err) => {
          console.error("Config fetch error", err);
          setLoading(false); // ✅ also good to prevent modal freeze on error
        });
    }
  }, [chatbot]);

  const handleSave = async () => {
    try {
      const payload = {
        demo_message: config.demo_message,
        demo_link: config.demo_link,
        default_suggestions: config.default_suggestions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        demo_keywords: config.demo_keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await updateClientConfig(chatbot._id, payload);
      alert("✅ Client config updated!");
      onClose();
    } catch (err) {
      console.error("Update error", err);
      alert("❌ Failed to update config");
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6 relative shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          ✏️ Edit Client Config – {chatbot.name}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Demo Message</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded"
              rows={3}
              value={config.demo_message}
              onChange={(e) =>
                setConfig({ ...config, demo_message: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Demo Link</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={config.demo_link}
              onChange={(e) =>
                setConfig({ ...config, demo_link: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Default Suggestions (comma-separated)
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={config.default_suggestions}
              onChange={(e) =>
                setConfig({ ...config, default_suggestions: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Demo Keywords (comma-separated)
            </label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded"
              value={config.demo_keywords}
              onChange={(e) =>
                setConfig({ ...config, demo_keywords: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditClientConfigModal;
