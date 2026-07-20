import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { AthleteForm } from "@/components/AthleteForm";
import { toast } from "sonner";

export default function AthleteNew() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const { data } = await api.post("/athletes", values);
      toast.success("Atleta criado");
      navigate(`/atletas/${data.id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Plantel</div>
        <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Novo atleta</h1>
      </div>
      <AthleteForm onSubmit={onSubmit} saving={saving} />
    </div>
  );
}
