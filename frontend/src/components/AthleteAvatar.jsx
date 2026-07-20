import { useEffect, useRef, useState } from "react";
import { api, API } from "@/lib/api";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { Camera, User } from "lucide-react";
import { toast } from "sonner";

/**
 * Avatar circular do atleta com upload/crop de foto de perfil.
 * A foto de perfil é armazenada na coleção `photos` com kind="profile" e evaluation_id=null.
 * Distinta das fotos das avaliações (frontal/perfil/costas).
 */
export function AthleteAvatar({ athleteId, isEditor, size = 96 }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/athletes/${athleteId}/photos`);
    const p = (data || []).find((x) => x.kind === "profile");
    setProfilePhoto(p || null);
    if (!p) {
      setPhotoUrl(null);
      return;
    }
    try {
      const token = localStorage.getItem("trofense_token");
      const res = await fetch(`${API}/photos/${p.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      setPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      /* skip */
    }
  };

  useEffect(() => {
    load();
    return () => { if (photoUrl) URL.revokeObjectURL(photoUrl); };
    // eslint-disable-next-line
  }, [athleteId]);

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setPendingFile(file);
    e.target.value = "";
  };

  const onCropped = async (blob) => {
    URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (!blob) return;
    const fd = new FormData();
    fd.append("file", blob, "profile.jpg");
    fd.append("date", new Date().toISOString().slice(0, 10));
    fd.append("kind", "profile");
    try {
      if (profilePhoto) {
        // Substituir binário e mudar data (kind mantém-se profile)
        await fetch(`${API}/photos/${profilePhoto.id}/replace`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${localStorage.getItem("trofense_token")}` },
          body: (() => { const f = new FormData(); f.append("file", blob, "profile.jpg"); return f; })(),
        });
      } else {
        await fetch(`${API}/athletes/${athleteId}/photos`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("trofense_token")}` },
          body: fd,
        });
      }
      toast.success("Foto de perfil atualizada");
      await load();
    } catch (e) {
      toast.error("Erro ao atualizar foto de perfil");
    } finally {
      setPendingFile(null);
    }
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full border-4 border-primary/80 shadow-lg overflow-hidden bg-secondary"
        style={{ width: size, height: size }}
        data-testid="athlete-avatar"
      >
        {photoUrl ? (
          <img src={photoUrl} alt="Perfil do atleta" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <User className="w-1/2 h-1/2" />
          </div>
        )}
      </div>
      {isEditor && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md border-2 border-background transition"
          title={photoUrl ? "Substituir foto de perfil" : "Adicionar foto de perfil"}
          data-testid="athlete-avatar-upload-btn"
        >
          <Camera className="w-4 h-4" />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
        data-testid="athlete-avatar-input"
      />
      <PhotoCropDialog
        open={!!cropSrc}
        src={cropSrc}
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
          setPendingFile(null);
        }}
        onCropped={onCropped}
      />
    </div>
  );
}
