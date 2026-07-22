import { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload, FileJson, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Backup() {
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/athletes").then((r) => setStats({ athletes: r.data.length })).catch(() => {});
  }, []);

  // ---------- Export ----------
  const exportJson = async () => {
    setBusy(true);
    try {
      const t = toast.loading("A gerar backup completo (pode demorar se tiver muitas fotos)...");
      const { data } = await api.get("/backup/export", { timeout: 5 * 60_000 });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `trofense-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Backup gerado: ${data.athletes?.length || 0} atletas, ${data.evaluations?.length || 0} avaliações, ${data.photos?.length || 0} fotos`,
        { id: t }
      );
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Falha ao gerar backup");
    } finally {
      setBusy(false);
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
    } catch {
      toast.error("Falha ao exportar");
    }
  };

  // ---------- Restore ----------
  const fileRef = useRef(null);
  const [parsedBackup, setParsedBackup] = useState(null);  // { athletes, evaluations, weighins, photos, filename, sizeMB }
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const onFileSelected = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLastResult(null);
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      // Aceita 2 formatos: novo (v1 do endpoint) OU legacy (mainData.athletes)
      let normalized;
      if (Array.isArray(json.athletes)) {
        normalized = {
          athletes: json.athletes || [],
          evaluations: json.evaluations || [],
          weighins: json.weighins || [],
          photos: json.photos || json.photos_meta || [],
          filename: f.name,
          sizeMB: (f.size / 1024 / 1024).toFixed(2),
        };
      } else {
        toast.error("Formato de ficheiro inválido: falta o campo 'athletes'.");
        return;
      }
      setParsedBackup(normalized);
    } catch (err) {
      toast.error(`Erro a ler o ficheiro: ${err.message}`);
    }
  };

  const doImport = async () => {
    if (!parsedBackup) return;
    setShowConfirm(false);
    setBusy(true);
    const t = toast.loading("A importar backup — pode demorar 1-2 minutos com fotos...");
    try {
      const { data } = await api.post("/backup/import", {
        athletes: parsedBackup.athletes,
        evaluations: parsedBackup.evaluations,
        weighins: parsedBackup.weighins,
        photos: parsedBackup.photos,
      }, { timeout: 10 * 60_000 });
      setLastResult(data);
      setParsedBackup(null);
      const total =
        data.athletes.inserted + data.evaluations.inserted +
        data.weighins.inserted + data.photos.inserted;
      toast.success(`Importação concluída: ${total} novos registos criados`, { id: t });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Falha na importação", { id: t });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Administração</div>
        <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Backup e Restauro</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Exporta a base de dados completa (com fotos) ou restaura um backup para migrar entre ambientes.
        </p>
      </div>

      <Tabs defaultValue="export" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="export" data-testid="tab-export">Exportar</TabsTrigger>
          <TabsTrigger value="restore" data-testid="tab-restore">Restaurar</TabsTrigger>
        </TabsList>

        {/* -------- EXPORT -------- */}
        <TabsContent value="export" className="mt-0">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-bold">Backup JSON completo</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Descarrega <strong>tudo</strong>: atletas, avaliações, pesagens e fotos (em base64).
                Ideal para migração entre servidores.
              </p>
              <Button onClick={exportJson} disabled={busy} data-testid="backup-json-btn" className="gap-2">
                <Download className="w-4 h-4" /> {busy ? "A processar..." : "Descarregar JSON"}
              </Button>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-primary" />
                <h3 className="font-display text-xl font-bold">Resumo CSV</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Exporta o resumo dos atletas e últimas métricas para folha de cálculo.
              </p>
              <Button onClick={exportCsv} variant="outline" data-testid="export-csv-btn" className="gap-2">
                <Download className="w-4 h-4" /> Descarregar CSV
              </Button>
            </Card>
          </div>
          {stats && (
            <p className="text-xs text-muted-foreground mt-6">
              {stats.athletes} atletas no sistema.
            </p>
          )}
        </TabsContent>

        {/* -------- RESTORE -------- */}
        <TabsContent value="restore" className="mt-0 space-y-4">
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-xl font-bold">Restaurar backup JSON</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Modo MERGE</strong>: atletas com o mesmo nome (sem distinção de maiúsculas)
                  são <strong>preservados</strong>. Só novos atletas, avaliações, pesagens e fotos são adicionados.
                  Duplicados (mesma data para o mesmo atleta) são ignorados.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={onFileSelected}
              data-testid="restore-file-input"
            />

            {!parsedBackup && (
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-2 w-full sm:w-auto"
                data-testid="restore-pick-file-btn"
                disabled={busy}
              >
                <Upload className="w-4 h-4" /> Escolher ficheiro JSON
              </Button>
            )}

            {parsedBackup && (
              <div className="space-y-4">
                <div className="rounded-md border bg-secondary/50 p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                    Pré-visualização
                  </div>
                  <div className="font-semibold text-sm mb-3 truncate">
                    {parsedBackup.filename} <span className="text-muted-foreground">({parsedBackup.sizeMB} MB)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <PreviewStat label="Atletas" value={parsedBackup.athletes.length} />
                    <PreviewStat label="Avaliações" value={parsedBackup.evaluations.length} />
                    <PreviewStat label="Pesagens" value={parsedBackup.weighins.length} />
                    <PreviewStat label="Fotos" value={parsedBackup.photos.length} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setShowConfirm(true)}
                    disabled={busy}
                    className="gap-2"
                    data-testid="restore-import-btn"
                  >
                    <Upload className="w-4 h-4" /> Iniciar importação
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setParsedBackup(null)}
                    disabled={busy}
                    data-testid="restore-cancel-btn"
                  >
                    Escolher outro ficheiro
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {lastResult && (
            <Card className="p-6" data-testid="restore-result">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h4 className="font-display text-lg font-bold">Resultado da última importação</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <ResultRow
                  label="Atletas"
                  detail={`${lastResult.athletes.inserted} novos, ${lastResult.athletes.matched} já existiam`}
                />
                <ResultRow
                  label="Avaliações"
                  detail={`${lastResult.evaluations.inserted} novas, ${lastResult.evaluations.skipped} duplicadas`}
                />
                <ResultRow
                  label="Pesagens"
                  detail={`${lastResult.weighins.inserted} novas, ${lastResult.weighins.skipped} duplicadas`}
                />
                <ResultRow
                  label="Fotos"
                  detail={`${lastResult.photos.inserted} novas, ${lastResult.photos.skipped} duplicadas${lastResult.photos.no_data ? `, ${lastResult.photos.no_data} sem dados` : ""}`}
                />
              </div>
              {lastResult.errors?.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <div className="text-xs uppercase tracking-widest text-amber-600 font-semibold mb-1">
                    Avisos ({lastResult.errors.length})
                  </div>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 max-h-40 overflow-y-auto">
                    {lastResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                    {lastResult.errors.length > 20 && <li>...e mais {lastResult.errors.length - 20}</li>}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription>
              Vais adicionar {parsedBackup?.athletes.length || 0} atletas, {parsedBackup?.evaluations.length || 0} avaliações,
              {" "}{parsedBackup?.weighins.length || 0} pesagens e {parsedBackup?.photos.length || 0} fotos à base de dados atual.
              <br /><br />
              Modo <strong>merge</strong>: nada é apagado. Atletas com o mesmo nome mantêm-se e apenas registos novos são criados.
              Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="confirm-import-cancel">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doImport} data-testid="confirm-import-ok">
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
    </div>
  );
}

function ResultRow({ label, detail }) {
  return (
    <div className="flex justify-between items-baseline border-b pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{detail}</span>
    </div>
  );
}
