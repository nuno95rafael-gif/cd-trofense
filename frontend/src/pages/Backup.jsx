import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function Backup() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/athletes").then((r) => setStats({ athletes: r.data.length }));
  }, []);

  const exportJson = async () => {
    try {
      const athletes = (await api.get("/athletes")).data;
      const full = { athletes: [], evaluations: [], weighins: [], photos_meta: [] };
      for (const a of athletes) {
        full.athletes.push(a);
        full.evaluations.push(...((await api.get(`/athletes/${a.id}/evaluations`)).data));
        full.weighins.push(...((await api.get(`/athletes/${a.id}/weighins`)).data));
        full.photos_meta.push(...((await api.get(`/athletes/${a.id}/photos`)).data));
      }
      const blob = new Blob([JSON.stringify(full, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trofense-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Backup gerado");
    } catch (e) {
      toast.error("Falha ao gerar backup");
    }
  };

  const exportCsv = async () => {
    try {
      const athletes = (await api.get("/athletes")).data;
      const rows = ["Nome;Posicao;Sexo;Altura;Idade;Peso;MG%;MM_kg;IMC;Estado"];
      for (const a of athletes) {
        const m = a.last_metrics || {};
        rows.push([
          a.nome, a.posicao || "", a.sexo, a.altura_cm || "", a.idade || "",
          a.last_weight ?? "", m.bf_average ?? "", m.muscle_mass_kg ?? "", m.imc ?? "", m.status ?? "",
        ].join(";"));
      }
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trofense-resumo-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    } catch (e) {
      toast.error("Falha ao exportar");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Administração</div>
        <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Backup e Exportação</h1>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold">Backup JSON completo</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Descarrega todos os atletas, avaliações, pesagens e metadados das fotos.
          </p>
          <Button onClick={exportJson} data-testid="backup-json-btn" className="gap-2">
            <Download className="w-4 h-4" /> Descarregar JSON
          </Button>
        </Card>
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold">Resumo CSV</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Exporta o resumo dos atletas e últimas métricas para folha de cálculo.
          </p>
          <Button onClick={exportCsv} data-testid="export-csv-btn" variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Descarregar CSV
          </Button>
        </Card>
      </div>
      {stats && (
        <p className="text-xs text-muted-foreground mt-6">
          {stats.athletes} atletas no sistema.
        </p>
      )}
    </div>
  );
}
