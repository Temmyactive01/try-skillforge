import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Team = { id: string; name: string };
type Employee = { id: string; name: string; email: string; team_id: string | null };

type Mode = "employees" | "team";

export function AssignCourseModal({
  courseId,
  courseTitle,
  onClose,
  onAssigned,
}: {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  /** Called with a confirmation for the page to show once the dialog closes. */
  onAssigned: (message: string) => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [mode, setMode] = useState<Mode>("employees");
  const [selectedEmp, setSelectedEmp] = useState<Set<string>>(new Set());
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("id, name").order("name"),
        supabase
          .from("profiles")
          .select("id, name, email, team_id, role")
          .eq("role", "employee")
          .order("name"),
      ]);
      setTeams(t ?? []);
      setEmployees((p ?? []) as Employee[]);
      setLoading(false);
    })();
  }, []);

  function toggleEmp(id: string) {
    setSelectedEmp((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let userIds: string[] = [];
      if (mode === "employees") {
        userIds = [...selectedEmp];
        if (userIds.length === 0) throw new Error("Choose at least one employee.");
      } else {
        if (!selectedTeam) throw new Error("Choose a team.");
        userIds = employees.filter((emp) => emp.team_id === selectedTeam).map((emp) => emp.id);
        if (userIds.length === 0) {
          throw new Error("That team has no members yet. Add someone to it first.");
        }
      }

      const rows = userIds.map((uid) => ({
        course_id: courseId,
        user_id: uid,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        status: "not_started" as const,
      }));
      const { error: insErr } = await supabase.from("assignments").insert(rows);
      if (insErr) throw new Error(insErr.message);

      onAssigned(
        `Assigned ${courseTitle} to ${userIds.length} ${userIds.length === 1 ? "person" : "people"}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't assign the course. Check your connection and try again.",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-heading-3">Assign course</DialogTitle>
          <DialogDescription>{courseTitle}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-small text-ink-muted">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset>
              <legend className="mb-2 block text-small font-medium text-ink">Assign to</legend>
              <RadioGroup
                className="flex flex-wrap gap-6"
                value={mode}
                onValueChange={(value) => setMode(value as Mode)}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="assign-mode-employees" value="employees" />
                  <Label htmlFor="assign-mode-employees" className="font-normal">
                    Individual employees
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="assign-mode-team" value="team" />
                  <Label htmlFor="assign-mode-team" className="font-normal">
                    A whole team
                  </Label>
                </div>
              </RadioGroup>
            </fieldset>

            {mode === "employees" ? (
              <div className="max-h-60 overflow-y-auto rounded-sm border border-steel-strong">
                {employees.length === 0 ? (
                  <p className="p-3 text-small text-ink-muted">
                    No employees yet. Invite someone from the Employees page first.
                  </p>
                ) : (
                  <ul className="divide-y divide-steel">
                    {employees.map((emp) => (
                      <li key={emp.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-small">
                          <Checkbox
                            checked={selectedEmp.has(emp.id)}
                            onCheckedChange={() => toggleEmp(emp.id)}
                          />
                          <span className="text-ink">{emp.name}</span>
                          <span className="truncate text-ink-muted">{emp.email}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="assign-team">Team</Label>
                <select
                  id="assign-team"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="h-9 w-full rounded-sm border border-steel-strong bg-surface px-3 text-small text-ink"
                >
                  <option value="">Choose a team…</option>
                  {teams.map((t) => {
                    const members = employees.filter((emp) => emp.team_id === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({members} {members === 1 ? "member" : "members"})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assign-due">Due date</Label>
              <Input
                id="assign-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <p className="text-small text-ink-muted">
                Optional. Leave it empty for training with no deadline.
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
                {saving ? "Assigning…" : "Assign course"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
