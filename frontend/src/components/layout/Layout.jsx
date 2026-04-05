// components/layout/Layout.jsx
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children, user, onLogout }) {
  return (
    <div className="flex h-screen overflow-hidden">

      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 bg-gray-100 overflow-y-auto">

        <Header user={user} onLogout={onLogout} />

        <div className="p-6 max-w-350 mx-auto">
          {children}
        </div>

      </div>
    </div>
  );
}