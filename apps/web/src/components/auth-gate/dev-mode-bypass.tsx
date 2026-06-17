import { useEffect, useState, type ReactNode } from "react";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { setAccessTokenGetter } from "../../lib/api";

interface DevModeBannerProps {
  userEmail: string;
}

function DevModeBanner({ userEmail }: DevModeBannerProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] bg-yellow-600 px-4 py-2 text-center font-bold text-white">
      <div className="flex items-center justify-center gap-2">
        <MaterialIcon name="warning" filled />
        <span>DEV MODE - Test User: {userEmail}</span>
        <MaterialIcon name="warning" filled />
      </div>
    </div>
  );
}

interface AuthPanelProps {
  title: string;
  description: string;
  children?: ReactNode;
}

function AuthPanel({ title, description, children }: AuthPanelProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-on-background">
      <section className="panel w-full max-w-md p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
          <MaterialIcon name="lock" filled />
        </div>
        <h1 className="font-headline-md text-headline-md font-bold">{title}</h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
          {description}
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}

interface DevModeAuthBypassProps {
  userEmail: string;
  children: ReactNode;
}

export function DevModeAuthBypass({ userEmail, children }: DevModeAuthBypassProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set up mock token getter for API client
    // Backend doesn't validate this token in dev mode, but we need something
    setAccessTokenGetter(() => Promise.resolve("dev-mode-bypass-token"));
    setIsReady(true);

    // Log prominent warning in console
    console.log(
      "%c⚠️ DEV MODE AUTHENTICATION BYPASS ENABLED",
      "color: orange; font-size: 20px; font-weight: bold; padding: 10px;"
    );
    console.log(
      "%cUsing test user: " + userEmail,
      "color: orange; font-size: 14px; font-weight: bold;"
    );
    console.log(
      "%cAuth0 is BYPASSED. This should NEVER happen in production.",
      "color: orange; font-size: 14px; font-weight: bold;"
    );
    console.log(
      "%cAll data is isolated to this test user email.",
      "color: orange; font-size: 12px;"
    );

    return () => {
      setAccessTokenGetter(undefined);
      setIsReady(false);
    };
  }, [userEmail]);

  useEffect(() => {
    // Add CSS custom property to adjust app layout for dev banner
    document.documentElement.style.setProperty("--dev-banner-height", "48px");
    return () => {
      document.documentElement.style.removeProperty("--dev-banner-height");
    };
  }, []);

  if (!isReady) {
    return (
      <AuthPanel title="Dev Mode" description="Initializing dev mode session..." />
    );
  }

  return (
    <>
      <DevModeBanner userEmail={userEmail} />
      {children}
    </>
  );
}
