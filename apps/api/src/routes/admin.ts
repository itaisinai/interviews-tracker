import { Router } from "express";
import { getEnvironmentDiagnostics } from "../config/env-validation.js";
import { requireAuth } from "../lib/auth.js";
import fs from "fs";
import path from "path";

export const adminRouter = Router();

/**
 * GET /api/admin/runtime
 *
 * Returns deployment and runtime diagnostics (no secrets exposed)
 * Requires authentication
 */
adminRouter.get("/runtime", requireAuth, async (_request, response) => {
  const cwd = process.cwd();
  const startTime = process.env.START_TIME || new Date().toISOString();

  // Get git SHA if available
  let gitSha = 'unknown';
  let gitBranch = 'unknown';
  try {
    const gitHeadPath = path.join(cwd, '.git', 'HEAD');
    if (fs.existsSync(gitHeadPath)) {
      const head = fs.readFileSync(gitHeadPath, 'utf-8').trim();
      if (head.startsWith('ref: ')) {
        gitBranch = head.replace('ref: refs/heads/', '');
        const refPath = path.join(cwd, '.git', head.slice(5));
        if (fs.existsSync(refPath)) {
          gitSha = fs.readFileSync(refPath, 'utf-8').trim().slice(0, 8);
        }
      } else {
        gitSha = head.slice(0, 8);
      }
    }
  } catch {
    // Git info not available
  }

  // Get release directory from cwd
  const cwdParts = cwd.split('/');
  const releaseDir = cwdParts[cwdParts.length - 1];

  // Check if running from "current" symlink
  let isSymlink = false;
  let symlinkTarget = null;
  try {
    const stats = fs.lstatSync(cwd);
    if (stats.isSymbolicLink()) {
      isSymlink = true;
      symlinkTarget = fs.readlinkSync(cwd);
    }
  } catch {
    // Not a symlink or error checking
  }

  const diagnostics = getEnvironmentDiagnostics();

  response.json({
    deployment: {
      release: releaseDir,
      isSymlink,
      symlinkTarget,
      cwd,
      gitSha,
      gitBranch,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    runtime: {
      startedAt: startTime,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
      },
      environment: process.env.NODE_ENV || 'development'
    },
    configuration: diagnostics
  });
});
