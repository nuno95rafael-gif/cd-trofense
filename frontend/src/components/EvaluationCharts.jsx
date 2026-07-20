import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export function EvaluationCharts({ evals }) {
  const data = evals.map((e) => ({
    date: new Date(e.date).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }),
    bf: e.metrics?.rw,
    mm: e.metrics?.muscle_mass_kg,
    imc: e.metrics?.imc,
    peso: e.peso_kg,
    soma8: e.metrics?.soma8,
  }));
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <ChartBlock title="% Massa Gorda (R&W)" data={data} dataKey="bf" color="hsl(0 72% 51%)" unit="%" />
      <ChartBlock title="Massa Muscular (kg)" data={data} dataKey="mm" color="hsl(var(--primary))" unit=" kg" />
      <ChartBlock title="Peso (kg)" data={data} dataKey="peso" color="hsl(217 91% 60%)" unit=" kg" />
      <ChartBlock title="Σ 8 pregas" data={data} dataKey="soma8" color="hsl(43 96% 50%)" unit="" />
    </div>
  );
}

function ChartBlock({ title, data, dataKey, color, unit }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={40} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
              formatter={(v) => `${v}${unit}`}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
