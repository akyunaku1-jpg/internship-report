import Sidebar from "./Sidebar";
import Header from "./Header";
import NotificationPanel from "../ui/NotificationPanel";

export default function PageWrapper({ title, children }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="ml-20 md:ml-64">
        <Header title={title} />
        <main className="thin-scrollbar p-4 md:p-6">{children}</main>
      </div>
      <NotificationPanel />
    </div>
  );
}
