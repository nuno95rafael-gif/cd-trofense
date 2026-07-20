import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ASPECTS = {
  "3:4 (retrato)": 3 / 4,
  "1:1 (quadrado)": 1,
  "4:3 (paisagem)": 4 / 3,
  livre: null,
};

async function getCroppedBlob(imageSrc, cropPixels) {
  const image = await new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, cropPixels.width, cropPixels.height);
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.9));
}

/** Opens a modal to crop the supplied `src` and returns the cropped Blob via onCropped. */
export function PhotoCropDialog({ open, src, aspectLabel = "3:4 (retrato)", onCancel, onCropped }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(aspectLabel);
  const [pixels, setPixels] = useState(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_area, areaPixels) => setPixels(areaPixels), []);

  const save = async () => {
    if (!pixels || !src) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, pixels);
      onCropped(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel && onCancel()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recortar imagem</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-[60vh] bg-black rounded-md overflow-hidden">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={ASPECTS[aspect]}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
              restrictPosition={false}
            />
          )}
        </div>
        <div className="grid md:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs mb-1 block">Rácio</Label>
            <Select value={aspect} onValueChange={setAspect}>
              <SelectTrigger data-testid="crop-aspect"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(ASPECTS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Zoom · {zoom.toFixed(2)}x</Label>
            <Slider
              min={1}
              max={4}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              data-testid="crop-zoom"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid="crop-cancel">Cancelar</Button>
          <Button onClick={save} disabled={busy || !pixels} data-testid="crop-save">
            {busy ? "A processar..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
