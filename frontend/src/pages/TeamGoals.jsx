import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalStatusPill } from "@/components/GoalStatusPill";
import { computeGoalStatus, STATUS_PRIORITY, STATUS_STYLES } from "@/lib/goalStatus";
import { exportTeamGoalsPdf } from "@/lib/pdf";
import { ArrowDown, ArrowUp, Minus, Target, Users, FileDown, Search } from "lucide-react";

export default function TeamGoals() {
  const nav = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [posFilter, setPosFilter] = useState("_all");
  const [dirFilter, setDirFilter] = useState("_all");
  const [sortKey, setSortKey] = useState("priority");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    api.get("/athletes").then(({ data }) => setAthletes(data));
  }, []);

  const rows = useMemo(() => {
    return athletes.map((a) => {
      const currentWeight = a.last_eval_weight ?? a.display_weight;
      const info = computeGoalStatus({
        currentWeight,
        currentBf: a.last_metrics?.rw,
        currentImc: a.last_metrics?.imc,
        goal: a.goal,
        athlete: a,
      });
      return {
        id: a.id,
        nome: a.nome,
        posicao: a.posicao,
        idade: a.idade,
        currentWeight,
        currentBf: a.last_metrics?.rw,
        currentImc: a.last_metrics?.imc,
        targetBf: a.goal?.bf_target_pct,
        targetImc: a.goal?.imc_target,
        ...info,
      };
    });
  }, [athletes]);

  const positions = useMemo(() => {
    const s = new Set(rows.map((r) => r.posicao).filter(Boolean));
    return Array.from(s).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((x) => x.nome.toLowerCase().includes(s) || (x.posicao || "").toLowerCase().includes(s));
    }
    if (statusFilter !== "todos") r = r.filter((x) => x.status === statusFilter);
    if (posFilter !== "_all") r = r.filter((x) => (x.posicao || "") === posFilter);
    if (dirFilter !== "_all") r = r.filter((x) => x.direction === dirFilter);
    const getVal = (x) => {
      switch (sortKey) {
        case "priority": return STATUS_PRIORITY[x.status] ?? -2;
        case "nome": return x.nome.toLowerCase();
        case "posicao": return (x.posicao || "").toLowerCase();
        case "currentWeight": return x.currentWeight ?? -1;
        case "currentBf": return x.currentBf ?? -1;
        case "targetBf": return x.primary === "imc" ? (x.targetImc ?? -1) : (x.targetBf ?? -1);
        case "targetWeight": return x.targetWeight ?? -1;
        case "delta": return x.absDelta ?? -1;
        default: return 0;
      }
    };
    return [...r].sort((a, b) => {
      const va = getVal(a), vb = getVal(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      // tiebreaker: por |Δ| desc depois nome asc
      const d = (b.absDelta ?? -1) - (a.absDelta ?? -1);
      if (d !== 0) return d;
      return a.nome.localeCompare(b.nome, "pt");
    });
  }, [rows, q, statusFilter, posFilter, dirFilter, sortKey, sortDir]);

  const counts = useMemo(() => {
    const c = { prioritario: 0, em_progresso: 0, quase_la: 0, atingido: 0, sem_objetivo: 0, sem_dados: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "priority" ? "desc" : "asc"); }
  };

  const arrow = (k) => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const resetFilters = () => {
    setQ(""); setStatusFilter("todos"); setPosFilter("_all"); setDirFilter("_all");
    setSortKey("priority"); setSortDir("desc");
  };

  const anyFilterActive = q || statusFilter !== "todos" || posFilter !== "_all" || dirFilter !== "_all";

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="team-goals-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Departamento Médico</div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter mt-1">Objetivos de Equipa</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Vista consolidada dos ajustes de peso individuais. Cada atleta é classificado em função da diferença entre o peso atual e o peso alvo calculado a partir da sua % MG alvo.
          </p>
        </div>
        <Button
          variant="default"
          className="gap-2"
          data-testid="download-team-goals-pdf"
          onClick={() => exportTeamGoalsPdf(filtered, counts)}
          disabled={filtered.length === 0}
        >
          <FileDown className="w-4 h-4" /> Descarregar PDF
        </Button>
      </div>

      {/* Sumário por estado */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <StatusStat status="prioritario" label="Prioritário" count={counts.prioritario} filter={statusFilter} onClick={setStatusFilter} />
        <StatusStat status="em_progresso" label="Em progresso" count={counts.em_progresso} filter={statusFilter} onClick={setStatusFilter} />
        <StatusStat status="quase_la" label="Quase lá" count={counts.quase_la} filter={statusFilter} onClick={setStatusFilter} />
        <StatusStat status="atingido" label="Atingido" count={counts.atingido} filter={statusFilter} onClick={setStatusFilter} />
        <StatusStat status="sem_objetivo" label="Sem objetivo" count={counts.sem_objetivo} filter={statusFilter} onClick={setStatusFilter} />
        <Card
          data-testid="stat-todos"
          onClick={() => setStatusFilter("todos")}
          className={`p-4 cursor-pointer transition ${statusFilter === "todos" ? "ring-2 ring-primary" : "hover:bg-secondary/60"}`}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            <Users className="w-3.5 h-3.5" /> Todos
          </div>
          <div className="num text-3xl font-bold mt-1">{rows.length}</div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar nome ou posição…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
              data-testid="team-goals-search"
            />
          </div>
          <Select value={posFilter} onValueChange={setPosFilter}>
            <SelectTrigger className="w-44" data-testid="team-goals-position-filter">
              <SelectValue placeholder="Posição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas as posições</SelectItem>
              {positions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44" data-testid="team-goals-status-filter">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              <SelectItem value="prioritario">Prioritário</SelectItem>
              <SelectItem value="em_progresso">Em progresso</SelectItem>
              <SelectItem value="quase_la">Quase lá</SelectItem>
              <SelectItem value="atingido">Atingido</SelectItem>
              <SelectItem value="sem_objetivo">Sem objetivo</SelectItem>
              <SelectItem value="sem_dados">Sem avaliação</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dirFilter} onValueChange={setDirFilter}>
            <SelectTrigger className="w-44" data-testid="team-goals-direction-filter">
              <SelectValue placeholder="Direção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Qualquer direção</SelectItem>
              <SelectItem value="perder">A perder peso</SelectItem>
              <SelectItem value="ganhar">A ganhar peso</SelectItem>
              <SelectItem value="manter">No alvo</SelectItem>
            </SelectContent>
          </Select>
          {anyFilterActive && (
            <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="team-goals-reset-filters">
              Limpar filtros
            </Button>
          )}
          <div className="text-xs text-muted-foreground ml-auto">
            {filtered.length} de {rows.length}
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              <tr>
                <Th onClick={() => toggleSort("nome")} testid="sort-nome">Atleta{arrow("nome")}</Th>
                <Th onClick={() => toggleSort("posicao")} testid="sort-posicao">Posição{arrow("posicao")}</Th>
                <Th onClick={() => toggleSort("priority")} testid="sort-priority">Estado{arrow("priority")}</Th>
                <Th right onClick={() => toggleSort("currentWeight")} testid="sort-currentWeight">Peso atual{arrow("currentWeight")}</Th>
                <Th right onClick={() => toggleSort("currentBf")} testid="sort-currentBf">% MG atual{arrow("currentBf")}</Th>
                <Th right onClick={() => toggleSort("targetBf")} testid="sort-targetBf">Alvo{arrow("targetBf")}</Th>
                <Th right onClick={() => toggleSort("targetWeight")} testid="sort-targetWeight">Peso alvo{arrow("targetWeight")}</Th>
                <Th right onClick={() => toggleSort("delta")} testid="sort-delta">Δ peso{arrow("delta")}</Th>
                <th className="text-left px-4 py-3 min-w-[160px]">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhum atleta corresponde aos filtros.</td></tr>
              )}
              {filtered.map((r) => {
                const style = STATUS_STYLES[r.status] || STATUS_STYLES.sem_dados;
                const progress = r.absDelta == null ? 0 : Math.max(0, Math.min(100, 100 - (r.absDelta / 10) * 100));
                return (
                  <tr
                    key={r.id}
                    className="border-t hover:bg-secondary/40 cursor-pointer transition"
                    onClick={() => nav(`/atletas/${r.id}`)}
                    data-testid={`team-goal-row-${r.nome.replace(/\s+/g, "-")}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{r.nome}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.posicao || "—"}</td>
                    <td className="px-4 py-3"><GoalStatusPill status={r.status} label={r.label} /></td>
                    <td className="px-4 py-3 text-right num font-semibold">{r.currentWeight != null ? `${r.currentWeight} kg` : "—"}</td>
                    <td className="px-4 py-3 text-right num">{r.currentBf != null ? `${r.currentBf}%` : "—"}</td>
                    <td className="px-4 py-3 text-right num">
                      {r.primary === "imc" && r.targetImc != null ? (
                        <span>{r.targetImc}<span className="text-[10px] text-muted-foreground ml-1">IMC</span></span>
                      ) : r.targetBf != null ? (
                        <span>{r.targetBf}%<span className="text-[10px] text-muted-foreground ml-1">MG</span></span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right num font-semibold">{r.targetWeight != null ? `${r.targetWeight} kg` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {r.delta == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={`num font-semibold inline-flex items-center gap-1 ${r.direction === "perder" ? "text-red-500" : r.direction === "ganhar" ? "text-blue-500" : "text-emerald-500"}`}>
                          {r.direction === "perder" ? <ArrowDown className="w-3.5 h-3.5" /> : r.direction === "ganhar" ? <ArrowUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                          {Math.abs(r.delta)} kg
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.absDelta == null ? (
                        <div className="text-xs text-muted-foreground">—</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full ${style.bar}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">{progress.toFixed(0)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground max-w-3xl">
        <Target className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          O peso alvo é calculado com base no peso atual, % MG atual (Reilly &amp; Wallace) e % MG alvo definida no perfil do atleta, preservando a massa magra.
          Faixas: <strong className="text-emerald-500">Atingido</strong> ≤ 0.5&nbsp;kg · <strong className="text-lime-500">Quase lá</strong> ≤ 2&nbsp;kg · <strong className="text-amber-500">Em progresso</strong> ≤ 5&nbsp;kg · <strong className="text-red-500">Prioritário</strong> &gt; 5&nbsp;kg.
        </span>
      </div>
    </div>
  );
}

function Th({ children, right, onClick, testid }) {
  return (
    <th
      className={`px-4 py-3 cursor-pointer select-none hover:text-foreground ${right ? "text-right" : "text-left"}`}
      onClick={onClick}
      data-testid={testid}
    >
      {children}
    </th>
  );
}

function StatusStat({ status, label, count, filter, onClick }) {
  const style = STATUS_STYLES[status];
  const active = filter === status;
  return (
    <Card
      data-testid={`stat-${status}`}
      onClick={() => onClick(status)}
      className={`p-4 cursor-pointer transition ${active ? "ring-2 ring-primary" : "hover:bg-secondary/60"}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
      </div>
      <div className="num text-3xl font-bold mt-1">{count}</div>
    </Card>
  );
}
