import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { rwBand, soma8Band, percMMBand, mmMgBand, imcBand } from "@/lib/formulas";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, TrendingUp, Users, Weight, Activity, FileDown } from "lucide-react";
import { exportDashboardPdf } from "@/lib/pdf";
import { MonthlyKpisStrip } from "@/components/MonthlyKpisStrip";

const COLS = [
  { key: "nome", label: "Nome" },
  { key: "posicao", label: "Posição" },
  { key: "idade", label: "Idade" },
  { key: "altura", label: "Alt (cm)" },
  { key: "peso", label: "Peso (kg)" },
  { key: "rw", label: "% MG (R&W)", band: "rw" },
  { key: "soma8", label: "Σ 8 pregas", band: "soma8" },
  { key: "perc_mm", label: "% MM", band: "perc_mm" },
  { key: "mm_mg", label: "MM/MG", band: "mm_mg" },
  { key: "imc", label: "IMC", band: "imc" },
];

const pillCls = (color) =>
  color === "otimo" ? "pill-otimo"
  : color === "atencao" ? "pill-atencao"
  : color === "alto" ? "pill-alto"
  : "bg-muted text-muted-foreground";

export default function Dashboard() {
  const { isEditor } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState(null);
  const [q, setQ] = useState("");
  const [posFilter, setPosFilter] = useState("_all");
  const [statusFilter, setStatusFilter] = useState("_all");
  const [sortKey, setSortKey] = useState("nome");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    api.get("/athletes").then((r) => setAthletes(r.data)).catch(() => setAthletes([]));
  }, []);

  const rowVal = (a, key) => {
    const m = a.last_metrics || {};
    switch (key) {
      case "nome": return a.nome || "";
      case "posicao": return a.posicao || "";
      case "idade": return a.idade ?? -1;
      case "altura": return a.altura_cm ?? -1;
      case "peso": return a.display_weight ?? -1;
      case "rw": return m.rw ?? -1;
      case "soma8": return m.soma8 ?? -1;
      case "perc_mm": return m.perc_mm ?? -1;
      case "mm_mg": return m.mm_mg_ratio ?? -1;
      case "imc": return m.imc ?? -1;
      default: return "";
    }
  };

  const positions = useMemo(() => {
    if (!athletes) return [];
    const s = new Set(athletes.map((a) => a.posicao).filter(Boolean));
    return Array.from(s).sort();
  }, [athletes]);

  const filtered = useMemo(() => {
    if (!athletes) return null;
    const s = q.trim().toLowerCase();
    let arr = athletes;
    if (s) arr = arr.filter((a) =>
      (a.nome || "").toLowerCase().includes(s)
      || (a.posicao || "").toLowerCase().includes(s));
    if (posFilter !== "_all") arr = arr.filter((a) => (a.posicao || "") === posFilter);
    if (statusFilter !== "_all") arr = arr.filter((a) => rwBand(a.last_metrics?.rw).label === statusFilter);
    arr = [...arr];
    arr.sort((a, b) => {
      const va = rowVal(a, sortKey), vb = rowVal(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [athletes, q, posFilter, statusFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (!athletes || athletes.length === 0) return null;
    const bfs = athletes.map((a) => a.last_metrics?.rw).filter((v) => v != null);
    const avgBf = bfs.length ? +(bfs.reduce((s, v) => s + v, 0) / bfs.length).toFixed(1) : null;
    let otimo = 0, atencao = 0, alto = 0;
    athletes.forEach((a) => {
      const b = rwBand(a.last_metrics?.rw).label;
      if (b === "Ótimo") otimo++; else if (b === "Atenção") atencao++; else if (b === "Alto") alto++;
    });
    const pesos = athletes.map((a) => a.display_weight).filter((v) => v != null);
    const avgPeso = pesos.length ? +(pesos.reduce((s, v) => s + v, 0) / pesos.length).toFixed(1) : null;
    return { total: athletes.length, avgBf, avgPeso, otimo, atencao, alto };
  }, [athletes]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Departamento Médico</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter mt-1">Plantel</h1>
        </div>
        {isEditor && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              data-testid="download-dashboard-pdf"
              onClick={() => exportDashboardPdf(filtered || athletes || [], stats)}
              disabled={!athletes || athletes.length === 0}
              className="gap-2"
            >
              <FileDown className="w-4 h-4" /> Descarregar PDF
            </Button>
            <Button data-testid="new-athlete-btn" onClick={() => navigate("/atletas/novo")} className="gap-2">
              <Plus className="w-4 h-4" /> Novo atleta
            </Button>
          </div>
        )}
        {!isEditor && (
          <Button
            variant="outline"
            data-testid="download-dashboard-pdf"
            onClick={() => exportDashboardPdf(filtered || athletes || [], stats)}
            disabled={!athletes || athletes.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" /> Descarregar PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Atletas" value={stats?.total ?? "—"} icon={Users} testid="kpi-total" />
        <KpiCard label="Peso médio" value={stats?.avgPeso ? `${stats.avgPeso} kg` : "—"} icon={Weight} testid="kpi-peso" />
        <KpiCard label="% MG média (R&W)" value={stats?.avgBf ? `${stats.avgBf}%` : "—"} icon={TrendingUp} testid="kpi-bf" />
        <KpiCard label="Em Ótimo (<9%)" value={stats?.otimo ?? "—"} icon={Activity} testid="kpi-otimo" />
        <KpiCard label="Atenção / Alto" value={stats ? `${stats.atencao} / ${stats.alto}` : "—"} icon={Weight} testid="kpi-warn" />
      </div>

      <MonthlyKpisStrip />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input data-testid="dashboard-search" placeholder="Pesquisar nome ou posição…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={posFilter} onValueChange={setPosFilter}>
            <SelectTrigger className="w-40" data-testid="filter-position"><SelectValue placeholder="Posição" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as posições</SelectItem>
              {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="filter-status"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todos os estados</SelectItem>
              <SelectItem value="Ótimo">Ótimo</SelectItem>
              <SelectItem value="Atenção">Atenção</SelectItem>
              <SelectItem value="Alto">Alto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!filtered ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Sem atletas para mostrar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {COLS.map((c) => (
                  <TableHead
                    key={c.key}
                    className="cursor-pointer select-none hover:text-foreground"
                    onClick={() => toggleSort(c.key)}
                    data-testid={`sort-${c.key}`}
                  >
                    {c.label}{sortKey === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, idx) => {
                const m = a.last_metrics || {};
                return (
                  <TableRow key={a.id} data-testid={`athlete-row-${idx}`} className="cursor-pointer" onClick={() => navigate(`/atletas/${a.id}`)}>
                    <TableCell className="font-medium">
                      <Link className="hover:text-primary" to={`/atletas/${a.id}`}>{a.nome}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.posicao || "—"}</TableCell>
                    <TableCell className="num">{a.idade ?? "—"}</TableCell>
                    <TableCell className="num">{a.altura_cm ?? "—"}</TableCell>
                    <TableCell className="num font-semibold">{a.display_weight ?? "—"}</TableCell>
                    <BandCell value={m.rw} band={rwBand(m.rw)} />
                    <BandCell value={m.soma8} band={soma8Band(m.soma8)} />
                    <BandCell value={m.perc_mm} band={percMMBand(m.perc_mm)} unit="%" />
                    <BandCell value={m.mm_mg_ratio} band={mmMgBand(m.mm_mg_ratio, a.sexo === "M" ? 1 : 0)} />
                    <BandCell value={m.imc} band={imcBand(m.imc)} />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-5 mt-6 bg-secondary/30">
        <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3">Legenda · Pontos de corte</div>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <LegendRow label="% MG (R&W)" items={[["<9% Ótimo", "otimo"], ["9-10% Atenção", "atencao"], [">10% Alto", "alto"]]} />
          <LegendRow label="Σ 8 pregas" items={[["<65 Baixo", "otimo"], ["65-75 Médio", "atencao"], [">75 Alto", "alto"]]} />
          <LegendRow label="% MM (Lee)" items={[["≥45% Ótimo", "otimo"], ["40-45% Atenção", "atencao"], ["<40% Baixo", "alto"]]} />
          <LegendRow label="MM/MG" items={[["M≥4 / F≥2 Normal", "otimo"], ["Abaixo Baixo", "alto"]]} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 italic">
          Bandas indicativas para futebolistas de elite (não clínicas). O IMC é pouco fiável em atletas muito musculados.
        </p>
      </Card>
    </div>
  );
}

function BandCell({ value, band, unit }) {
  return (
    <TableCell>
      <span className={`num inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold ${pillCls(band.color)}`}>
        {value ?? "—"}{value != null && unit ? unit : ""}
      </span>
    </TableCell>
  );
}

function LegendRow({ label, items }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold min-w-[110px]">{label}</span>
      {items.map(([txt, col]) => (
        <span key={txt} className={`px-2 py-0.5 rounded-full ${pillCls(col)}`}>{txt}</span>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, testid }) {
  return (
    <Card className="p-5" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="font-display text-4xl font-bold tracking-tighter num mt-2">{value}</div>
    </Card>
  );
}
