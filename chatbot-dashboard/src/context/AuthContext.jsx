import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  // On initial app load, check localStorage for existing session
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");

    if (storedToken && storedUser && storedRole) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setRole(storedRole);
    }
  }, []);

  // Login function
  const login = (authData) => {
    const { token, role, user } = authData;

    // Set state
    setToken(token);
    setRole(role);
    setUser(user);

    // Set localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("user", JSON.stringify(user));

    // Navigate to the correct dashboard
    if (role === "admin") {
      navigate("/dashboard/overview");
    } else {
      navigate("/user/dashboard");
    }
  };

  // Logout function
  const logout = () => {
    // Clear state
    setToken(null);
    setRole(null);
    setUser(null);

    // Clear localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    // Navigate to login page
    navigate("/");
  };

  // The value provided to consuming components
  const value = {
    user,
    token,
    role,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create a custom hook to use the auth context easily
export const useAuth = () => {
  return useContext(AuthContext);
};
