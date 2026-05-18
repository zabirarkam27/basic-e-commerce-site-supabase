import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, UserPlus, Shield, ShieldCheck, Eye, ShoppingBag } from "lucide-react";
import {
  ROLES,
  type Role,
  listTeam,
  createTeamMember,
  setTeamRole,
  removeTeamMember,
} from "@/lib/team.functions";

type Member = {
  user_id: string;
  email: string | null;
  roles: string[];
  created_at: string;
};

const ROLE_META: Record<
  Role,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  super_admin: { label: "Super Admin", icon: ShieldCheck, tone: "bg-primary/15 text-primary" },
  admin: { label: "Admin", icon: Shield, tone: "bg-accent/15 text-accent-foreground" },
  sales: { label: "Sales", icon: ShoppingBag, tone: "bg-warning/15 text-warning" },
  viewer: { label: "Viewer", icon: Eye, tone: "bg-muted text-muted-foreground" },
};

export function TeamPanel({ currentUserId }: { currentUserId: string }) {
  const fetchList = useServerFn(listTeam);
  const create = useServerFn(createTeamMember);
  const setRole = useServerFn(setTeamRole);
  const remove = useServerFn(removeTeamMember);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleInput] = useState<Role>("sales");
  const [creating, setCreating] = useState(false);

  const refetch = async () => {
    try {
      const list = await fetchList();
      setMembers(list as Member[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await create({ data: { email, password, role } });
      toast.success(`${ROLE_META[role].label} added`);
      setEmail("");
      setPassword("");
      setRoleInput("sales");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreating(false);
    }
  };

  const onChangeRole = async (user_id: string, newRole: Role) => {
    try {
      await setRole({ data: { user_id, role: newRole } });
      toast.success("Role updated");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const onRemove = async (m: Member) => {
    if (!confirm(`Remove ${m.email}? This cannot be undone.`)) return;
    try {
      await remove({ data: { user_id: m.user_id } });
      toast.success("Member removed");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add team member</h3>
        </div>
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto]">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoComplete="off"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            autoComplete="new-password"
          />
          <select
            value={role}
            onChange={(e) => setRoleInput(e.target.value as Role)}
            className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          <strong>Super Admin</strong>: full access incl. team. <strong>Admin</strong>: products,
          orders, settings, landing. <strong>Sales</strong>: only orders (view & update).{" "}
          <strong>Viewer</strong>: read-only orders.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Team members ({members.length})</h3>
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const primaryRole = (
                m.roles.includes("super_admin")
                  ? "super_admin"
                  : m.roles.includes("admin")
                    ? "admin"
                    : m.roles.includes("sales")
                      ? "sales"
                      : "viewer"
              ) as Role;
              const meta = ROLE_META[primaryRole];
              const Icon = meta.icon;
              const isSelf = m.user_id === currentUserId;
              return (
                <div key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-[200px] flex-1">
                    <div className="text-sm font-medium">{m.email ?? m.user_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {meta.label}
                      {isSelf && " · you"}
                    </div>
                  </div>
                  <select
                    value={primaryRole}
                    disabled={isSelf}
                    onChange={(e) => onChangeRole(m.user_id, e.target.value as Role)}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => onRemove(m)}
                    disabled={isSelf}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40"
                    title={isSelf ? "Cannot remove yourself" : "Remove member"}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              );
            })}
            {members.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">No members yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
