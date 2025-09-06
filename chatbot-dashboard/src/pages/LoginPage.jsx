import { useState } from "react";
import { useAuth } from "../context/AuthContext"; // Import the useAuth hook
import api from "../services/api";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LoginPage = () => {
  const { login } = useAuth(); // Use the login function from the context
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/admin/login", {
        email,
        password,
      });

      // The login function from the context now handles everything:
      // setting state, localStorage, and navigating.
      login(res.data);

      toast.success("Login successful 🎉");
    } catch (err) {
      console.error(err);
      const errorMsg =
        err.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
            Troika Tech
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Chatbot Management Dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              placeholder="admin@troika.ai"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-800"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full cursor-pointer bg-gradient-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-lg font-semibold shadow-md transition-all ${
              loading
                ? "opacity-60 cursor-not-allowed"
                : "hover:from-blue-500 hover:to-teal-400"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                {/* SVG Loader */}
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Logging in...
              </div>
            ) : (
              "Login to Dashboard"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()}{" "}
          <span className="text-gray-600 font-medium">Troika Tech</span>. All
          rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
