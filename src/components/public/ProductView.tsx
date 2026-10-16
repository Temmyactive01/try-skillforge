import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TemperProgress } from "@/components/ui/temper-progress";
import { cn } from "@/lib/utils";
import {
  DEMO_ASSIGNMENTS,
  DEMO_COURSES,
  DEMO_DASHBOARD,
  DEMO_QUIZ,
  DEMO_TRAINING,
  STATUS_LABEL,
  STATUS_TONE,
  type DemoAssignment,
  type DemoDue,
  type DemoTraining,
} from "./demo-data";

/*
 * The product views on the public site.
 *
 * DESIGN.md: "the hero shows a real admin table with temper progress bars, not
 * an abstract illustration." These are built from the same kit the admin and
 * employee screens are built from — Table, Tag, TemperProgress — so they
 * cannot drift from the product the way a screenshot does. A change to
 * TemperProgress changes the marketing site in the same commit.
 *
 * They are display only: no links, no buttons that do anything, no data
 * fetching, no Supabase. A visitor is looking at a picture made of components,
 * not at an app they are signed in to.
 */

/** The frame. DESIGN.md gives radius-lg to dialogs and the marketing hero only. */
export function ProductFrame({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-steel bg-surface", className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-steel px-4 py-3">
        <span className="text-small font-semibold text-ink">{title}</span>
        {/*
         * Said on every frame, not in a footnote. None of these are customers
         * and none of these numbers were measured.
         */}
        <span className="text-small text-ink-muted">Example data</span>
      </figcaption>
      {children}
    </figure>
  );
}

/** DESIGN.md: "Overdue is oxide, always with words", never colour on its own. */
function Due({ due }: { due: DemoDue }) {
  if (due.tone === "overdue") return <span className="font-medium text-oxide">{due.label}</span>;
  if (due.tone === "soon") return <Tag tone="straw">{due.label}</Tag>;
  if (due.tone === "none") return <span className="text-ink-muted">{due.label}</span>;
  return <span className="text-ink">{due.label}</span>;
}

function Score({ row }: { row: DemoAssignment }) {
  if (row.score === null) return <span className="text-ink-muted">—</span>;
  return (
    <TemperProgress value={row.score} label={`Best score, ${row.course}`} className="min-w-28" />
  );
}

/**
 * The admin's assignments table, as the hero shows it.
 *
 * Five columns cannot be read at 375px, so below `xl` each row becomes a card —
 * which is what the real page does too, at its own width. The hero switches
 * later than the page does because the frame is only part of the hero: seven
 * of twelve columns is 627px at 1440, and five columns do not fit that.
 */
export function AssignmentsView({ className }: { className?: string }) {
  return (
    <ProductFrame title="Assignments" className={className}>
      <ul className="divide-y divide-steel xl:hidden">
        {DEMO_ASSIGNMENTS.map((row) => (
          <li key={`${row.employee}-${row.course}`} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-body font-medium text-ink">{row.employee}</p>
                <p className="text-small text-ink-muted">{row.course}</p>
              </div>
              <Tag tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Tag>
            </div>
            {row.score !== null && <Score row={row} />}
            <p className="text-small">
              <Due due={row.due} />
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden xl:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Employee</TableHead>
              <TableHead scope="col">Course</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Best score</TableHead>
              <TableHead scope="col">Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_ASSIGNMENTS.map((row) => (
              <TableRow key={`${row.employee}-${row.course}`}>
                <TableCell className="whitespace-nowrap text-ink">{row.employee}</TableCell>
                <TableCell className="whitespace-nowrap text-ink">{row.course}</TableCell>
                <TableCell>
                  <Tag tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Tag>
                </TableCell>
                <TableCell>
                  <Score row={row} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Due due={row.due} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ProductFrame>
  );
}

function TrainingItem({ item, primary }: { item: DemoTraining; primary: boolean }) {
  return (
    <li className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:gap-6 md:p-6">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-heading-3 text-ink">{item.course}</p>
          <Tag tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Tag>
        </div>
        <p className="text-small text-ink-muted">
          {item.category} · <Due due={item.due} />
        </p>
        {item.score !== null && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-small text-ink-muted">Best score</span>
            <TemperProgress
              value={item.score}
              label={`Best score for ${item.course}`}
              className="max-w-40"
            />
          </div>
        )}
      </div>
      {/*
       * The shape of the button, not the button. Nothing on a marketing page
       * should look clickable and then refuse, and a real <button> would be a
       * tab stop that does nothing. A span carrying the button classes looks
       * right, has no role to announce, and still reads as the word it is.
       */}
      <span
        className={cn(
          buttonVariants({ variant: primary ? "default" : "outline" }),
          "self-start md:self-auto",
        )}
      >
        {item.action}
      </span>
    </li>
  );
}

/** The same company from the other side: one employee's list, deadline first. */
export function TrainingView({ className }: { className?: string }) {
  return (
    <ProductFrame title="Your training" className={className}>
      <ul className="divide-y divide-steel">
        {DEMO_TRAINING.map((item, index) => (
          <TrainingItem key={item.course} item={item} primary={index === 0} />
        ))}
      </ul>
    </ProductFrame>
  );
}

/* ---------------------------------------------------------------------------
 * The rest of the tour. Same rules: real kit components, example data, and
 * nothing that looks interactive and then refuses.
 * ------------------------------------------------------------------------- */

/** The admin dashboard's three panels. The real ones are links; these are not. */
export function DashboardView({ className }: { className?: string }) {
  const d = DEMO_DASHBOARD;

  return (
    <ProductFrame title="Dashboard" className={className}>
      <div className="grid gap-4 p-4 sm:grid-cols-3 sm:gap-6 sm:p-6">
        <div className="rounded-md border border-steel p-4">
          <p className="text-small text-ink-muted">Overall completion</p>
          <p className="text-figure tabular-nums text-ink">{d.completion}%</p>
          <TemperProgress
            value={d.completion}
            label="Overall completion"
            showValue={false}
            className="mt-3"
          />
          <p className="mt-3 text-small text-ink-muted">
            {d.complete} of {d.total} assignments finished
          </p>
        </div>

        <div className="rounded-md border border-steel p-4">
          <p className="text-small text-ink-muted">Active courses</p>
          <p className="text-figure tabular-nums text-ink">{d.activeCourses}</p>
          <p className="mt-3 text-small text-ink-muted">Every course you have built is in use</p>
        </div>

        <div className="rounded-md border border-steel p-4">
          <p className="text-small text-ink-muted">Overdue assignments</p>
          <p className="text-figure tabular-nums text-oxide">{d.overdue}</p>
          {/* Overdue is never colour alone: the words say it too. */}
          <p className="mt-3 text-small text-oxide">
            The oldest is {d.oldestOverdueDays} days late
          </p>
        </div>
      </div>
    </ProductFrame>
  );
}

/** The Courses list: what has been built, and how far it has got. */
export function CoursesView({ className }: { className?: string }) {
  return (
    <ProductFrame title="Courses" className={className}>
      <ul className="divide-y divide-steel sm:hidden">
        {DEMO_COURSES.map((course) => (
          <li key={course.title} className="space-y-3 p-4">
            <div>
              <p className="text-body font-medium text-ink">{course.title}</p>
              <p className="text-small text-ink-muted">
                {course.category} · {course.questions} questions · {course.assigned} assigned
              </p>
            </div>
            <TemperProgress value={course.completion} label={`Completion, ${course.title}`} />
          </li>
        ))}
      </ul>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Course</TableHead>
              <TableHead scope="col">Questions</TableHead>
              <TableHead scope="col">Assigned</TableHead>
              <TableHead scope="col">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_COURSES.map((course) => (
              <TableRow key={course.title}>
                <TableCell>
                  <span className="block whitespace-nowrap text-ink">{course.title}</span>
                  <span className="block text-small text-ink-muted">{course.category}</span>
                </TableCell>
                <TableCell className="tabular-nums text-ink">{course.questions}</TableCell>
                <TableCell className="tabular-nums text-ink">{course.assigned}</TableCell>
                <TableCell>
                  <TemperProgress
                    value={course.completion}
                    label={`Completion, ${course.title}`}
                    className="min-w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ProductFrame>
  );
}

/**
 * One quiz question, mid-course.
 *
 * The options are drawn rather than rendered as radios: a real radio group
 * here would be a tab stop that changes nothing, and would tell a screen
 * reader it is a form when it is a picture. The chosen one is marked with the
 * word "Chosen" as well as the fill, so the state is never colour alone.
 */
export function QuizView({ className }: { className?: string }) {
  return (
    <ProductFrame title={DEMO_QUIZ.course} className={className}>
      <div className="space-y-4 p-4 sm:p-6">
        <p className="text-small text-ink-muted">{DEMO_QUIZ.position}</p>
        <p className="max-w-[60ch] text-heading-3 text-ink">{DEMO_QUIZ.question}</p>

        <ul className="space-y-2">
          {DEMO_QUIZ.options.map((option, index) => {
            const chosen = index === DEMO_QUIZ.chosen;
            return (
              <li
                key={option}
                className={cn(
                  "flex items-start gap-3 rounded-sm border px-3 py-2 text-body",
                  chosen
                    ? "border-temper-blue bg-temper-blue/10 text-ink"
                    : "border-steel-strong text-ink",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1 size-4 shrink-0 rounded-full border",
                    chosen ? "border-temper-blue bg-temper-blue" : "border-steel-strong",
                  )}
                />
                <span className="flex-1">{option}</span>
                {chosen && <span className="shrink-0 text-small text-ink-muted">Chosen</span>}
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2 pt-2">
          <span className={buttonVariants({ variant: "outline" })}>Back</span>
          <span className={buttonVariants()}>Next</span>
        </div>
      </div>
    </ProductFrame>
  );
}
