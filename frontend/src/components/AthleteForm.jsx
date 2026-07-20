import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AthleteForm({ initial, onSubmit, saving }) {
  const [v, setV] = useState({
    nome: initial?.nome || "",
    posicao: initial?.posicao || "",
    sexo: initial?.sexo || "M",
    etnia: initial?.etnia || "caucasiano",
    altura_cm: initial?.altura_cm ?? "",
    idade: initial?.idade ?? "",
    peso_atual_kg: initial?.peso_atual_kg ?? "",
    peso_normal_kg: initial?.peso_normal_kg ?? "",
    dieta: initial?.dieta || "",
    agua_l: initial?.agua_l ?? "",
    suplementacao: initial?.suplementacao || "",
    cafeina: initial?.cafeina || "",
    preferencia_jogo: initial?.preferencia_jogo || "",
    sabor_batido: initial?.sabor_batido || "",
    intervalo: initial?.intervalo || "",
    nao_gosta: initial?.nao_gosta || "",
    sono_h: initial?.sono_h ?? "",
    notas: initial?.notas || "",
  });

  const num = (x) => (x === "" || x == null ? null : Number(x));
  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...v,
      altura_cm: num(v.altura_cm),
      idade: num(v.idade),
      peso_atual_kg: num(v.peso_atual_kg),
      peso_normal_kg: num(v.peso_normal_kg),
      agua_l: num(v.agua_l),
      sono_h: num(v.sono_h),
    });
  };
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Dados pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nome *"><Input required data-testid="athlete-name" value={v.nome} onChange={set("nome")} /></Field>
          <Field label="Posição"><Input data-testid="athlete-position" value={v.posicao} onChange={set("posicao")} placeholder="GR, DEF, MED, AVA" /></Field>
          <Field label="Sexo">
            <Select value={v.sexo} onValueChange={set("sexo")}>
              <SelectTrigger data-testid="athlete-sex"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Etnia">
            <Select value={v.etnia} onValueChange={set("etnia")}>
              <SelectTrigger data-testid="athlete-eth"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="caucasiano">Caucasiano</SelectItem>
                <SelectItem value="africano">Africano</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Altura (cm)"><Input type="number" step="0.1" data-testid="athlete-height" value={v.altura_cm} onChange={set("altura_cm")} /></Field>
          <Field label="Idade"><Input type="number" step="1" data-testid="athlete-age" value={v.idade} onChange={set("idade")} /></Field>
          <Field label="Peso atual (kg)"><Input type="number" step="0.1" data-testid="athlete-current-weight" value={v.peso_atual_kg} onChange={set("peso_atual_kg")} /></Field>
          <Field label="Peso normal (kg)"><Input type="number" step="0.1" data-testid="athlete-normal-weight" value={v.peso_normal_kg} onChange={set("peso_normal_kg")} /></Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Preferências e observações</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Dieta"><Input value={v.dieta} onChange={set("dieta")} /></Field>
          <Field label="Água (L/dia)"><Input type="number" step="0.1" value={v.agua_l} onChange={set("agua_l")} /></Field>
          <Field label="Suplementação"><Input value={v.suplementacao} onChange={set("suplementacao")} /></Field>
          <Field label="Cafeína"><Input value={v.cafeina} onChange={set("cafeina")} /></Field>
          <Field label="Preferência de dia de jogo"><Input value={v.preferencia_jogo} onChange={set("preferencia_jogo")} /></Field>
          <Field label="Sabor de batido"><Input value={v.sabor_batido} onChange={set("sabor_batido")} /></Field>
          <Field label="Intervalo (refresco)"><Input value={v.intervalo} onChange={set("intervalo")} /></Field>
          <Field label="Alimentos que não gosta"><Input value={v.nao_gosta} onChange={set("nao_gosta")} /></Field>
          <Field label="Sono (h)"><Input type="number" step="0.1" value={v.sono_h} onChange={set("sono_h")} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Notas"><Textarea value={v.notas} onChange={set("notas")} rows={3} /></Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" data-testid="save-athlete-btn" disabled={saving} className="min-w-32">
          {saving ? "A guardar..." : "Guardar atleta"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}
