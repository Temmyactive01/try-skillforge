import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  onAssigned: () => void;
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
  const [confirmation, setConfirmation] = useState<string | null>(null);

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
      } else {
        if (!selectedTeam) throw new Error("Select a team.");
        userIds = employees.filter((e) => e.team_id === selectedTeam).map((e) => e.id);
      }
      if (userIds.length === 0) throw new Error("No employees selected.");

      const rows = userIds.map((uid) => ({
        course_id: courseId,
        user_id: uid,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        status: "not_started" as const,
      }));
      const { error: insErr } = await supabase.from("assignments").insert(rows);
      if (insErr) throw new Error(insErr.message);
      setConfirmation(`Assigned "${courseTitle}" to ${userIds.length} employee(s).`);
      setTimeout(onAssigned, 1200);
    } catch (err: any) {
      setError(err.message ?? "Failed to assign.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign Course</h2>
            <p className="text-sm text-slate-600">{courseTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : confirmation ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {confirmation}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "employees"}
                  onChange={() => setMode("employees")}
                />
                Individual employees
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={mode === "team"}
                  onChange={() => setMode("team")}
                />
                Whole team
              </label>
            </div>

            {mode === "employees" ? (
              <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200">
                {employees.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No employees yet.</p>
                ) : (
                  employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmp.has(emp.id)}
                        onChange={() => toggleEmp(emp.id)}
                      />
                      <span className="text-slate-900">{emp.name}</span>
                      <span className="text-xs text-slate-500">{emp.email}</span>
                    </label>
                  ))
                )}
              </div>
            ) : (
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className={inputCls}
              >
                <option value="">Select a team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (
                    {employees.filter((emp) => emp.team_id === t.id).length} members)
                  </option>
                ))}
              </select>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
