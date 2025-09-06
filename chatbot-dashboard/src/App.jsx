import React from "react";
// MODIFIED: Removed BrowserRouter as Router, as it's provided by a parent file
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./pages/DashboardLayout";
import OverviewPage from "./pages/OverviewPage";
import CompaniesPage from "./pages/CompaniesPage";
import ChatbotPage from "./pages/ChatbotPage";
import ManageAdminsPage from "./pages/ManageAdminsPage";
import UserDashboard from "./pages/UserDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import MessageHistoryPage from "./pages/MessageHistoryPage";
import EnquiriesPage from "./pages/EnquiresPage";
import ClientConfigPage from "./pages/ClientConfigPage";
import "./App.css";
import CustomizePage from "./pages/CustomizePage";

function App() {
  // REMOVED: The <Router> component was removed from here.
  // The AuthProvider is now the top-level component in this file.
  return (
    <AuthProvider>
      <ToastContainer position="top-center" autoClose={3000} />
      <Routes>
        <Route path="/" element={<LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="admin">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="companies" element={<CompaniesPage />} />
          <Route path="chatbots" element={<ChatbotPage />} />
          <Route path="config" element={<ClientConfigPage />} />
          <Route
            path="manage-admins"
            element={
              <ProtectedRoute role="admin" superAdminOnly={true}>
                <ManageAdminsPage />
              </ProtectedRoute>
            }
          />
          <Route path="customize/:chatbotId" element={<CustomizePage />} />
        </Route>

        {/* User routes */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute role="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/message-history"
          element={
            <ProtectedRoute role="user">
              <MessageHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/enquiries/:chatbotId"
          element={
            <ProtectedRoute role="user">
              <EnquiriesPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
