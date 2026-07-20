import { useEffect, useRef, useState } from "react";
import { api, formatApiError, API } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function PhotosPanel({ athleteId, isEditor }) {
  const [photos, setPhotos] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState("frontal");
  const fileRef = useRef();
  const [saving, setSaving] = useState(false);
  const [blobs, setBlobs] = useState({}); // id -> object URL

  const load = async () => {
    const { data } = await api.get(`/athletes/${athleteId}/photos`);
    setPhotos(data);
    // fetch blobs
    const token = localStorage.getItem("trofense_token");
    const newBlobs = {};
    for (const p of data) {
      try {
        const res = await fetch(`${API}/photos/${p.id}/download`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const b = await res.blob();
        newBlobs[p.id] = URL.createObjectURL(b);
      } catch { /* skip */ }
    }
    setBlobs((old) => {
      Object.values(old).forEach((u) => URL.revokeObjectURL(u));
      return newBlobs;
    });
  };

  useEffect(() => { load(); return () => Object.values(blobs).forEach((u) => URL.revokeObjectURL(u)); /* eslint-disable-next-line */ }, [athleteId]);

  const upload = async (e) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("file", fileRef.current.files[0]);
    fd.append("date", date);
    fd.append("kind", kind);
    try {
      await api.post(`/athletes/${athleteId}/photos`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Foto enviada");
      fileRef.current.value = "";
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    await api.delete(`/photos/${id}`);
    load();
  };

  // agrupar por data
  const grouped = photos.reduce((acc, p) => {
    (acc[p.date] = acc[p.date] || []).push(p);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();
  const first = dates[0] ? grouped[dates[0]] : [];
  const last = dates[dates.length - 1] && dates.length > 1 ? grouped[dates[dates.length - 1]] : [];

  return (
    <div className="space-y-6">
      {isEditor && (
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold mb-4">Nova foto</h3>
          <form onSubmit={upload} className="flex flex-wrap gap-3 items-end">
            <div><Label className="text-xs">Data</Label><Input type="date" value={date} data-testid="photo-date" onChange={(e) => setDate(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-40" data-testid="photo-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="frontal">Frontal</SelectItem>
                  <SelectItem value="perfil">Perfil</SelectItem>
                  <SelectItem value="costas">Costas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Ficheiro</Label><Input type="file" accept="image/*" data-testid="photo-file" ref={fileRef} required /></div>
            <Button type="submit" disabled={saving} data-testid="upload-photo-btn">Enviar</Button>
          </form>
        </Card>
      )}

      {last.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-xl font-bold mb-4">Comparação: Primeiro vs. Último</h3>
          <div className="grid grid-cols-2 gap-6">
            <PhotoCol title={`Primeiro (${new Date(dates[0]).toLocaleDateString("pt-PT")})`} photos={first} blobs={blobs} />
            <PhotoCol title={`Último (${new Date(dates[dates.length - 1]).toLocaleDateString("pt-PT")})`} photos={last} blobs={blobs} />
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-display text-xl font-bold mb-4">Timeline ({photos.length})</h3>
        {photos.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem fotos.</p>
        ) : (
          <div className="space-y-6">
            {dates.map((d) => (
              <div key={d}>
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                  {new Date(d).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {grouped[d].map((p) => (
                    <div key={p.id} className="relative group border rounded-md overflow-hidden bg-secondary">
                      <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest bg-black/60 text-white px-2 py-0.5 rounded-full z-10">
                        {p.kind}
                      </div>
                      {blobs[p.id] ? (
                        <img src={blobs[p.id]} alt={p.kind} className="w-full h-64 object-cover" />
                      ) : (
                        <div className="w-full h-64 flex items-center justify-center text-xs text-muted-foreground">
                          A carregar…
                        </div>
                      )}
                      {isEditor && (
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => del(p.id)}
                          data-testid={`del-photo-${p.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PhotoCol({ title, photos, blobs }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="grid gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative border rounded-md overflow-hidden bg-secondary">
            <div className="absolute top-2 left-2 text-[10px] uppercase tracking-widest bg-black/60 text-white px-2 py-0.5 rounded-full z-10">
              {p.kind}
            </div>
            {blobs[p.id] ? <img src={blobs[p.id]} alt={p.kind} className="w-full h-72 object-cover" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
