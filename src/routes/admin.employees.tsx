import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/lib/use-require-role";
import { createEmployee, listPendingEmployeeIds } from "@/lib/employees.functions";
import { sortRows, type Sort } from "@/lib/sorting";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tag } from "@/components/ui/tag";
import { TemperProgress } from "@/components/ui/temper-progress";
import { SortableHeader } from "@/components/ui/sortable-header";
import { toastDone, toastFailed } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/employees")({
  head: () => ({ meta: [{ title: "Employees — SkillForge" }] }),
  component: AdminEmployeesPage,
});

type Team = { id: string; name: string; member_count: number };

type Employee = {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  team_name: string | null;
  /** Invited but never signed in. */
  pending: boolean;
  /** Percentage of their assignments finished, or null when they have none. */
  completion: number | null;
};

type SortColumn = "name" | "email" | "team_name" | "pending" | "completion";

const NO_TEAM = "—";

/** A field a form can't submit without. Keeps the three small forms consistent. */
const required = (value: string) => value.trim().length > 0;

function AdminEmployeesPage() {
  const { checking, name } = useRequireRole("admin");
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [addingTeam, setAddingTeam] = useState(false);
  const [renaming, setRenaming] = useState<Team | null>(null);
  const [movingEmployee, setMovingEmployee] = useState<Employee | null>(null);
  const [sort, setSort] = useState<Sort<SortColumn>>({ column: "name", direction: "asc" });

  async function refresh() {
    setLoading(true);
    const [
      { data: teamRows, error: tErr },
      { data: profileRows, error: pErr },
      { data: assigned },
    ] = await Promise.all([
      supabase.from("teams").select("id, name").order("name"),
      supabase
        .from("profiles")
        .select("id, name, email, team_id")
        .eq("role", "employee")
        .order("name"),
      supabase.from("assignments").select("user_id, status"),
    ]);

    if (tErr || pErr) {
      toastFailed("Couldn't load your people. Check your connection and refresh the page.");
      setLoading(false);
      return;
    }

    const teamList = teamRows ?? [];
    const profiles = profileRows ?? [];
    const teamNames = new Map(teamList.map((t) => [t.id, t.name]));

    /*
     * Pending status comes from the Auth API, which the browser can't read, so
     * it arrives separately. If that call fails the list is still useful, so
     * fall back to showing everyone as active rather than failing the page.
     */
    let pending = new Set<string>();
    try {
      const res = await listPendingEmployeeIds({ data: undefined });
      pending = new Set(res.pendingIds);
    } catch {
      // Status unavailable; the rest of the row is still worth showing.
    }

    const progress = new Map<string, { done: number; total: number }>();
    for (const a of assigned ?? []) {
      if (a.status === "cancelled") continue;
      const entry = progress.get(a.user_id) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (a.status === "complete") entry.done += 1;
      progress.set(a.user_id, entry);
    }

    setTeams(
      teamList.map((t) => ({
        id: t.id,
        name: t.name,
        member_count: profiles.filter((p) => p.team_id === t.id).length,
      })),
    );
    setEmployees(
      profiles.map((p) => {
        const made = progress.get(p.id);
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          team_id: p.team_id,
          team_name: p.team_id ? (teamNames.get(p.team_id) ?? null) : null,
          pending: pending.has(p.id),
          completion: made?.total ? Math.round((made.done / made.total) * 100) : null,
        };
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (!checking) refresh();
  }, [checking]);

  const sorted = useMemo(
    () =>
      sortRows(employees, sort, (e, column) => {
        switch (column) {
          case "name":
            return e.name.toLocaleLowerCase();
          case "email":
            return e.email.toLocaleLowerCase();
          case "team_name":
            return e.team_name?.toLocaleLowerCase() ?? null;
          case "pending":
            // Invited first when ascending: those are the ones needing a nudge.
            return e.pending ? 0 : 1;
          case "completion":
            return e.completion;
        }
      }),
    [employees, sort],
  );

  async function deleteTeam(team: Team) {
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) {
      toastFailed("Couldn't delete the team. Check your connection and try again.");
      return;
    }
    toastDone(`Deleted ${team.name}.`);
    refresh();
  }

  if (checking) return null;

  return (
    <AdminShell name={name}>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-heading-1 font-expanded text-ink">Employees</h1>
          <Button onClick={() => setInviting(true)}>
            <Plus aria-hidden />
            Invite employee
          </Button>
        </div>

        <section className="rounded-md border border-steel bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel p-4">
            <h2 className="text-heading-3 text-ink">Teams</h2>
            <Button variant="outline" size="sm" onClick={() => setAddingTeam(true)}>
              Add team
            </Button>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-small text-ink-muted">Loading…</p>
          ) : teams.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-body text-ink">No teams yet.</p>
              <p className="mt-1 text-small text-ink-muted">
                Add a team to group employees and assign training to everyone at once.
              </p>
            </div>
          ) : (
            <ul aria-label="Teams" className="divide-y divide-steel">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body text-ink">{team.name}</p>
                    <p className="text-small text-ink-muted">
                      {team.member_count} {team.member_count === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <TeamActions
                    team={team}
                    onRename={() => setRenaming(team)}
                    onDelete={() => deleteTeam(team)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-steel bg-surface">
          <div className="border-b border-steel p-4">
            <h2 className="text-heading-3 text-ink">People</h2>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-small text-ink-muted">Loading…</p>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-body text-ink">No employees yet.</p>
              <p className="mt-1 text-small text-ink-muted">
                Invite your first employee to start assigning training.
              </p>
            </div>
          ) : (
            <>
              {/* Five columns can't be read on a phone, so each row becomes a card. */}
              <ul aria-label="Employees" className="divide-y divide-steel md:hidden">
                {sorted.map((e) => (
                  <li key={e.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium text-ink">{e.name}</p>
                        <p className="truncate text-small text-ink-muted">{e.email}</p>
                      </div>
                      <StatusTag pending={e.pending} />
                    </div>
                    <Completion employee={e} />
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-small text-ink-muted">
                        {e.team_name ? `Team: ${e.team_name}` : "No team"}
                      </p>
                      <EmployeeActions employee={e} onChangeTeam={() => setMovingEmployee(e)} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader column="name" sort={sort} onSort={setSort}>
                        Name
                      </SortableHeader>
                      <SortableHeader column="email" sort={sort} onSort={setSort}>
                        Email
                      </SortableHeader>
                      <SortableHeader column="team_name" sort={sort} onSort={setSort}>
                        Team
                      </SortableHeader>
                      <SortableHeader column="pending" sort={sort} onSort={setSort}>
                        Status
                      </SortableHeader>
                      <SortableHeader column="completion" sort={sort} onSort={setSort}>
                        Completion
                      </SortableHeader>
                      <TableHead scope="col" className="text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell className="text-ink-muted">{e.email}</TableCell>
                        <TableCell>{e.team_name ?? NO_TEAM}</TableCell>
                        <TableCell>
                          <StatusTag pending={e.pending} />
                        </TableCell>
                        <TableCell>
                          <Completion employee={e} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <EmployeeActions employee={e} onChangeTeam={() => setMovingEmployee(e)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      </div>

      {inviting && (
        <InviteEmployeeDialog
          teams={teams}
          onClose={() => setInviting(false)}
          onInvited={(message) => {
            setInviting(false);
            toastDone(message);
            refresh();
          }}
        />
      )}

      {addingTeam && (
        <TeamDialog
          onClose={() => setAddingTeam(false)}
          onSaved={(message) => {
            setAddingTeam(false);
            toastDone(message);
            refresh();
          }}
        />
      )}

      {renaming && (
        <TeamDialog
          team={renaming}
          onClose={() => setRenaming(null)}
          onSaved={(message) => {
            setRenaming(null);
            toastDone(message);
            refresh();
          }}
        />
      )}

      {movingEmployee && (
        <ChangeTeamDialog
          employee={movingEmployee}
          teams={teams}
          onClose={() => setMovingEmployee(null)}
          onSaved={(message) => {
            setMovingEmployee(null);
            toastDone(message);
            refresh();
          }}
        />
      )}
    </AdminShell>
  );
}

/*
 * Invited and Active are not stages of progress, so neither gets a temper
 * colour: the word carries the meaning, and the weight of the ink separates
 * the two. See DESIGN.md → "The temper scale".
 */
function StatusTag({ pending }: { pending: boolean }) {
  return pending ? <Tag tone="quiet">Invited</Tag> : <Tag tone="neutral">Active</Tag>;
}

/** Someone with nothing assigned isn't at 0% — there is nothing to measure yet. */
function Completion({ employee }: { employee: Employee }) {
  if (employee.completion === null) {
    return <span className="text-small text-ink-muted">Not assigned yet</span>;
  }
  return (
    <TemperProgress
      value={employee.completion}
      label={`Training complete, ${employee.name}`}
      className="min-w-28"
    />
  );
}

function TeamActions({
  team,
  onRename,
  onDelete,
}: {
  team: Team;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`More actions for ${team.name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRename}>Rename team</DropdownMenuItem>
          {/* The menu must close before the dialog opens, or it keeps the rest
              of the page out of the accessibility tree afterwards. */}
          <DropdownMenuItem className="text-oxide" onSelect={() => setConfirming(true)}>
            Delete team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this team?</AlertDialogTitle>
            <AlertDialogDescription>
              {team.member_count > 0
                ? `${team.name} will go, and its ${team.member_count} ${team.member_count === 1 ? "member" : "members"} will have no team until you move them. Nobody loses their account or their training.`
                : `${team.name} will go. Nobody is in it.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep team</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete team</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EmployeeActions({
  employee,
  onChangeTeam,
}: {
  employee: Employee;
  onChangeTeam: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`More actions for ${employee.name}`}>
          <MoreHorizontal aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onChangeTeam}>Change team</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteEmployeeDialog({
  teams,
  onClose,
  onInvited,
}: {
  teams: Team[];
  onClose: () => void;
  onInvited: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<{ name?: string; email?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const found: { name?: string; email?: string } = {};
    if (!required(name)) found.name = "Enter their name.";
    if (!required(email)) found.email = "Enter their work email address.";
    setProblems(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      await createEmployee({
        data: {
          name: name.trim(),
          email: email.trim(),
          team_id: teamId || null,
          redirect_origin: window.location.origin,
        },
      });
      onInvited(`Invite sent to ${email.trim()}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /already/i.test(message)
          ? "That email is already invited. Resend the invite from the Employees list."
          : "Couldn't send the invite. Check the email address and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading-3">Invite employee</DialogTitle>
          <DialogDescription>
            They get an email with a link to set their own password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(problems.name)}
            />
            {problems.name && (
              <p role="alert" className="text-small text-oxide">
                {problems.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(problems.email)}
            />
            {problems.email && (
              <p role="alert" className="text-small text-oxide">
                {problems.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-team">Team</Label>
            <select
              id="invite-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-9 w-full rounded-sm border border-steel-strong bg-surface px-3 text-small text-ink"
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-small text-ink-muted">
              Optional. You can move them to a team at any time.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border border-oxide/40 bg-oxide/10 px-3 py-2 text-small text-oxide"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds a team, or renames the one it is given. */
function TeamDialog({
  team,
  onClose,
  onSaved,
}: {
  team?: Team;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(team?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!required(name)) {
      setProblem("Enter a team name.");
      return;
    }
    setProblem(null);
    setSaving(true);
    try {
      if (team) {
        const { error: upErr } = await supabase
          .from("teams")
          .update({ name: name.trim() })
          .eq("id", team.id);
        if (upErr) throw new Error(upErr.message);
        onSaved(`Renamed the team to ${name.trim()}.`);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("signed out");
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile) throw new Error("no profile");

      const { error: insErr } = await supabase
        .from("teams")
        .insert({ name: name.trim(), company_id: profile.company_id });
      if (insErr) throw new Error(insErr.message);
      onSaved(`Added the team ${name.trim()}.`);
    } catch {
      setError(
        team
          ? "Couldn't rename the team. Check your connection and try again."
          : "Couldn't add the team. Check your connection and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading-3">{team ? "Rename team" : "Add team"}</DialogTitle>
          <DialogDescription>
            {team
              ? "Everyone in the team keeps their training."
              : "Teams let you assign a course to several people at once."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(problem)}
            />
            {problem && (
              <p role="alert" className="text-small text-oxide">
                {problem}
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border border-oxide/40 bg-oxide/10 px-3 py-2 text-small text-oxide"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : team ? "Save team" : "Add team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeTeamDialog({
  employee,
  teams,
  onClose,
  onSaved,
}: {
  employee: Employee;
  teams: Team[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [teamId, setTeamId] = useState(employee.team_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    /*
     * The database allows an admin to change one column on a colleague's
     * profile — their team — and refuses everything else. See the
     * restrict_admin_profile_update trigger.
     */
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ team_id: teamId || null })
      .eq("id", employee.id);
    if (upErr) {
      setError("Couldn't move them. Check your connection and try again.");
      setSaving(false);
      return;
    }
    const target = teams.find((t) => t.id === teamId);
    onSaved(
      target
        ? `Moved ${employee.name} to ${target.name}.`
        : `Removed ${employee.name} from their team.`,
    );
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading-3">Change team</DialogTitle>
          <DialogDescription>{employee.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="change-team">Team</Label>
            <select
              id="change-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-9 w-full rounded-sm border border-steel-strong bg-surface px-3 text-small text-ink"
            >
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-small text-ink-muted">
              Moving someone doesn't change the training they already have.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-sm border border-oxide/40 bg-oxide/10 px-3 py-2 text-small text-oxide"
            >
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
