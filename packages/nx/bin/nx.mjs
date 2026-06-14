#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const root = process.cwd();
const projectFiles = ["apps/api/project.json", "apps/web/project.json", ...fs.readdirSync("packages", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `packages/${d.name}/project.json`).filter((p) => fs.existsSync(p))];
const projects = new Map(projectFiles.map((file) => { const json = JSON.parse(fs.readFileSync(file, "utf8")); return [json.name, { ...json, root: path.dirname(file) }]; }));
const done = new Set();

function runCommand(command) {
  const result = spawnSync(command, { shell: true, stdio: "inherit", cwd: root, env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runTarget(name, target) {
  const project = projects.get(name);
  if (!project) throw new Error(`Unknown Nx project: ${name}`);
  const key = `${name}:${target}`;
  if (done.has(key)) return;
  if (target === "build" || target === "typecheck" || target === "test") for (const dep of project.implicitDependencies ?? []) runTarget(dep, "build");
  const config = project.targets?.[target];
  if (!config) return;
  console.log(`\n> nx run ${name}:${target}`);
  runCommand(config.options.command);
  done.add(key);
}

function parseOption(prefix) {
  const arg = args.find((item) => item.startsWith(prefix));
  return arg?.slice(prefix.length);
}

try {
  if (args[0] === "build" || args[0] === "dev") {
    runTarget(args[1], args[0]);
  } else if (args[0] === "run-many") {
    const target = parseOption("-t=") ?? args[args.indexOf("-t") + 1];
    const selected = args.includes("--all") ? [...projects.keys()].filter((name) => name !== "nx") : (parseOption("--projects=") ?? "").split(",").filter(Boolean);
    if (target === "dev") {
      const commands = selected.flatMap((name) => {
        const project = projects.get(name);
        if (!project) throw new Error(`Unknown Nx project: ${name}`);
        const command = project.targets?.[target]?.options.command;
        return command ? [command] : [];
      });
      if (commands.length === 0) process.exit(0);
      const quotedCommands = commands.map((command) => JSON.stringify(command)).join(" ");
      runCommand(`concurrently ${quotedCommands}`);
      process.exit(0);
    }
    for (const name of selected) runTarget(name, target);
  } else {
    throw new Error(`Unsupported local Nx command: ${args.join(" ")}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
