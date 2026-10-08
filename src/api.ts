import type { Project, Task } from "./domain/types";

async function call(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed: ${res.status}`);
  return res;
}
const put = (url: string, body: unknown) => call(url, { method: "PUT", body: JSON.stringify(body) });
const del = (url: string) => call(url, { method: "DELETE" });
const enc = encodeURIComponent;

export const api = {
  load: async () => (await call("/api/data")).json() as Promise<{ projects: Project[]; tasks: Task[] }>,
  saveProject: (p: Project) => put(`/api/projects/${enc(p.id)}`, p),
  saveTask: (t: Task) => put(`/api/tasks/${enc(t.id)}`, t),
  deleteProject: (id: string) => del(`/api/projects/${enc(id)}`),
  deleteTask: (id: string) => del(`/api/tasks/${enc(id)}`),
};
