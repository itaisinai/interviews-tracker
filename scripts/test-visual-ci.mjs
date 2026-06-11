import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const updateSnapshots = process.env.UPDATE_SNAPSHOTS === "1";
const storybookHome = "/tmp/storybook-home";
const storybookStaticDir = path.resolve("storybook-static");

await mkdir(storybookHome, { recursive: true });

function waitForServer(url, timeoutMs = 120_000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(tick, 1000);
    };

    tick();
  });
}

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function contentTypeFor(filePath) {
  return mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream";
}

function startStaticServer(rootDir) {
  if (!existsSync(rootDir)) {
    throw new Error(
      `Missing Storybook build output at ${rootDir}. Run "yarn build:storybook" first.`,
    );
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestPath = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
      const candidatePath = requestPath === "/" ? "/index.html" : requestPath;
      const filePath = path.join(rootDir, decodeURIComponent(candidatePath));

      const sendFile = (absolutePath) => {
        try {
          const stats = statSync(absolutePath);
          if (stats.isDirectory()) {
            sendFile(path.join(absolutePath, "index.html"));
            return;
          }

          res.writeHead(200, { "content-type": contentTypeFor(absolutePath) });
          createReadStream(absolutePath).pipe(res);
        } catch {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Not found");
        }
      };

      sendFile(filePath);
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start Storybook static server"));
        return;
      }

      resolve({
        close: () =>
          new Promise((closeResolve) => {
            server.close(() => closeResolve());
          }),
        port: address.port,
      });
    });
  });
}

const staticServer = await startStaticServer(storybookStaticDir);
const storybookUrl = `http://127.0.0.1:${staticServer.port}`;

await waitForServer(storybookUrl);

const playwrightArgs = [
  "playwright",
  "test",
  "-c",
  "apps/web/playwright.visual.config.ts",
];

if (updateSnapshots) {
  playwrightArgs.push("--update-snapshots");
}

const playwright = spawn("corepack", ["yarn", ...playwrightArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    STORYBOOK_URL: storybookUrl,
    HOME: storybookHome,
  },
});

const exitCode = await new Promise((resolve) => {
  playwright.on("exit", (code) => resolve(code ?? 1));
});

await staticServer.close();

process.exit(exitCode);
