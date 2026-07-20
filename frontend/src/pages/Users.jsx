import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "viewer" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", form);
      toast.success("Utilizador criado");
      setForm({ email: "", name: "", password: "", role: "viewer" });
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const toggle = async (u, active) => {
    try {
      await api.patch(`/users/${u.id}?active=${active}`);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Administração</div>
        <h1 className="font-display text-4xl font-bold tracking-tighter mt-1">Utilizadores</h1>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="font-display text-xl font-bold mb-4">Criar utilizador</h3>
        <form onSubmit={create} className="grid md:grid-cols-4 gap-3 items-end">
          <div><Label className="text-xs">Nome</Label><Input data-testid="user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label className="text-xs">Email</Label><Input type="email" data-testid="user-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div><Label className="text-xs">Palavra-passe</Label><Input type="password" data-testid="user-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
          <div>
            <Label className="text-xs">Papel</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="user-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={saving} data-testid="create-user-btn" className="md:col-span-4 md:justify-self-end">
            {saving ? "A criar..." : "Criar"}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded-full text-xs uppercase tracking-wider font-semibold ${u.role === "editor" ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                    {u.role}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.active}
                    disabled={u.id === user?.id}
                    onCheckedChange={(v) => toggle(u, v)}
                    data-testid={`toggle-user-${u.id}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
