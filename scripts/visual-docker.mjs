import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { resolvePlaywrightImage } from "./playwright-image.mjs";

function fail(message) {
  throw new Error(message);
}

function ensureDockerAvailable() {
  try {
    const result = spawnSync("docker", ["info"], {
      stdio: "ignore",
    });
    if (result.status !== 0) {
      fail(
        "Visual tests require Docker. Start Docker Desktop and rerun yarn test:visual.",
      );
    }
  } catch {
    fail(
      "Visual tests require Docker. Start Docker Desktop and rerun yarn test:visual.",
    );
  }
}

const updateSnapshots = process.env.UPDATE_SNAPSHOTS === "1";
const repoRoot = process.cwd();
const image = await resolvePlaywrightImage();

ensureDockerAvailable();

const uid = typeof process.getuid === "function" ? process.getuid() : 0;
const gid = typeof process.getgid === "function" ? process.getgid() : 0;
const command = updateSnapshots ? "test:visual:update:ci" : "test:visual:ci";

const dockerArgs = [
  "run",
  "--rm",
  "--init",
  "--shm-size=1gb",
  "--workdir",
  "/work",
  "--user",
  `${uid}:${gid}`,
  "-e",
  "CI=1",
  "-e",
  "HOME=/tmp/storybook-home",
  "-e",
  `UPDATE_SNAPSHOTS=${updateSnapshots ? "1" : "0"}`,
  "-v",
  `${repoRoot}:/work`,
  image,
  "bash",
  "-lc",
  `corepack yarn install --immutable && corepack yarn ${command}`,
];

const child = spawn("docker", dockerArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    HOME: "/tmp/storybook-home",
  },
});

const exitCode = await new Promise((resolve) => {
  child.on("exit", (code) => resolve(code ?? 1));
});

process.exit(exitCode);
