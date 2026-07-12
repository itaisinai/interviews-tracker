import { type ReactNode, useEffect, useState } from "react";

import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";

import { Button, MaterialIcon } from "@interviews-tracker/design-system";

import { setAccessTokenGetter } from "../../lib/api";

import { DevModeAuthBypass } from "./dev-mode-bypass";

const devModeBypassAuth = import.meta.env.VITE_DEV_MODE_BYPASS_AUTH === "true";
const devModeUserEmail = (import.meta.env.VITE_DEV_MODE_USER_EMAIL as string | undefined)?.trim() || "dev@local.test";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined;
const allowedEmail = (import.meta.env.VITE_ALLOWED_EMAIL as string | undefined)?.trim().toLowerCase();

function AuthPanel({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-on-background">
      <section className="panel w-full max-w-md p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
          <MaterialIcon name="lock" filled />
        </div>
        <h1 className="font-headline-md text-headline-md font-bold">{title}</h1>
        <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{description}</p>
        {children ? <div className="mt-6">{children}</div> : null}
      </section>
    </main>
  );
}

function AuthenticatedOnly({ children }: { children: ReactNode }) {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, user } = useAuth0();
  const [isTokenGetterReady, setIsTokenGetterReady] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const email = user?.email?.trim().toLowerCase();
  const hasAllowedEmail = Boolean(allowedEmail && email && email === allowedEmail);

  useEffect(() => {
    let cancelled = false;

    async function prepareToken() {
      if (!isAuthenticated || !hasAllowedEmail) {
        setAccessTokenGetter(undefined);
        setIsTokenGetterReady(false);
        setTokenError(null);
        return;
      }

      try {
        setIsTokenGetterReady(false);
        setTokenError(null);

        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: auth0Audience,
            scope: "openid profile email",
          },
        });

        if (!token) {
          throw new Error("Auth0 returned an empty access token");
        }

        if (cancelled) return;

        setAccessTokenGetter(() =>
          getAccessTokenSilently({
            authorizationParams: {
              audience: auth0Audience,
              scope: "openid profile email",
            },
          })
        );

        setIsTokenGetterReady(true);
      } catch (error) {
        if (cancelled) return;

        setAccessTokenGetter(undefined);
        setIsTokenGetterReady(false);

        const message = error instanceof Error ? error.message : "Failed to get Auth0 access token";
        setTokenError(message);

        if (message.includes("login_required") || message.includes("consent_required")) {
          void loginWithRedirect({
            authorizationParams: {
              audience: auth0Audience,
              scope: "openid profile email",
              connection: "google-oauth2",
            },
          });
        }
      }
    }

    void prepareToken();

    return () => {
      cancelled = true;
      setAccessTokenGetter(undefined);
      setIsTokenGetterReady(false);
    };
  }, [getAccessTokenSilently, hasAllowedEmail, isAuthenticated, loginWithRedirect]);

  if (isLoading) {
    return <AuthPanel title="Loading" description="Checking your session." />;
  }

  if (error) {
    return (
      <AuthPanel title="Login Error" description={error.message}>
        <Button
          variant="primary"
          className="w-full"
          onClick={() =>
            void loginWithRedirect({
              authorizationParams: { connection: "google-oauth2" },
            })
          }
        >
          <MaterialIcon name="login" />
          Try Again
        </Button>
      </AuthPanel>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthPanel title="Sign in" description="Use your authorized Google account to access CareerFlow.">
        <Button
          variant="primary"
          className="w-full"
          onClick={() =>
            void loginWithRedirect({
              authorizationParams: { connection: "google-oauth2" },
            })
          }
        >
          <MaterialIcon name="login" />
          Continue with Google
        </Button>
      </AuthPanel>
    );
  }

  if (!hasAllowedEmail) {
    return (
      <AuthPanel title="Access Denied" description="This Google account is not allowed to access this workspace.">
        <p className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-body-md text-body-md text-on-surface-variant">
          {user?.email ?? "No email returned by Auth0"}
        </p>
      </AuthPanel>
    );
  }

  if (tokenError) {
    return (
      <AuthPanel title="Token Error" description={tokenError}>
        <Button
          variant="primary"
          className="w-full"
          onClick={() =>
            void loginWithRedirect({
              authorizationParams: {
                audience: auth0Audience,
                scope: "openid profile email",
                connection: "google-oauth2",
              },
            })
          }
        >
          <MaterialIcon name="login" />
          Try Again
        </Button>
      </AuthPanel>
    );
  }

  if (!isTokenGetterReady) {
    return <AuthPanel title="Loading" description="Preparing your API session." />;
  }

  return <>{children}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  // Dev mode bypass - check FIRST before Auth0 validation
  if (devModeBypassAuth) {
    return <DevModeAuthBypass userEmail={devModeUserEmail}>{children}</DevModeAuthBypass>;
  }

  if (!auth0Domain || !auth0ClientId || !auth0Audience || !allowedEmail) {
    return (
      <AuthPanel
        title="Auth0 Not Configured"
        description="Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE, and VITE_ALLOWED_EMAIL to use the app."
      />
    );
  }

  return (
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      cacheLocation="localstorage"
      useRefreshTokens
      authorizationParams={{
        audience: auth0Audience,
        redirect_uri: window.location.origin,
        scope: "openid profile email",
      }}
      onRedirectCallback={(appState) => {
        window.history.replaceState({}, document.title, appState?.returnTo ?? window.location.pathname);
      }}
    >
      <AuthenticatedOnly>{children}</AuthenticatedOnly>
    </Auth0Provider>
  );
}
