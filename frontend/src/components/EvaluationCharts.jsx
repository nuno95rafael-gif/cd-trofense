import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/**
 * Calcula um domínio Y "inteligente" com padding proporcional ao range real:
 *  - Range mínimo garantido para evitar linhas horizontais falsas
 *  - Padding de ~15% acima/abaixo dos valores para respirar
 *  - Nunca desce abaixo de 0 para métricas sempre positivas (default)
 */
function smartDomain(values, { allowNegative = false, minSpan = null } = {}) {
  const valid = values.filter((v) => v != null && !isNaN(v));
  if (valid.length === 0) return [0, 1];
  let min = Math.min(...valid);
  let max = Math.max(...valid);
  const span = max - min;
  const desiredSpan = Math.max(span * 1.3, minSpan ?? span * 1.3, 1);
  const center = (min + max) / 2;
  min = center - desiredSpan / 2;
  max = center + desiredSpan / 2;
  if (!allowNegative && min < 0) {
    max += -min;
    min = 0;
  }
  return [Math.floor(min * 10) / 10, Math.ceil(max * 10) / 10];
}

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
      <ChartBlock title="% Massa Gorda (R&W)" data={data} dataKey="bf" color="hsl(0 72% 51%)" unit="%" minSpan={2} />
      <ChartBlock title="Massa Muscular (kg)" data={data} dataKey="mm" color="hsl(var(--primary))" unit=" kg" minSpan={2} />
      <ChartBlock title="Peso (kg)" data={data} dataKey="peso" color="hsl(217 91% 60%)" unit=" kg" minSpan={4} />
      <ChartBlock title="Σ 8 pregas" data={data} dataKey="soma8" color="hsl(43 96% 50%)" unit=" mm" minSpan={10} />
    </div>
  );
}

function ChartBlock({ title, data, dataKey, color, unit, minSpan }) {
  const values = data.map((d) => d[dataKey]);
  const domain = smartDomain(values, { minSpan });
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, left: -4, bottom: 4 }}>
            <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis
              domain={domain}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              width={48}
              tickFormatter={(v) => (Number.isInteger(v) ? v : v.toFixed(1))}
            />
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
