import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/cdt-logo.png";

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
      {/* Painel esquerdo — identidade do clube */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[hsl(var(--sidebar))] text-white relative overflow-hidden">
        {/* Emblema como marca d'água gigante */}
        <div
          className="absolute -bottom-32 -right-32 w-[520px] h-[520px] opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${logo})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
          aria-hidden
        />
        {/* Faixa vermelha topo */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
        {/* Faixa amarela fina abaixo */}
        <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-[hsl(var(--club-yellow))]" />

        <div className="flex items-center gap-4 relative z-10">
          <img src={logo} alt="CD Trofense" className="w-16 h-16 drop-shadow-xl" data-testid="login-logo" />
          <div>
            <div className="font-display text-2xl font-bold tracking-tight leading-none">CD TROFENSE</div>
            <div className="text-sm text-white/60 mt-1">Composição Corporal</div>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-none tracking-tighter">
            Cada grama<br />
            <span className="text-primary">conta.</span>
          </h1>
          <p className="mt-6 text-white/70 max-w-md leading-relaxed">
            Plataforma clínica do departamento médico para gerir avaliações antropométricas,
            evolução e objetivos dos atletas.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-1 h-8 bg-primary" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Desde 1930</div>
              <div className="text-sm italic text-white/70">História, paixão e glória</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 font-semibold">
          <span className="text-[hsl(var(--club-yellow))]">★</span>
          <span>Clube Desportivo Trofense</span>
          <span className="text-[hsl(var(--club-yellow))]">★</span>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex items-center justify-center p-6 relative">
        {/* Faixa vermelha topo (só mobile) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary lg:hidden" />
        <Card className="w-full max-w-md p-8 border-t-4 border-t-primary">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src={logo} alt="CD Trofense" className="w-11 h-11" />
            <div>
              <div className="font-display text-xl font-bold">CD TROFENSE</div>
              <div className="text-xs text-muted-foreground">Composição Corporal</div>
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">Iniciar sessão</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Introduza as suas credenciais para aceder à plataforma.
          </p>
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
