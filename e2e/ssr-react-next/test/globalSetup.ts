import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

import type { TestProject } from "vitest/node";

declare module "vitest" {
  interface ProvidedContext {
    baseUrl: string;
  }
}

const appDir = fileURLToPath(new URL("..", import.meta.url));

/** Asks the OS for a port nobody is listening on, so parallel CI jobs cannot collide. */
const freePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("could not determine a free port"));
        return;
      }
      const { port } = address;
      server.close(() => {
        resolve(port);
      });
    });
  });

const waitForServer = async (
  baseUrl: string,
  child: ChildProcess,
  log: () => string,
): Promise<void> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `next start exited with code ${String(child.exitCode)}:\n${log()}`,
      );
    }
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      // any response at all means the listener is up; the routes assert content
      if (response.status < 500) return;
    } catch {
      // connection refused while the server is still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`next start did not become ready in 60s:\n${log()}`);
};

/**
 * Boots the production Next server the whole suite runs against.
 *
 * `next start`, not `next dev`: the RSC/SSR/client split this suite exists to
 * check is the same in both, but only the production build proves the client
 * bundle that ships, and dev-mode double rendering makes hydration diagnostics
 * noisier. `next build` runs as this package's turbo `build` task, so the
 * bundle is already on disk here.
 */
export default async function setup(project: TestProject): Promise<() => void> {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${String(port)}`;

  const child = spawn(
    "next",
    ["start", "--port", String(port), "--hostname", "127.0.0.1"],
    { cwd: appDir, stdio: ["ignore", "pipe", "pipe"], shell: false },
  );

  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => (output += chunk.toString()));

  try {
    await waitForServer(baseUrl, child, () => output);
  } catch (error) {
    child.kill("SIGKILL");
    throw error;
  }

  project.provide("baseUrl", baseUrl);

  return () => {
    child.kill("SIGTERM");
  };
}
