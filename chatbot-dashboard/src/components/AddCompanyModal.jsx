import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import api from "../services/api";
import { toast } from "react-toastify";

const AddCompanyModal = ({ onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;

  const handleAdd = async () => {
    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      setShake(true);
      setTimeout(() => setShake(false), 500); // reset after animation
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("adminToken");
      await api.post(
        "/company/create",
        { name, url, email, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Company added successfully.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add company.");
      console.error("Failed to add company:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        // MODIFIED: Removed bg-black/50
        className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-8 w-full max-w-md"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Add New Company
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Fill in the details to create a new company account.
          </p>

          <div className="space-y-4">
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              placeholder="Company Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              placeholder="Domain"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Password Field */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all pr-10"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password Field with shake animation */}
            <motion.div
              animate={
                shake
                  ? { x: [0, -8, 8, -8, 8, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all pr-10"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </motion.div>

            {/* Password Match Indicator */}
            {password && confirmPassword && passwordsMatch && (
              <p className="text-sm mt-1 text-green-600">
                ✅ Passwords match
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className={`px-6 py-2 rounded-xl text-white font-medium shadow-md transition-all ${
                loading
                  ? "bg-gradient-to-r from-blue-400 to-teal-300 opacity-60 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400"
              }`}
            >
              {loading ? "Adding..." : "Add Company"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddCompanyModal;