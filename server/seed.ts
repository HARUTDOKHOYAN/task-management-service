/* Demo data for testing. Dates are relative to today. Every demo item has "-demo-" in its id.
   npm run seed:demo   replace all data in the demo database (name must end with "-demo")
   npm run mock:add    add demo items to your real database, next to your own data
   npm run mock:remove remove only the demo items from your real database */
import { MongoClient } from "mongodb";
import { addDays, iso, startOfDay } from "../src/domain/dates";
import type { FreeTask, Project, Routine, Task } from "../src/domain/types";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "";
if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
const mode = process.argv.includes("--remove") ? "remove" : process.argv.includes("--add") ? "add" : "replace";
// Safety: "replace" deletes all data, so it only runs on a database whose name ends with "-demo".
if (mode === "replace" && !dbName.endsWith("-demo")) {
  throw new Error(`Refusing to replace all data in "${dbName}". Use a database name that ends with "-demo", or --add.`);
}
const DEMO_ID = /^[ptfr]-demo-/;

const today = startOfDay(new Date());
const day = (n: number) => iso(addDays(today, n));
const stamp = (n: number, hour = 10) => {
  const d = addDays(today, n);
  d.setHours(hour);
  return d.toISOString();
};

const projects: Project[] = [
  { id: "p-demo-web", name: "Website redesign", color: "#1868DB", deadline: day(4), note: "Reproduce the login bug in Safari, then fix the token check." },
  { id: "p-demo-app", name: "Mobile app MVP", color: "#964AC0", deadline: day(9), note: "Finish screen 3 of onboarding, the permissions screen." },
  { id: "p-demo-report", name: "Marketing report", color: "#227D9B", deadline: day(6), note: "" },
  { id: "p-demo-handbook", name: "Team handbook", color: "#BD5B00", deadline: day(20), note: "" },
].map((p, i) => ({ ...p, createdAt: stamp(-30 + i), updatedAt: stamp(-1) }));

type Seed = Pick<Task, "projectId" | "name"> & Partial<Task>;
const seeds: Seed[] = [
  // Website redesign: overdue, today, tomorrow (High), plus Medium, Low, done and archived
  { projectId: "p-demo-web", name: "Fix login error", date: day(-1), time: "17:00" },
  { projectId: "p-demo-web", name: "Send homepage draft to client", date: day(0), time: "14:00" },
  { projectId: "p-demo-web", name: "Test contact form on mobile", date: day(1), time: "10:00" },
  { projectId: "p-demo-web", name: "Write About page text", date: day(2) },
  { projectId: "p-demo-web", name: "Check page speed", date: day(3), time: "11:00" },
  { projectId: "p-demo-web", name: "Update footer links" },
  { projectId: "p-demo-web", name: "Pick new fonts", done: true, doneAt: stamp(-2) },
  { projectId: "p-demo-web", name: "Collect old page texts", done: true, doneAt: stamp(-1) },
  { projectId: "p-demo-web", name: "Make site map", done: true, doneAt: stamp(-8), archivedAt: stamp(-6) },
  { projectId: "p-demo-web", name: "Kick-off call with client", done: true, doneAt: stamp(-14), archivedAt: stamp(-12) },
  // Mobile app MVP
  { projectId: "p-demo-app", name: "Finish onboarding screens", date: day(0), time: "18:00" },
  { projectId: "p-demo-app", name: "Write API notes for backend", date: day(1) },
  { projectId: "p-demo-app", name: "Design settings page", date: day(2) },
  { projectId: "p-demo-app", name: "Set up push notifications", date: day(7) },
  { projectId: "p-demo-app", name: "App store screenshots", pinned: true },
  { projectId: "p-demo-app", name: "Choose app icon", done: true, doneAt: stamp(-3), archivedAt: stamp(-1) },
  // Marketing report
  { projectId: "p-demo-report", name: "Collect last month numbers", date: day(1), time: "12:00" },
  { projectId: "p-demo-report", name: "Make charts for the report", date: day(3) },
  { projectId: "p-demo-report", name: "Write summary" },
  { projectId: "p-demo-report", name: "Ask sales for data", done: true, doneAt: stamp(-4) },
  // Team handbook: nothing urgent
  { projectId: "p-demo-handbook", name: "Outline the chapters", date: day(12) },
  { projectId: "p-demo-handbook", name: "Write holiday rules", date: day(16) },
];
const tasks: Task[] = seeds.map((s, i) => ({
  id: `t-demo-${i + 1}`,
  date: null,
  time: null,
  pinned: false,
  done: false,
  doneAt: null,
  archivedAt: null,
  createdAt: stamp(-20 + (i % 10)),
  updatedAt: stamp(-1),
  ...s,
}));

const freeTasks: FreeTask[] = [
  { name: "Clean up the Downloads folder", added: -21 },
  { name: "Fix the bike light", added: -10 },
  { name: "Call the dentist", added: -5 },
  { name: "Sort summer photos", added: -1 },
  { name: "Water the plants", added: 0 },
  { name: "Return the library book", added: -3, done: true },
].map(({ name, added, done = false }, i) => ({
  id: `f-demo-${i + 1}`,
  name,
  done,
  doneAt: done ? stamp(-1) : null,
  createdAt: stamp(added, 9),
  updatedAt: stamp(added, 9),
}));

const routines: Routine[] = [
  { projectId: "p-demo-web", name: "Check Bugsnag for new bugs", done: true },
  { projectId: "p-demo-web", name: "Read client emails" },
  { projectId: "p-demo-app", name: "Check crash reports in TestFlight" },
  { projectId: "p-demo-app", name: "Answer team chat", done: true },
  { projectId: "p-demo-report", name: "Find new articles for the report" },
  { projectId: "p-demo-handbook", name: "Note one new idea for the handbook" },
].map(({ projectId, name, done = false }, i) => ({
  id: `r-demo-${i + 1}`,
  projectId,
  name,
  doneOn: done ? day(0) : day(-1),
  createdAt: stamp(-15 + i),
  updatedAt: stamp(-1),
}));

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const withId = <T extends { id: string }>(list: T[]) => list.map((x) => ({ _id: x.id, ...x }));
const sets = [["projects", projects], ["tasks", tasks], ["freeTasks", freeTasks], ["routines", routines]] as const;
let removed = 0;
for (const [name, docs] of sets) {
  const col = db.collection<{ _id: string }>(name);
  if (mode === "replace") await col.deleteMany({});
  else removed += (await col.deleteMany({ _id: DEMO_ID })).deletedCount; // only demo items, never your own
  if (mode !== "remove") await col.insertMany(withId<{ id: string }>(docs));
}
await client.close();
console.log(
  mode === "remove"
    ? `Removed ${removed} demo items from "${dbName}". Your own data was not touched.`
    : `Demo data ${mode === "add" ? "added to" : "ready in"} "${dbName}": ${projects.length} projects, ${tasks.length} tasks, ${freeTasks.length} free time tasks, ${routines.length} daily jobs.`,
);
