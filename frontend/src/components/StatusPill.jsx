import { Badge } from "@/components/ui/badge";

export function StatusPill({ status, testid }) {
  const map = {
    "Ótimo": "pill-otimo",
    "Atenção": "pill-atencao",
    "Alto": "pill-alto",
  };
  const cls = map[status] || "bg-muted text-muted-foreground";
  return (
    <Badge data-testid={testid} className={`rounded-full font-medium px-3 py-0.5 border-0 ${cls}`}>
      {status || "—"}
    </Badge>
  );
}
