import { logger } from "./logger.js";

interface DevModeConfig {
  enabled: boolean;
  userEmail: string;
  warnings: string[];
}

/**
 * Check if the DATABASE_URL points to a local database.
 * Returns true for localhost, 127.0.0.1, or docker container patterns.
 */
function isLocalDatabase(url: string): boolean {
  if (!url) return false;

  const lower = url.toLowerCase();
  return (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("postgres:5432") || // Docker compose service name
    lower.includes("@db:") || // Alternative docker pattern
    lower.includes("host.docker.internal") // Docker for Mac/Windows
  );
}

/**
 * Get dev mode configuration from environment variables.
 * Only enables dev mode if DEV_MODE_BYPASS_AUTH is exactly "true".
 */
function getDevModeConfig(): DevModeConfig {
  const warnings: string[] = [];

  // Only enable if explicitly set to "true" (string)
  const enabled = process.env.DEV_MODE_BYPASS_AUTH === "true";

  // Default to dev@local.test if not specified
  const userEmail = process.env.DEV_MODE_USER_EMAIL?.trim() || "dev@local.test";

  // Validate email format (basic check)
  if (enabled && !userEmail.includes("@")) {
    warnings.push(`DEV_MODE_USER_EMAIL is not a valid email: ${userEmail}`);
  }

  // Warn if email doesn't look like a test email
  if (enabled && !userEmail.includes("local") && !userEmail.includes("test") && !userEmail.includes("dev")) {
    warnings.push(`DEV_MODE_USER_EMAIL doesn't look like a test email: ${userEmail}`);
  }

  return {
    enabled,
    userEmail,
    warnings
  };
}

// Cache the config at module load time
const devModeConfig: DevModeConfig = getDevModeConfig();

/**
 * Validate dev mode configuration on server startup.
 * Exits the process if dev mode is enabled in an unsafe environment.
 */
export function validateDevModeOnStartup(): void {
  if (!devModeConfig.enabled) {
    return; // Dev mode not enabled, nothing to validate
  }

  // Log any warnings
  if (devModeConfig.warnings.length > 0) {
    devModeConfig.warnings.forEach((warning) => {
      logger.warn("dev_mode_validation_warning", { warning });
    });
  }

  // CRITICAL: Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || "";
  if (!isLocalDatabase(dbUrl)) {
    logger.error("dev_mode_production_database_detected", {
      dbUrlPrefix: dbUrl.substring(0, 30) + "..."
    });
    console.error("\n" + "=".repeat(60));
    console.error("❌ CRITICAL ERROR: DEV MODE WITH PRODUCTION DATABASE");
    console.error("=".repeat(60));
    console.error("DEV_MODE_BYPASS_AUTH=true but DATABASE_URL is not local!");
    console.error("This would allow UNAUTHENTICATED access to production data.");
    console.error("");
    console.error("To fix:");
    console.error("  1. Set DEV_MODE_BYPASS_AUTH=false, OR");
    console.error("  2. Use a local database (localhost/docker)");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }

  // CRITICAL: Check NODE_ENV
  if (process.env.NODE_ENV === "production") {
    logger.error("dev_mode_production_env_detected");
    console.error("\n" + "=".repeat(60));
    console.error("❌ CRITICAL ERROR: DEV MODE IN PRODUCTION ENVIRONMENT");
    console.error("=".repeat(60));
    console.error("DEV_MODE_BYPASS_AUTH=true with NODE_ENV=production!");
    console.error("This would DISABLE authentication in production.");
    console.error("");
    console.error("To fix:");
    console.error("  Set DEV_MODE_BYPASS_AUTH=false immediately");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }

  // SUCCESS - Log prominent warning
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  DEV MODE AUTHENTICATION BYPASS ENABLED");
  console.log("=".repeat(60));
  console.log(`Test user: ${devModeConfig.userEmail}`);
  console.log("Auth0 authentication is DISABLED");
  console.log("This should ONLY be used in local development");
  console.log("=".repeat(60) + "\n");

  logger.warn("dev_mode_enabled", { userEmail: devModeConfig.userEmail });
}

/**
 * Check if dev mode is currently enabled.
 */
export function isDevModeEnabled(): boolean {
  return devModeConfig.enabled;
}

/**
 * Get the dev mode user email.
 */
export function getDevModeUserEmail(): string {
  return devModeConfig.userEmail;
}
