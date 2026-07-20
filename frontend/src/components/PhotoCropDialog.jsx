import { useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASPECT_PRESETS = {
  "Livre": null,
  "3:4 (retrato)": 3 / 4,
  "1:1 (quadrado)": 1,
  "4:3 (paisagem)": 4 / 3,
};

async function getCroppedBlob(imgEl, crop) {
  // crop is in percent or pixel — we render as pixel-crop via completedCrop
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * scaleX));
  canvas.height = Math.max(1, Math.round(crop.height * scaleY));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    imgEl,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.92));
}

/** Modal de recorte com 8 pegas (cantos + arestas) e linhas guia. Recorte livre. */
export function PhotoCropDialog({ open, src, onCancel, onCropped }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState(); // uncontrolled at start; init on image load
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspectLabel, setAspectLabel] = useState("Livre");
  const [busy, setBusy] = useState(false);

  const aspect = ASPECT_PRESETS[aspectLabel];

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    // start with a centered crop covering ~90% da imagem
    const initial = centerCrop(
      aspect
        ? makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height)
        : { unit: "%", x: 5, y: 5, width: 90, height: 90 },
      width,
      height
    );
    setCrop(initial);
  };

  const changeAspect = (label) => {
    setAspectLabel(label);
    const a = ASPECT_PRESETS[label];
    const img = imgRef.current;
    if (!img) return;
    const { width, height } = img;
    const next = centerCrop(
      a
        ? makeAspectCrop({ unit: "%", width: 90 }, a, width, height)
        : { unit: "%", x: 5, y: 5, width: 90, height: 90 },
      width,
      height
    );
    setCrop(next);
  };

  const save = async () => {
    if (!completedCrop || !imgRef.current) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      onCropped(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel && onCancel()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recortar imagem</DialogTitle>
          <DialogDescription>
            Arrasta as pegas (cantos e arestas) para ajustar o recorte livremente. O espaço em falta será preenchido com o fundo da página.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center bg-black/60 rounded-md overflow-hidden p-2" style={{ maxHeight: "65vh" }}>
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect || undefined}
              ruleOfThirds
              keepSelection
              className="max-h-[65vh]"
            >
              {/* eslint-disable-next-line */}
              <img
                ref={imgRef}
                src={src}
                alt="A recortar"
                onLoad={onImageLoad}
                style={{ maxHeight: "60vh", display: "block" }}
                data-testid="crop-image"
              />
            </ReactCrop>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs mb-1 block">Formato</Label>
            <Select value={aspectLabel} onValueChange={changeAspect}>
              <SelectTrigger data-testid="crop-aspect">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ASPECT_PRESETS).map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground self-end pb-1">
            Dica: escolhe <strong>Livre</strong> para arrastar cada pega independentemente. O que sobrar no slot é preenchido com o fundo da página.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="crop-cancel">Cancelar</Button>
          <Button onClick={save} disabled={busy || !completedCrop?.width} data-testid="crop-save">
            {busy ? "A processar..." : "Aplicar recorte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
