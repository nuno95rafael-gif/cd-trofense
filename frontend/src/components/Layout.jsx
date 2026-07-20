import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FileBarChart, Database, Sun, Moon, LogOut, Dumbbell, Target } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard", editorOnly: false },
  { to: "/objetivos-equipa", label: "Objetivos de Equipa", icon: Target, testid: "nav-team-goals", editorOnly: false },
  { to: "/relatorio", label: "Relatório Mensal", icon: FileBarChart, testid: "nav-report", editorOnly: false },
  { to: "/utilizadores", label: "Utilizadores", icon: Users, testid: "nav-users", editorOnly: true },
  { to: "/backup", label: "Backup", icon: Database, testid: "nav-backup", editorOnly: true },
];

export function Layout() {
  const { user, logout, isEditor } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] flex flex-col border-r border-black/20">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight leading-none">CD TROFENSE</div>
            <div className="text-xs text-white/60 mt-0.5">Departamento Médico</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {links
            .filter((l) => !l.editorOnly || isEditor)
            .map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={l.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="px-3 py-2 text-xs">
            <div className="font-medium text-white/90">{user?.name}</div>
            <div className="text-white/50">{user?.email}</div>
            <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] uppercase tracking-wider font-semibold">
              {user?.role}
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
            onClick={toggle}
            data-testid="toggle-theme-btn"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
