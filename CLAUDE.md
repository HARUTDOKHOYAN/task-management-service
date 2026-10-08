# CLAUDE.md: Focus list

Personal task manager. One user, phone and computer. Read PLAN.md for the phases. Work on one phase at a time.

## Source of truth
- Design: `prototype/index.html`, `prototype/styles.css`, `prototype/app.js`. Match layout, spacing and colors.
- Priority rules: the "Priority rules" section of PLAN.md. Do not change them without asking.

## Rules
- TypeScript strict mode. No `any`.
- Priority logic lives only in `src/domain/priority.ts`, as pure functions. Pass "now" as a parameter. Never store priority in the database.
- UI: Atlaskit components and `@atlaskit/tokens` (`token('color.text')`, etc.). No hard-coded colors, except project colors.
- Project colors: the 9 Atlassian accent "bolder" colors in `prototype/app.js` (COLORS). Never red: red means High priority.
- Accessibility: every input has a label, icon buttons have `aria-label`, accordion uses `aria-expanded`, modals trap focus.
- Phone: touch targets at least 44 px. Week load and right column are desktop only.
- Write tests first for domain logic. Run `npm test` before you say a task is done.
- Keep the user's text simple English (short sentences).

## Commands (after Phase 1 setup)
- `npm run dev`: start the app (Vite + API server on MongoDB, config in `.env.local`)
- `npm run test:coverage`: unit tests with coverage (priority.ts must be 100%)
- `npm test`: unit tests (Vitest)
- `npm run test:e2e`: Playwright tests
- `npm run build`: production build

## Ask before
- Adding a new library not in PLAN.md
- Changing the data model or the priority rules
- Anything that deletes user data
