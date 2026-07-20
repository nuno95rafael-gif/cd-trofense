import { STATUS_STYLES } from "@/lib/goalStatus";

export function GoalStatusPill({ status, label, testid, className = "" }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.sem_dados;
  return (
    <span
      data-testid={testid}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${style.pill} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
