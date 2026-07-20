import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusPill } from "@/components/StatusPill";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, TrendingUp, Users, Weight, Activity } from "lucide-react";

export default function Dashboard() {
  const { isEditor } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState(null);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState("nome");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    api.get("/athletes").then((r) => setAthletes(r.data)).catch(() => setAthletes([]));
  }, []);

  const filtered = useMemo(() => {
    if (!athletes) return null;
    const s = q.trim().toLowerCase();
    const arr = s
      ? athletes.filter((a) => a.nome.toLowerCase().includes(s) || (a.posicao || "").toLowerCase().includes(s))
      : [...athletes];
    arr.sort((a, b) => {
      const getV = (o) => {
        if (sortKey === "nome") return o.nome || "";
        if (sortKey === "bf") return o.last_metrics?.bf_average ?? -1;
        if (sortKey === "peso") return o.last_weight ?? o.last_metrics?.imc ?? -1;
        if (sortKey === "imc") return o.last_metrics?.imc ?? -1;
        return "";
      };
      const va = getV(a), vb = getV(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [athletes, q, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (!athletes || athletes.length === 0) return null;
    const withBf = athletes.filter((a) => a.last_metrics?.bf_average != null);
    const avgBf = withBf.length
      ? +(withBf.reduce((s, a) => s + a.last_metrics.bf_average, 0) / withBf.length).toFixed(1)
      : null;
    const otimo = athletes.filter((a) => a.last_metrics?.status === "Ótimo").length;
    const atencao = athletes.filter((a) => a.last_metrics?.status === "Atenção").length;
    const alto = athletes.filter((a) => a.last_metrics?.status === "Alto").length;
    return { total: athletes.length, avgBf, otimo, atencao, alto };
  }, [athletes]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Departamento Médico
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter mt-1">Plantel</h1>
        </div>
        {isEditor && (
          <Button data-testid="new-athlete-btn" onClick={() => navigate("/atletas/novo")} className="gap-2">
            <Plus className="w-4 h-4" /> Novo atleta
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Atletas" value={stats?.total ?? "—"} icon={Users} testid="kpi-total" />
        <KpiCard label="MG média" value={stats?.avgBf ? `${stats.avgBf}%` : "—"} icon={TrendingUp} testid="kpi-bf" />
        <KpiCard label="Em Ótimo" value={stats?.otimo ?? "—"} icon={Activity} accent="pill-otimo" testid="kpi-otimo" />
        <KpiCard label="Atenção / Alto" value={stats ? `${stats.atencao} / ${stats.alto}` : "—"} icon={Weight} testid="kpi-warn" />
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 pb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="dashboard-search"
              placeholder="Pesquisar atleta ou posição…"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {!filtered ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Sem atletas para mostrar</p>
            {isEditor && <p className="text-sm">Clique em &ldquo;Novo atleta&rdquo; para começar.</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Nome" k="nome" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <TableHead>Posição</TableHead>
                <SortableHeader label="Peso" k="peso" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHeader label="IMC" k="imc" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <SortableHeader label="% MG" k="bf" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <TableHead>MM</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, idx) => (
                <TableRow
                  key={a.id}
                  data-testid={`athlete-row-${idx}`}
                  className="cursor-pointer"
                  onClick={() => navigate(`/atletas/${a.id}`)}
                >
                  <TableCell className="font-medium">
                    <Link className="hover:text-primary" to={`/atletas/${a.id}`}>{a.nome}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.posicao || "—"}</TableCell>
                  <TableCell className="num">{a.last_weight ?? "—"}{a.last_weight ? " kg" : ""}</TableCell>
                  <TableCell className="num">{a.last_metrics?.imc ?? "—"}</TableCell>
                  <TableCell className="num font-semibold">{a.last_metrics?.bf_average ?? "—"}</TableCell>
                  <TableCell className="num">{a.last_metrics?.muscle_mass_kg ?? "—"}</TableCell>
                  <TableCell>
                    <StatusPill status={a.last_metrics?.status} testid={`athlete-status-${idx}`} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
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

function SortableHeader({ label, k, sortKey, sortDir, onClick }) {
  const active = sortKey === k;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground"
      onClick={() => onClick(k)}
      data-testid={`sort-${k}`}
    >
      {label}
      {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </TableHead>
  );
}
