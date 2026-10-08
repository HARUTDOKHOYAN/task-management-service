# Focus list: implementation plan (4 phases)

A personal task app for one user, on phone and computer. Tasks belong to projects. Priority changes by itself from the deadline. The main page shows High tasks grouped by project.

The folder `prototype/` (index.html, styles.css, app.js) is the approved design. Match it.

Give Claude Code one phase at a time. Each phase ends with working, tested code and a short demo. Do not start the next phase until the acceptance checks pass.

## Stack

| Part | Choice | Why |
| --- | --- | --- |
| App | React 18 + TypeScript + Vite | Fast setup, good with Atlaskit |
| UI | Atlaskit: `@atlaskit/tokens`, `button`, `modal-dialog`, `textfield`, `select`, `datetime-picker`, `lozenge`, `checkbox`, `section-message`, `flag` | Same look as the design (Atlassian Design System) |
| State | Zustand | Small and simple |
| Data | MongoDB via a small Express API (`server/`), URL in `.env.local` | Changed from Dexie in Phase 2 |
| Sync + login | Supabase (Postgres, magic-link auth, Row Level Security) | Same data on phone and computer |
| Phone | PWA with `vite-plugin-pwa` | Install on phone, no app store |
| Tests | Vitest (logic), Playwright (flows) | |
| Deploy | Vercel | |

## Data model

```ts
type Project = {
  id: string; name: string;
  color: string;        // one of 9 Atlassian accent colors, never red
  deadline: string;     // "YYYY-MM-DD", required
  note: string;         // "next step" note
  createdAt: string; updatedAt: string;
};

type Task = {
  id: string; projectId: string; name: string;
  date: string | null;  // "YYYY-MM-DD"; null = use project deadline
  time: string | null;  // "HH:MM"; null = end of day (23:59)
  pinned: boolean;      // pinned = always High
  done: boolean; doneAt: string | null;
  createdAt: string; updatedAt: string;
};
```

Priority is never stored. It is calculated every time from the deadline.

## Priority rules (must match exactly)

- Deadline = task date + time. No date: project deadline. No time: 23:59.
- Days left = calendar days from today to the deadline date.
- Overdue, today or tomorrow (days left ≤ 1): **High**. 2-3 days: **Medium**. 4+ days: **Low**.
- Pinned: always **High**. Done: not shown on the main page or in the week load.
- Overdue = deadline time is in the past and the task is not done.
- Sort: priority level first, then deadline time (earliest first).
- Main page groups: only projects with High tasks. Group order = earliest High deadline first. Projects with no High tasks: one short line at the bottom.
- Week load: open tasks for the next 7 days, today first. Overdue tasks count on today.

---

## Phase 1: Setup and screens (static)

**Goal:** the app looks exactly like the prototype, with fake data in memory.

Tasks:
1. Create the Vite + React + TypeScript project. Add ESLint, Prettier, Vitest.
2. Install Atlaskit packages and set up tokens (`@atlaskit/tokens` theme, light only for now).
3. Routing: `/` (Main page) and `/projects` (Projects).
4. Build components: `TopNav`, `ProjectGroup`, `TaskRow`, `WeekLoad`, `PriorityRules`, `ComingNext`, `ProjectAccordion`.
5. Use the demo data from `prototype/app.js` (dates relative to today).
6. Responsive layout: 3 columns on desktop, 1 column on phone. Week load and right column are desktop only. Phone has a fixed "Create task" button.

Acceptance:
- Side-by-side with the prototype at 1280 px and 390 px: same layout, colors, spacing.
- No console errors. Keyboard can reach every button.

Prompt for Claude Code:
> Read CLAUDE.md and PLAN.md. Do Phase 1 only. Rebuild the screens from prototype/ in React + TypeScript with Atlaskit components. Use the demo data in memory. Show me both pages at desktop and phone width when done.

## Phase 2: Data and priority engine

**Goal:** real data that stays after reload. The priority logic is tested.

Tasks:
1. Write `src/domain/priority.ts` as pure functions: `dueOf`, `levelOf`, `isOverdue`, `sortTasks`, `groupForMain`, `weekLoad`. No React inside.
2. Unit tests for every rule above, including: no date, no time, pinned, overdue, deadline today at an earlier hour, project with no High tasks, month change, daylight-saving change.
3. Inject "now" into the functions (no `new Date()` inside), so tests can set the time.
4. Dexie database with `projects` and `tasks` tables. Zustand store reads and writes through it.
5. Mark done with Undo flag (5 seconds).
6. Recalculate priorities every minute and when the app comes back to the foreground.

Acceptance:
- All priority tests pass. Coverage of `priority.ts` is 100%.
- Reload the page: data is still there.
- Change the computer clock to tomorrow: tasks move to the right priority.

Prompt for Claude Code:
> Do Phase 2 from PLAN.md. Start with priority.ts and its tests (write the tests first). Then add Dexie storage and connect the store. Do not change the UI design.

## Phase 3: Create, edit and the full UX

**Goal:** the user can manage everything without demo data.

Tasks:
1. **Create task** modal: name (required), project (required), date, time (only when a date is set), pin. Live priority preview: "This task will be High. The deadline is tomorrow."
2. **Create project** modal: name (required), 9 color swatches (no red), deadline (default: next Monday), live preview.
3. Edit and delete for tasks and projects. Deleting a project asks for confirmation and deletes its tasks.
4. Projects page accordion: open/close one, expand all, collapse all, remember open items. "Add task to this project" opens the task modal with the project selected.
5. Edit the "Next step" note on each project.
6. Empty states: no projects, no tasks, no High tasks.
7. Accessibility: focus moves into modals and back, `aria-expanded` on accordion, labels on all fields, contrast checked.
8. Playwright tests for: create project, create task, mark done + undo, accordion.

Acceptance:
- Start with an empty database. Create 2 projects and 5 tasks. The main page and week load are correct.
- All Playwright tests pass on desktop and phone sizes.

Prompt for Claude Code:
> Do Phase 3 from PLAN.md. Build the two modals, edit/delete, the accordion behavior and the empty states. Add Playwright tests for the main flows.

## Phase 4: Sync, phone app and launch

**Goal:** the same data on phone and computer. The app is online.

Tasks:
1. Supabase project: tables `projects` and `tasks` (same fields + `user_id`). Row Level Security: a user can only read and write their own rows.
2. Login with magic link (email). One user, but auth keeps the data private.
3. Sync: local-first. Write to Dexie first, then push to Supabase. Pull changes on start and with Supabase Realtime. Conflict rule: newest `updatedAt` wins.
4. PWA: manifest, icons, offline cache. "Install app" on phone.
5. Optional: reminder notification 1 hour before a High task's deadline.
6. Deploy to Vercel. Environment variables for Supabase keys. Error tracking (for example Sentry).

Acceptance:
- Create a task on the computer: it appears on the phone in under 5 seconds.
- Airplane mode on the phone: create a task, go online, it syncs.
- Lighthouse PWA and accessibility scores ≥ 90.

Prompt for Claude Code:
> Do Phase 4 from PLAN.md. Add Supabase auth and local-first sync with RLS, make the app a PWA, and prepare the Vercel deploy. Explain every setting I must create in Supabase and Vercel.

---

## Open decisions

- **Task duration and capacity check:** not decided. The data model can add `estimateHours: number | null` later without breaking anything.
- **Dark theme:** Atlaskit tokens support it. Add after Phase 3 if wanted.
- **Font:** the design uses Atlassian's system font fallback. Check the license before you ship the "Atlassian Sans" font.
