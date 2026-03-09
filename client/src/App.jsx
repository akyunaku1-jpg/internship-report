import { Navigate, Route, Routes } from "react-router-dom";
import { SUPABASE_CONFIG_ERROR } from "./lib/supabase";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmployeeList from "./pages/EmployeeList";
import AddEmployee from "./pages/AddEmployee";
import EmployeeDetail from "./pages/EmployeeDetail";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import PageWrapper from "./components/layout/PageWrapper";
import SubmitReport from "./pages/SubmitReport";
import ReportHistory from "./pages/ReportHistory";
import TaskAttachments from "./pages/TaskAttachments";
import Teams from "./pages/Teams";
import DataExport from "./pages/DataExport";

const Placeholder = ({ title }) => <PageWrapper title={title}><div className="card p-8">{title} page coming soon.</div></PageWrapper>;

export default function App() {
  if (SUPABASE_CONFIG_ERROR) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <h1 className="text-lg font-semibold">Configuration error</h1>
          <p className="mt-2 text-sm">
            {SUPABASE_CONFIG_ERROR}
          </p>
          <p className="mt-2 text-sm">
            Add these variables in Vercel Project Settings - Environment Variables:
            <br />
            <code>VITE_SUPABASE_URL</code>
            <br />
            <code>VITE_SUPABASE_ANON_KEY</code>
            <br />
            <code>VITE_API_URL</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/task-attachments"
        element={
          <ProtectedRoute>
            <TaskAttachments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Teams />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-accounts"
        element={
          <ProtectedRoute roles={["admin"]}>
            <EmployeeList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute roles={["admin"]}>
            <EmployeeList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/new"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AddEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id/edit"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AddEmployee />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute roles={["admin"]}>
            <EmployeeDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id/onboarding"
        element={
          <ProtectedRoute roles={["admin"]}>
            <EmployeeOnboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <ReportHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/data-export"
        element={
          <ProtectedRoute>
            <DataExport />
          </ProtectedRoute>
        }
      />
      <Route path="/organization" element={<ProtectedRoute><Placeholder title="Organization" /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Placeholder title="Attendance" /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><Placeholder title="Payroll" /></ProtectedRoute>} />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <SubmitReport />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
