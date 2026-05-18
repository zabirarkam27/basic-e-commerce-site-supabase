import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Noor Honey" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://noorhoney.lovable.app/reset-password" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery token from the URL hash and
    // fires a PASSWORD_RECOVERY event. We just wait for a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Redirecting…");
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/admin" }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      <div className="grid min-h-screen place-items-center bg-secondary/40 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-pop">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground font-bold shadow-soft">
              N
            </div>
            <h1 className="text-xl font-bold">Set a new password</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a strong password you haven't used before.
            </p>
          </div>
          {!ready ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Validating reset link…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <input
                type="password"
                required
                minLength={8}
                placeholder="New password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                autoComplete="new-password"
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                autoComplete="new-password"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <a href="/admin" className="hover:text-foreground">
              ← Back to admin
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
