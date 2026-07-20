import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/StatusPill";
import { AthleteForm } from "@/components/AthleteForm";
import { EvaluationForm } from "@/components/EvaluationForm";
import { EvaluationCharts } from "@/components/EvaluationCharts";
import { WeighinsPanel } from "@/components/WeighinsPanel";
import { PhotosPanel } from "@/components/PhotosPanel";
import { GoalsPanel } from "@/components/GoalsPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export default function AthleteProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { isEditor } = useAuth();
  const [athlete, setAthlete] = useState(null);
  const [evals, setEvals] = useState([]);
  const [weighins, setWeighins] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  const reload = async () => {
    const a = await api.get(`/athletes/${id}`);
    setAthlete(a.data);
    const e = await api.get(`/athletes/${id}/evaluations`);
    setEvals(e.data);
    const w = await api.get(`/athletes/${id}/weighins`);
    setWeighins(w.data);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (!athlete) return <div className="p-8">A carregar…</div>;

  const last = evals[evals.length - 1];
  const metrics = last?.metrics;

  const doDelete = async () => {
    try {
      await api.delete(`/athletes/${id}`);
      toast.success("Atleta apagado");
      nav("/");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const updateAthlete = async (vals) => {
    try {
      const { data } = await api.put(`/athletes/${id}`, vals);
      setAthlete(data);
      toast.success("Atleta atualizado");
      setEditOpen(false);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4" onClick={() => nav("/")} data-testid="back-btn">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{athlete.posicao || "Atleta"}</div>
            <h1 className="font-display text-5xl font-bold tracking-tighter mt-1" data-testid="athlete-header-name">
              {athlete.nome}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <StatusPill status={metrics?.status} testid="header-status" />
              <span className="text-sm text-muted-foreground">
                {athlete.sexo === "M" ? "Masc." : "Fem."} · {athlete.idade || "—"} anos · {athlete.altura_cm || "—"} cm
              </span>
            </div>
          </div>
          {isEditor && (
            <div className="flex gap-2">
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="edit-athlete-btn"><Pencil className="w-4 h-4 mr-2" />Editar</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Editar atleta</DialogTitle></DialogHeader>
                  <AthleteForm initial={athlete} onSubmit={updateAthlete} />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" data-testid="delete-athlete-btn"><Trash2 className="w-4 h-4 mr-2" />Apagar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apagar {athlete.nome}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação apaga o atleta e todo o seu histórico (avaliações, pesagens e fotos). Não é reversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={doDelete} data-testid="confirm-delete-athlete">Apagar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
          <Kpi label="Peso" value={last?.peso_kg ?? athlete.peso_atual_kg} unit="kg" testid="kpi-peso" />
          <Kpi label="% MG (R&W)" value={metrics?.rw} unit="%" testid="kpi-mg" />
          <Kpi label="Massa Gorda" value={metrics?.fat_mass_kg} unit="kg" testid="kpi-mg-kg" />
          <Kpi label="Massa Magra" value={metrics?.lean_mass_kg} unit="kg" testid="kpi-lean" />
          <Kpi label="Massa Muscular (Lee)" value={metrics?.muscle_mass_kg} unit="kg" testid="kpi-mm" />
          <Kpi label="MM/MG · IMC · Σ8" value={metrics ? `${metrics.mm_mg_ratio ?? "—"} · ${metrics.imc ?? "—"} · ${metrics.soma8 != null ? Math.round(metrics.soma8) : "—"}` : "—"} testid="kpi-multi" />
        </div>
        {metrics && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Comparativo entre métodos · % MG
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MethodBox label="Reilly & Wallace" value={metrics.rw} />
              <MethodBox label="Jackson-Pollock 7" value={metrics.jp7} />
              <MethodBox label="Evans 7" value={metrics.evans7} />
              <MethodBox label="Evans 3" value={metrics.evans3} />
              <MethodBox label="Withers" value={metrics.withers} />
            </div>
          </div>
        )}
      </Card>

      <Tabs defaultValue="avaliacoes">
        <TabsList className="mb-4">
          <TabsTrigger value="avaliacoes" data-testid="tab-avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="pesagens" data-testid="tab-pesagens">Pesagens</TabsTrigger>
          <TabsTrigger value="fotos" data-testid="tab-fotos">Fotos</TabsTrigger>
          <TabsTrigger value="objetivos" data-testid="tab-objetivos">Objetivos</TabsTrigger>
        </TabsList>

        <TabsContent value="avaliacoes" className="space-y-6">
          {evals.length > 1 && (
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold mb-4">Evolução</h3>
              <EvaluationCharts evals={evals} />
            </Card>
          )}
          {isEditor && (
            <Card className="p-6">
              <h3 className="font-display text-xl font-bold mb-4">Nova avaliação</h3>
              <EvaluationForm athlete={athlete} onSaved={reload} />
            </Card>
          )}
          <Card className="p-6">
            <h3 className="font-display text-xl font-bold mb-4">Histórico ({evals.length})</h3>
            {evals.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem avaliações registadas.</p>
            ) : (
              <div className="space-y-2">
                {[...evals].reverse().map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border">
                    <div className="text-sm">
                      <div className="font-medium">{new Date(e.date).toLocaleDateString("pt-PT")}</div>
                      <div className="text-muted-foreground text-xs">{e.peso_kg ? `${e.peso_kg} kg` : ""}</div>
                    </div>
                    <div className="flex items-center gap-4 num text-sm">
                      <span>MG(R&W) <b>{e.metrics?.rw ?? "—"}%</b></span>
                      <span>MM <b>{e.metrics?.muscle_mass_kg ?? "—"} kg</b></span>
                      <span>IMC <b>{e.metrics?.imc ?? "—"}</b></span>
                      <span>Σ8 <b>{e.metrics?.soma8 != null ? Math.round(e.metrics.soma8) : "—"}</b></span>
                      <StatusPill status={e.metrics?.status_rw ?? e.metrics?.status} />
                      {isEditor && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`delete-eval-${e.id}`}
                          onClick={async () => {
                            await api.delete(`/evaluations/${e.id}`);
                            reload();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pesagens">
          <WeighinsPanel athleteId={id} weighins={weighins} onChange={reload} isEditor={isEditor} />
        </TabsContent>

        <TabsContent value="fotos">
          <PhotosPanel athleteId={id} isEditor={isEditor} />
        </TabsContent>

        <TabsContent value="objetivos">
          <GoalsPanel athlete={athlete} evaluations={evals} onSaved={reload} isEditor={isEditor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ label, value, unit, testid }) {
  return (
    <div data-testid={testid}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 font-display font-bold tracking-tighter num text-3xl">
        {value ?? "—"}
        {value != null && unit ? <span className="text-lg text-muted-foreground ml-1">{unit}</span> : null}
      </div>
    </div>
  );
}

function MethodBox({ label, value }) {
  return (
    <div className="p-3 rounded-md border bg-secondary/40">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="num font-display text-2xl font-bold">{value ?? "—"}<span className="text-sm text-muted-foreground">%</span></div>
    </div>
  );
}
