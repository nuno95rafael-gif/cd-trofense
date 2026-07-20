import { Badge } from "@/components/ui/badge";

export function StatusPill({ status, testid }) {
  const map = {
    "Ótimo": "pill-otimo",
    "Normal": "pill-otimo",
    "Peso normal": "pill-otimo",
    "Baixo": "pill-otimo", // Σ8 baixo é bom
    "Atenção": "pill-atencao",
    "Médio": "pill-atencao",
    "Sobrepeso": "pill-atencao",
    "Alto": "pill-alto",
    "Baixo peso": "pill-alto",
    "Obesidade I": "pill-alto",
    "Obesidade II": "pill-alto",
    "Obesidade III": "pill-alto",
  };
  const cls = map[status] || "bg-muted text-muted-foreground";
  return (
    <Badge data-testid={testid} className={`rounded-full font-medium px-3 py-0.5 border-0 ${cls}`}>
      {status || "—"}
    </Badge>
  );
}
