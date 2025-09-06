import { FileDown, LogOut } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function Header() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
  }
  const handleDownload = async () => {
    try {
      const res = await api.get("/user/report/download", {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `chatbot_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Report downloaded");
    } catch (err) {
      toast.error("Failed to download report");
      console.error(err);
    }
  };

  return (
    <header className="flex justify-between items-center ml-64 px-6 py-6 bg-white shadow-sm">
      <div className="flex items-center space-x-3">
        <h1 className="bg-gradient-to-r from-[#008080] via-[#8000ff] to-[#ff2bb0] bg-clip-text text-transparent font-bold text-2xl">
          User Dashboard
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white cursor-pointer px-5 py-2 rounded-lg shadow transition-all duration-200"
        >
          <FileDown size={18} />
          Download Report
        </button>
      </div>
    </header>
  );
}
