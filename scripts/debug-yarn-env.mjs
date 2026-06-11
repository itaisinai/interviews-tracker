import { execFileSync } from "node:child_process";

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const output = error?.stdout?.toString?.().trim() ?? "";
    const stderr = error?.stderr?.toString?.().trim() ?? "";
    return output || stderr || `failed to run ${command} ${args.join(" ")}`;
  }
}

console.log(`node -v: ${run("node", ["-v"])}`);
console.log(`corepack --version: ${run("corepack", ["--version"])}`);
console.log(`yarn -v: ${run("yarn", ["-v"])}`);
console.log(`yarn workspaces list:\n${run("yarn", ["workspaces", "list", "--json"])}`);
