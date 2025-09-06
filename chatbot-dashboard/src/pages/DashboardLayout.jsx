import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <div className="bg-gray-100 min-h-screen text-gray-800">
      <Sidebar />
      <main className="ml-64 p-6 bg-white min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
