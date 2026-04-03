// components/layout/Layout.jsx
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children, user, onLogout }) {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 bg-gray-100 min-h-screen">
        <Header user={user} onLogout={onLogout} />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}