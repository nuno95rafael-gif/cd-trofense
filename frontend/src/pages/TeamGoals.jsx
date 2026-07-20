import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { GoalStatusPill } from "@/components/GoalStatusPill";
import { computeGoalStatus, STATUS_PRIORITY, STATUS_STYLES } from "@/lib/goalStatus";
import { ArrowDown, ArrowUp, Minus, Target, Users } from "lucide-react";

export default function TeamGoals() {
  const nav = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    api.get("/athletes").then(({ data }) => setAthletes(data));
  }, []);

  const rows = useMemo(() => {
    return athletes.map((a) => {
      // Coerência com GoalsPanel: usar o peso da última avaliação (mesma origem
      // que o % MG). Se não houver avaliação, cair para display_weight.
      const currentWeight = a.last_eval_weight ?? a.display_weight;
      const info = computeGoalStatus({
        currentWeight,
        currentBf: a.last_metrics?.rw,
        goal: a.goal,
      });
      return {
        id: a.id,
        nome: a.nome,
        posicao: a.posicao,
        currentWeight,
        currentBf: a.last_metrics?.rw,
        targetBf: a.goal?.bf_target_pct,
        ...info,
      };
    });
  }, [athletes]);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((x) => x.nome.toLowerCase().includes(s) || (x.posicao || "").toLowerCase().includes(s));
    }
    if (statusFilter !== "todos") r = r.filter((x) => x.status === statusFilter);
    // Ordenação estável: por prioridade desc, depois por |Δ| desc, depois por nome asc.
    return [...r].sort((a, b) => {
      const p = (STATUS_PRIORITY[b.status] ?? -2) - (STATUS_PRIORITY[a.status] ?? -2);
      if (p !== 0) return p;
      const d = (b.absDelta ?? -1) - (a.absDelta ?? -1);
      if (d !== 0) return d;
      return a.nome.localeCompare(b.nome, "pt");
    });
  }, [rows, q, statusFilter]);

  const counts = useMemo(() => {
    const c = { prioritario: 0, em_progresso: 0, quase_la: 0, atingido: 0, sem_objetivo: 0, sem_dados: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto" data-testid="team-goals-page">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Departamento Médico</div>
        <h1 className="font-display text-5xl font-bold tracking-tighter mt-1">Objetivos de Equipa</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Vista consolidada dos ajustes de peso individuais. Cada atleta é classificado em função da diferença entre o peso atual e o peso alvo calculado a partir da sua % MG alvo.
        </p>
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
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Pesquisar nome ou posição..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
            data-testid="team-goals-search"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-56" data-testid="team-goals-status-filter">
              <SelectValue />
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
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              <tr>
                <th className="text-left px-4 py-3">Atleta</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Peso atual</th>
                <th className="text-right px-4 py-3">% MG atual</th>
                <th className="text-right px-4 py-3">% MG alvo</th>
                <th className="text-right px-4 py-3">Peso alvo</th>
                <th className="text-right px-4 py-3">Δ peso</th>
                <th className="text-left px-4 py-3 min-w-[160px]">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum atleta corresponde aos filtros.</td></tr>
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
                      {r.posicao && <div className="text-xs text-muted-foreground">{r.posicao}</div>}
                    </td>
                    <td className="px-4 py-3"><GoalStatusPill status={r.status} label={r.label} /></td>
                    <td className="px-4 py-3 text-right num font-semibold">{r.currentWeight != null ? `${r.currentWeight} kg` : "—"}</td>
                    <td className="px-4 py-3 text-right num">{r.currentBf != null ? `${r.currentBf}%` : "—"}</td>
                    <td className="px-4 py-3 text-right num">{r.targetBf != null ? `${r.targetBf}%` : "—"}</td>
                    <td className="px-4 py-3 text-right num font-semibold text-primary">{r.targetWeight != null ? `${r.targetWeight} kg` : "—"}</td>
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
