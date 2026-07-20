import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { exportAthletePdfAsBase64 } from "@/lib/pdf";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";

/** Dialog para enviar o PDF de avaliação por email ao atleta. */
export function SendReportDialog({ open, onOpenChange, athlete, evals, weighins }) {
  const [email, setEmail] = useState(athlete?.email || "");
  const [message, setMessage] = useState(
    "Segue em anexo o relatório da tua última avaliação de composição corporal.\n\nQualquer dúvida, estamos ao dispor."
  );
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Indica o email do destinatário");
    setSending(true);
    try {
      const { base64, filename } = await exportAthletePdfAsBase64(athlete, evals, weighins);
      await api.post(`/athletes/${athlete.id}/send-report`, {
        recipient_email: email,
        message,
        pdf_base64: base64,
        filename,
      });
      toast.success(`Email enviado a ${email}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "Erro ao enviar email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" /> Enviar avaliação por email
          </DialogTitle>
          <DialogDescription>
            O relatório PDF é gerado agora e enviado como anexo. O destinatário recebe também uma mensagem personalizada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="rcp-email">Email do destinatário</Label>
            <Input
              id="rcp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="atleta@exemplo.com"
              data-testid="send-report-email"
            />
            {!athlete?.email && (
              <p className="text-xs text-muted-foreground mt-1">
                Este atleta ainda não tem email guardado no perfil. Podes preencher aqui uma única vez ou <b>editar o perfil</b> para o guardar.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="rcp-msg">Mensagem (opcional)</Label>
            <Textarea
              id="rcp-msg"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="send-report-message"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
            <Button type="submit" disabled={sending} className="gap-2" data-testid="send-report-submit">
              <Send className="w-4 h-4" /> {sending ? "A enviar..." : "Enviar email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
