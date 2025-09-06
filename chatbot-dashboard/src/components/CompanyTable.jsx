import { useState } from "react";
import UploadContextModal from "./UploadContextModal";
import AddChatbotModal from "./AddChatbotModal";
import api from "../services/api";
import { toast } from "react-toastify";

// --- ADDED: Skeleton Loader Component ---
const SkeletonRow = () => (
  <tr className="bg-white/70">
    <td className="p-4">
      <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-4 bg-gray-300 rounded animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-8 w-24 bg-gray-300 rounded-lg animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-8 w-20 bg-gray-300 rounded-lg animate-pulse"></div>
    </td>
    <td className="p-4">
      <div className="h-8 w-20 bg-gray-300 rounded-lg animate-pulse"></div>
    </td>
  </tr>
);

const TableSkeleton = ({ rows = 5 }) => (
  <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 backdrop-blur-md bg-white/60">
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="bg-gradient-to-r from-slate-700 to-slate-900 text-white uppercase tracking-wider">
        <tr>
          <th className="p-4">Name</th>
          <th className="p-4">Domain</th>
          <th className="p-4">Upload</th>
          <th className="p-4">Del Chatbot</th>
          <th className="p-4">Del Company</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonRow key={index} />
        ))}
      </tbody>
    </table>
  </div>
);
// --- END: Skeleton Loader Component ---

const CompanyTable = ({ companies, refresh, onEditCompany, loading }) => { // 👈 ADDED loading prop
  const [selectedCompanyForAdd, setSelectedCompanyForAdd] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleCreateChatbot = async (companyId, name) => {
    try {
      const token = localStorage.getItem("adminToken");
      await api.post(
        "/chatbot/create",
        { companyId, name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Chatbot created ✅");
      refresh();
    } catch (error) {
      console.error(
        "Error creating chatbot:",
        error.response?.data || error.message
      );
      toast.error(error.response?.data?.message || "Failed to create chatbot.");
    }
  };

  const handleDeleteChatbot = async (e, chatbotId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chatbot?"))
      return;

    try {
      const token = localStorage.getItem("adminToken");
      await api.delete(`/chatbot/delete/${chatbotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Chatbot deleted");
      refresh();
    } catch (error) {
      console.error("Error deleting chatbot:", error);
      toast.error("Failed to delete chatbot.");
    }
  };

  const handleDeleteCompany = async (e, companyId) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "This will delete the company and all its chatbots. Continue?"
      )
    )
      return;

    try {
      const token = localStorage.getItem("adminToken");
      await api.delete(`/company/delete/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Company deleted");
      refresh();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company.");
    }
  };

  // 👇 ADDED: Conditional rendering for the skeleton loader
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 backdrop-blur-md bg-white/60">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="bg-gradient-to-r from-slate-700 to-slate-900 text-white uppercase tracking-wider">
          <tr>
            <th className="p-4">Name</th>
            <th className="p-4">Domain</th>
            <th className="p-4">Upload</th>
            <th className="p-4">Del Chatbot</th>
            <th className="p-4">Del Company</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company, index) => (
            <tr
              key={company._id}
              onClick={() => onEditCompany(company)}
              className={`transition-all duration-200 hover:shadow-md hover:bg-blue-50/90 cursor-pointer ${
                index % 2 === 0 ? "bg-white/70" : "bg-gray-50/70"
              }`}
            >
              <td className="p-4 font-medium">{company.name}</td>
              <td className="p-4 text-blue-600 underline">{company.url}</td>
              <td className="p-4" onClick={(e) => e.stopPropagation()}>
                {company.chatbots?.length > 0 ? (
                  <UploadContextModal chatbotId={company.chatbots[0]._id} />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="p-4">
                {Array.isArray(company.chatbots) &&
                company.chatbots.length > 0 ? (
                  <button
                    onClick={(e) =>
                      handleDeleteChatbot(e, company.chatbots[0]._id)
                    }
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white shadow hover:scale-105 transition-transform"
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCompanyForAdd(company);
                      setShowAddModal(true);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white shadow hover:scale-105 transition-transform"
                  >
                    Create
                  </button>
                )}
              </td>
              <td className="p-4">
                <button
                  onClick={(e) => handleDeleteCompany(e, company._id)}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow hover:scale-105 transition-transform"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && selectedCompanyForAdd && (
        <AddChatbotModal
          company={selectedCompanyForAdd}
          onClose={() => {
            setSelectedCompanyForAdd(null);
            setShowAddModal(false);
          }}
          onCreate={handleCreateChatbot}
        />
      )}
    </div>
  );
};

export default CompanyTable;