/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup.
 * Fails immediately with clear error messages if configuration is invalid.
 */

interface ValidationError {
  variable: string;
  issue: string;
}

const REQUIRED_VARIABLES = [
  "DATABASE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "ALLOWED_EMAIL",
  "CHROME_EXTENSION_ORIGIN",
] as const;

const OPTIONAL_VARIABLES = [
  "PORT",
  "FRONTEND_ORIGIN",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REDIRECT_URI",
  "GMAIL_TOKEN_ENCRYPTION_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET_TOKEN",
  "TELEGRAM_BACKEND_WEBHOOK_URL",
  "TELEGRAM_ALLOWED_USER_IDS",
  "TELEGRAM_ALLOWED_CHAT_IDS",
  "OPPORTUNITY_WEBHOOK_SECRET",
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
] as const;

/**
 * Validate DATABASE_URL format and detect common mistakes
 */
function validateDatabaseUrl(url: string): ValidationError | null {
  if (!url) {
    return { variable: "DATABASE_URL", issue: "Empty or undefined" };
  }

  // Check for common typo: aws.neo.tech instead of aws.neon.tech
  if (url.includes("aws.neo.tech")) {
    return {
      variable: "DATABASE_URL",
      issue: 'Invalid hostname "aws.neo.tech" - should be "aws.neon.tech"',
    };
  }

  // Validate postgres URL format
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    return {
      variable: "DATABASE_URL",
      issue: "Must start with postgres:// or postgresql://",
    };
  }

  // Check for basic URL structure
  try {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      return { variable: "DATABASE_URL", issue: "Missing hostname" };
    }
    if (!parsed.pathname || parsed.pathname === "/") {
      return { variable: "DATABASE_URL", issue: "Missing database name in path" };
    }
  } catch (error) {
    return { variable: "DATABASE_URL", issue: "Malformed URL" };
  }

  return null;
}

/**
 * Validate Auth0 domain format
 */
function validateAuth0Domain(domain: string): ValidationError | null {
  if (!domain) {
    return { variable: "AUTH0_DOMAIN", issue: "Empty or undefined" };
  }

  // Should be a domain without protocol
  if (domain.includes("://")) {
    return {
      variable: "AUTH0_DOMAIN",
      issue: "Should not include protocol (http:// or https://)",
    };
  }

  // Should end with auth0.com or be a custom domain
  if (!domain.includes(".")) {
    return { variable: "AUTH0_DOMAIN", issue: "Invalid domain format" };
  }

  return null;
}

/**
 * Validate Auth0 audience format
 */
function validateAuth0Audience(audience: string): ValidationError | null {
  if (!audience) {
    return { variable: "AUTH0_AUDIENCE", issue: "Empty or undefined" };
  }

  // Should be a URL or identifier
  if (!audience.includes("://") && !audience.includes(".")) {
    return {
      variable: "AUTH0_AUDIENCE",
      issue: "Should be a URL or valid identifier",
    };
  }

  return null;
}

/**
 * Validate email format
 */
function validateEmail(email: string): ValidationError | null {
  if (!email) {
    return { variable: "ALLOWED_EMAIL", issue: "Empty or undefined" };
  }

  // Basic email validation
  if (!email.includes("@") || !email.includes(".")) {
    return { variable: "ALLOWED_EMAIL", issue: "Invalid email format" };
  }

  return null;
}

/**
 * Validate Chrome extension origin
 */
function validateChromeExtensionOrigin(origin: string): ValidationError | null {
  if (!origin) {
    return { variable: "CHROME_EXTENSION_ORIGIN", issue: "Empty or undefined" };
  }

  if (!origin.startsWith("chrome-extension://")) {
    return {
      variable: "CHROME_EXTENSION_ORIGIN",
      issue: "Must start with chrome-extension://",
    };
  }

  return null;
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): void {
  // Skip validation in CI/test environments (for smoke tests)
  const isCI = process.env.CI === "true" || process.env.NODE_ENV === "test";
  if (isCI) {
    console.log("⏭️  Skipping environment validation (CI/test mode)");
    return;
  }

  console.log("DEBUG: Starting environment validation");
  console.log("DEBUG: Required variables check:");
  for (const variable of REQUIRED_VARIABLES) {
    const exists = !!process.env[variable];
    const length = process.env[variable]?.length || 0;
    console.log(`DEBUG:   ${variable}: exists=${exists}, length=${length}`);
  }

  const errors: ValidationError[] = [];

  // Check required variables exist
  for (const variable of REQUIRED_VARIABLES) {
    const value = process.env[variable];
    if (!value) {
      errors.push({
        variable,
        issue: "Required variable is missing",
      });
    }
  }

  // If any required variables are missing, fail immediately
  if (errors.length > 0) {
    console.error("\n❌ ENVIRONMENT VALIDATION FAILED\n");
    console.error("Missing required environment variables:\n");
    for (const error of errors) {
      console.error(`  • ${error.variable}: ${error.issue}`);
    }
    console.error("\nPlease check your environment configuration.\n");
    process.exit(1);
  }

  // Validate format of existing variables
  const databaseError = validateDatabaseUrl(process.env.DATABASE_URL!);
  if (databaseError) errors.push(databaseError);

  const auth0DomainError = validateAuth0Domain(process.env.AUTH0_DOMAIN!);
  if (auth0DomainError) errors.push(auth0DomainError);

  const auth0AudienceError = validateAuth0Audience(process.env.AUTH0_AUDIENCE!);
  if (auth0AudienceError) errors.push(auth0AudienceError);

  const emailError = validateEmail(process.env.ALLOWED_EMAIL!);
  if (emailError) errors.push(emailError);

  const chromeExtensionError = validateChromeExtensionOrigin(process.env.CHROME_EXTENSION_ORIGIN!);
  if (chromeExtensionError) errors.push(chromeExtensionError);

  // If any validation errors, fail immediately
  if (errors.length > 0) {
    console.error("\n❌ ENVIRONMENT VALIDATION FAILED\n");
    console.error("Invalid environment variable configuration:\n");
    for (const error of errors) {
      console.error(`  • ${error.variable}: ${error.issue}`);
    }
    console.error("\nPlease fix your environment configuration.\n");
    process.exit(1);
  }

  // Warn if Telegram bot is enabled but authorization is not configured
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const hasUserAuth = !!process.env.TELEGRAM_ALLOWED_USER_IDS;
    const hasChatAuth = !!process.env.TELEGRAM_ALLOWED_CHAT_IDS;

    if (!hasUserAuth && !hasChatAuth) {
      console.warn("\n⚠️  WARNING: Telegram bot is enabled but authorization is not configured!");
      console.warn(
        "  • TELEGRAM_BOT_TOKEN is set, but neither TELEGRAM_ALLOWED_USER_IDS nor TELEGRAM_ALLOWED_CHAT_IDS is configured"
      );
      console.warn("  • All query requests will be denied for security");
      console.warn("  • To fix: Set TELEGRAM_ALLOWED_USER_IDS with comma-separated Telegram user IDs");
      console.warn("  • Example: TELEGRAM_ALLOWED_USER_IDS=696472003,123456789");
      console.warn("  • To find your Telegram user ID, message @userinfobot on Telegram\n");
    } else {
      const userIds = process.env.TELEGRAM_ALLOWED_USER_IDS?.split(",").filter(Boolean).length || 0;
      const chatIds = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.split(",").filter(Boolean).length || 0;
      console.log(`✅ Telegram authorization configured: ${userIds} allowed user(s), ${chatIds} allowed chat(s)`);
    }
  }

  // Success
  console.log("✅ Environment validation passed");
}

/**
 * Get sanitized environment info for diagnostics (no secrets)
 */
export function getEnvironmentDiagnostics() {
  const databaseUrl = process.env.DATABASE_URL || "";
  let databaseHost = "";
  let databaseProvider = "Unknown";

  try {
    const parsed = new URL(databaseUrl);
    databaseHost = parsed.hostname;
    if (databaseHost.includes("neon.tech")) databaseProvider = "Neon";
    else if (databaseHost.includes("amazonaws.com")) databaseProvider = "AWS RDS";
    else if (databaseHost.includes("supabase.co")) databaseProvider = "Supabase";
    else if (databaseHost === "localhost") databaseProvider = "Local PostgreSQL";
  } catch {
    // Invalid URL, leave as Unknown
  }

  return {
    database: {
      configured: !!process.env.DATABASE_URL,
      provider: databaseProvider,
    },
    auth: {
      configured: !!(process.env.AUTH0_DOMAIN && process.env.AUTH0_AUDIENCE),
    },
    chromeExtension: {
      configured: !!process.env.CHROME_EXTENSION_ORIGIN,
    },
    gmail: {
      configured: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET),
    },
    telegram: {
      configured: !!process.env.TELEGRAM_BOT_TOKEN,
    },
    ai: {
      provider: process.env.AI_PROVIDER || "not configured",
      openaiConfigured: !!process.env.OPENAI_API_KEY,
    },
    sentry: {
      configured: !!process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || "not set",
    },
  };
}
