import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { MongoClient, type Collection } from "mongodb";
import type { FreeTask, Project, Routine, Task } from "../src/domain/types";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "focus-list";
const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");

type Doc<T> = T & { _id: string };
const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);
const projects: Collection<Doc<Project>> = db.collection("projects");
const tasks: Collection<Doc<Task>> = db.collection("tasks");
const freeTasks: Collection<Doc<FreeTask>> = db.collection("freeTasks");
const routines: Collection<Doc<Routine>> = db.collection("routines");
await tasks.createIndex({ projectId: 1 });


const isStr = (v: unknown): v is string => typeof v === "string";
const isStrOrNull = (v: unknown) => v === null || isStr(v);

function asProject(b: Record<string, unknown>): Project | null {
  const { id, name, color, deadline, note, createdAt, updatedAt } = b;
  if (![id, name, color, deadline, note, createdAt, updatedAt].every(isStr)) return null;
  return { id, name, color, deadline, note, createdAt, updatedAt } as Project;
}
function asTask(b: Record<string, unknown>): Task | null {
  const { id, projectId, name, date, time, pinned, done, doneAt, createdAt, updatedAt } = b;
  const archivedAt = b.archivedAt ?? null; // older tasks have no archivedAt
  if (![id, projectId, name, createdAt, updatedAt].every(isStr)) return null;
  if (![date, time, doneAt, archivedAt].every(isStrOrNull)) return null;
  if (typeof pinned !== "boolean" || typeof done !== "boolean") return null;
  return { id, projectId, name, date, time, pinned, done, doneAt, archivedAt, createdAt, updatedAt } as Task;
}
function asFreeTask(b: Record<string, unknown>): FreeTask | null {
  const { id, name, done, doneAt, createdAt, updatedAt } = b;
  if (![id, name, createdAt, updatedAt].every(isStr) || !isStrOrNull(doneAt) || typeof done !== "boolean") return null;
  return { id, name, done, doneAt, createdAt, updatedAt } as FreeTask;
}
function asRoutine(b: Record<string, unknown>): Routine | null {
  const { id, projectId, name, doneOn, createdAt, updatedAt } = b;
  if (![id, projectId, name, createdAt, updatedAt].every(isStr) || !isStrOrNull(doneOn)) return null;
  return { id, projectId, name, doneOn, createdAt, updatedAt } as Routine;
}
const strip = <T>({ _id, ...rest }: Doc<T>) => rest as T;

const app = express();
app.disable("x-powered-by");

/* Health check for Docker. No password needed, shows no data. */
app.get("/api/health", (_req: Request, res: Response) => void res.json({ ok: true }));

/* Simple password (HTTP Basic Auth). On when APP_PASSWORD is set. */
const password = process.env.APP_PASSWORD ?? "";
const user = process.env.APP_USER ?? "me";
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
if (password) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString();
      const i = decoded.indexOf(":");
      if (i > 0 && same(decoded.slice(0, i), user) && same(decoded.slice(i + 1), password)) return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="Focus list", charset="UTF-8"').status(401).send("Login required.");
  });
}

app.use(express.json());

app.get("/api/data", async (_req: Request, res: Response) => {
  const [p, t, f, r] = await Promise.all([
    projects.find().sort({ createdAt: 1 }).toArray(),
    tasks.find().toArray(),
    freeTasks.find().toArray(),
    routines.find().toArray(),
  ]);
  res.json({ projects: p.map(strip), tasks: t.map(strip), freeTasks: f.map(strip), routines: r.map(strip) });
});

app.put("/api/projects/:id", async (req: Request, res: Response) => {
  const p = asProject(req.body);
  if (!p || p.id !== req.params.id) return void res.status(400).json({ error: "Invalid project" });
  await projects.replaceOne({ _id: p.id }, p, { upsert: true });
  res.json(p);
});

app.put("/api/tasks/:id", async (req: Request, res: Response) => {
  const t = asTask(req.body);
  if (!t || t.id !== req.params.id) return void res.status(400).json({ error: "Invalid task" });
  await tasks.replaceOne({ _id: t.id }, t, { upsert: true });
  res.json(t);
});

app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
  await tasks.deleteOne({ _id: String(req.params.id) });
  res.status(204).end();
});

app.put("/api/free-tasks/:id", async (req: Request, res: Response) => {
  const t = asFreeTask(req.body);
  if (!t || t.id !== req.params.id) return void res.status(400).json({ error: "Invalid free time task" });
  await freeTasks.replaceOne({ _id: t.id }, t, { upsert: true });
  res.json(t);
});

app.put("/api/routines/:id", async (req: Request, res: Response) => {
  const r = asRoutine(req.body);
  if (!r || r.id !== req.params.id) return void res.status(400).json({ error: "Invalid daily job" });
  await routines.replaceOne({ _id: r.id }, r, { upsert: true });
  res.json(r);
});

app.delete("/api/routines/:id", async (req: Request, res: Response) => {
  await routines.deleteOne({ _id: String(req.params.id) });
  res.status(204).end();
});

/* Deleting a project also deletes its tasks (archived ones too) and its daily jobs. */
app.delete("/api/projects/:id", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  await tasks.deleteMany({ projectId: id });
  await routines.deleteMany({ projectId: id });
  await projects.deleteOne({ _id: id });
  res.status(204).end();
});

/* Production: serve the built app (npm run build) from the same server. */
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const serveApp = existsSync(dist);
if (serveApp) {
  app.use(express.static(dist));
  // Any other page (for example /projects) gets index.html; React Router shows the page.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile("index.html", { root: dist });
  });
}

app.listen(port, host, () => {
  console.log(`API on http://${host}:${port} (db: ${dbName})`);
  if (serveApp) console.log(`App on http://${host === "0.0.0.0" ? "<this-computer-ip>" : host}:${port}`);
});
