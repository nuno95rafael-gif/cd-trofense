import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AthleteNew from "@/pages/AthleteNew";
import AthleteProfile from "@/pages/AthleteProfile";
import Users from "@/pages/Users";
import MonthlyReport from "@/pages/MonthlyReport";
import Backup from "@/pages/Backup";
import TeamGoals from "@/pages/TeamGoals";
import WeighinsHistory from "@/pages/WeighinsHistory";
import "@/App.css";

function Protected({ children, editorOnly }) {
  const { user, loading, isEditor } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (editorOnly && !isEditor) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="/atletas/novo" element={<Protected editorOnly><AthleteNew /></Protected>} />
              <Route path="/atletas/:id" element={<AthleteProfile />} />
              <Route path="/objetivos-equipa" element={<TeamGoals />} />
              <Route path="/pesagens" element={<WeighinsHistory />} />
              <Route path="/relatorio" element={<MonthlyReport />} />
              <Route path="/utilizadores" element={<Protected editorOnly><Users /></Protected>} />
              <Route path="/backup" element={<Protected editorOnly><Backup /></Protected>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
