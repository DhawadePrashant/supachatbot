// src/components/Layout.jsx
import React from "react";
import Header from "./Header";
import Sidebar from "./UserSidebar";

export default function Layout({ children, chatbotId  }) {
  return (
    <div className="flex">
      <Sidebar chatbotId={chatbotId}/>
      <div className="flex flex-col flex-1 min-h-screen">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
}
