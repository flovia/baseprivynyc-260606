import { createConnection } from "node:net";

type Service = {
  name: string;
  command: string[];
  healthUrl?: string;
  env?: Record<string, string>;
};

export {};

const services: Service[] = [
  { name: "api", command: ["bun", "run", "dev:api"], healthUrl: "http://localhost:8787/health" },
  { name: "merchant", command: ["bun", "run", "dev:merchant"], healthUrl: "http://localhost:8790/health" },
  { name: "web", command: ["bun", "run", "dev:web"], healthUrl: "http://localhost:3000" },
];

const e2eServices: Service[] = [
  {
    name: "api",
    command: ["bun", "run", "apps/api/src/index.ts"],
    healthUrl: "http://localhost:18877/health",
    env: { PORT: "18877" },
  },
  {
    name: "merchant",
    command: ["bun", "run", "apps/merchant-api/src/index.ts"],
    healthUrl: "http://localhost:18890/health",
    env: { PORT: "18890", FLOVIA_API_URL: "http://localhost:18877" },
  },
];

const mode = process.argv[2] ?? "dev";
const agentArgs = process.argv.slice(3);
const spawned: Bun.Subprocess[] = [];

function prefixOutput(name: string, stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return;

  void (async () => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let pending = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) console.log(`[${name}] ${line}`);
      }
    }

    if (pending.trim()) console.log(`[${name}] ${pending}`);
  })();
}

function startService(service: Service) {
  const child = Bun.spawn(service.command, {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...service.env },
  });
  spawned.push(child);
  prefixOutput(service.name, child.stdout);
  prefixOutput(service.name, child.stderr);
  return child;
}

async function waitForHealth(service: Service) {
  if (!service.healthUrl) return;

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(service.healthUrl);
      if (response.ok) return;
    } catch {
      // Service is still booting.
    }
    await Bun.sleep(300);
  }

  throw new Error(`${service.name} did not become healthy at ${service.healthUrl}`);
}

function isPortInUse(healthUrl: string) {
  const url = new URL(healthUrl);
  if (!url.port) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: url.hostname, port: Number(url.port) });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function checkPorts(servicesToCheck: Service[]) {
  for (const service of servicesToCheck) {
    if (!service.healthUrl) continue;

    if (await isPortInUse(service.healthUrl)) {
      throw new Error(
        `${service.name} port is already in use at ${service.healthUrl}. Stop the existing process or choose another port.`,
      );
    }
  }
}

function stopServices() {
  for (const child of spawned) {
    child.kill();
  }
}

process.on("SIGINT", () => {
  stopServices();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopServices();
  process.exit(143);
});

if (mode === "e2e") {
  await checkPorts(e2eServices);
  e2eServices.forEach(startService);
  await Promise.all(e2eServices.map(waitForHealth));

  const agent = Bun.spawn(["bun", "run", "dev:agent", "--", ...agentArgs], {
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      MERCHANT_API_URL: "http://localhost:18890",
      FLOVIA_API_URL: "http://localhost:18877",
    },
  });
  const exitCode = await agent.exited;
  stopServices();
  process.exit(exitCode);
}

await checkPorts(services);
services.forEach(startService);
await new Promise(() => undefined);
