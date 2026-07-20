import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (!res.ok) toast.error(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[hsl(var(--sidebar))] text-white relative overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-2xl font-bold tracking-tight leading-none">CD TROFENSE</div>
            <div className="text-sm text-white/60">Composição Corporal</div>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-none tracking-tighter">
            Cada grama<br />conta.
          </h1>
          <p className="mt-6 text-white/70 max-w-md">
            Plataforma clínica do departamento médico para gerir avaliações antropométricas, evolução e objetivos dos
            atletas.
          </p>
        </div>
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 20% 80%, rgba(16,185,129,0.4) 0, transparent 50%)",
          }}
        />
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="font-display text-xl font-bold">CD TROFENSE</div>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Iniciar sessão</h2>
          <p className="text-sm text-muted-foreground mt-1">Introduza as suas credenciais para aceder à plataforma.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@trofense.pt"
              />
            </div>
            <div>
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-btn"
              className="w-full h-11 font-semibold"
              disabled={submitting}
            >
              {submitting ? "A entrar..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
