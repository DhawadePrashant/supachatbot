import { useRef, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";
// import axios from "axios";

const UploadContextModal = ({ chatbotId }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatbotId", chatbotId);

    try {
      setUploading(true);

      const response = await api.post("/context/upload-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      

      toast.success(`✅ ${response.data.chunksStored} chunks stored.`);
    } catch (err) {
      console.error("Upload error:", err.response?.data || err.message);
      toast("❌ Failed to upload or process file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
        className={`px-3 py-1 rounded ${
          uploading ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
        } text-white text-sm`}
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {fileName && <span className="text-xs text-gray-400">{fileName}</span>}
      <input
        type="file"
        accept=".txt,.pdf,.docx"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default UploadContextModal;
