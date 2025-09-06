// src/pages/CompaniesPage.js

import { useState, useEffect } from "react";
import api from "../services/api";
import CompanyTable from "../components/CompanyTable";
import AddCompanyModal from "../components/AddCompanyModal";
import CompanyModal from "../components/CompanyModal"; // The "Edit" modal
import { useAuth } from "../context/AuthContext"; // 👈 1. Import useAuth
import { Search, Plus } from "lucide-react"; // 👈 2. Import icons

const CompaniesPage = () => {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState(null);

  const { token } = useAuth(); // 👈 3. Get token from context

  const fetchCompanies = async () => {
    // This ensures the skeleton shows on manual refresh, not just initial load
    if (!loading) setLoading(true);

    try {
      // Use token from context for the API call
      const res = await api.get("/company/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data.companies || []);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 👈 4. Fetch only if the token is available
    if (token) {
      fetchCompanies();
    }
  }, [token]); // Re-run the effect if the token changes

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // 5. The main page no longer needs a separate loading spinner.
  // The skeleton loader inside CompanyTable will handle the loading UI.

  return (
    <>
      <div className="p-4 md:p-6">
        {/* --- ADDED: Enhanced Page Header --- */}
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 self-start sm:self-center">
            Manage Companies
          </h1>
          <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search companies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Add Company
            </button>
          </div>
        </header>
        {/* --- END: Enhanced Page Header --- */}

        <CompanyTable
          companies={filtered}
          refresh={fetchCompanies}
          onEditCompany={setEditingCompany}
          loading={loading} // 👈 6. Pass loading prop to activate the skeleton
        />
      </div>

      {/* Modals remain at the top level for proper stacking */}
      {showAddModal && (
        <AddCompanyModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchCompanies}
        />
      )}

      {editingCompany && (
        <CompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          refresh={fetchCompanies}
        />
      )}
    </>
  );
};

export default CompaniesPage;