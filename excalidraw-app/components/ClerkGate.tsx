import { useEffect, useState } from "react";

import {
  getAllowedEmails,
  getClerk,
  getClerkPublishableKey,
  getCurrentUserEmail,
} from "../auth/clerk";

import type { PropsWithChildren } from "react";
import type { Clerk } from "@clerk/clerk-js";

type GateState =
  | { status: "loading" }
  | { status: "missing-key" }
  | { status: "signed-out"; clerk: Clerk }
  | { status: "forbidden"; clerk: Clerk; email: string | null }
  | { status: "ready" }
  | { status: "error"; message: string };

const syncGateState = async (clerk: Clerk, setState: (state: GateState) => void) => {
  const user = clerk.user;
  if (!user) {
    setState({ status: "signed-out", clerk });
    return;
  }

  const email = await getCurrentUserEmail();
  if (!email || !getAllowedEmails().has(email)) {
    setState({ status: "forbidden", clerk, email });
    return;
  }

  setState({ status: "ready" });
};

export const ClerkGate = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;

    const run = async () => {
      try {
        if (!getClerkPublishableKey()) {
          if (!disposed) {
            setState({ status: "missing-key" });
          }
          return;
        }

        const clerk = await getClerk();
        if (!clerk) {
          if (!disposed) {
            setState({ status: "missing-key" });
          }
          return;
        }

        if (!disposed) {
          await syncGateState(clerk, setState);
        }

        removeListener = clerk.addListener(async () => {
          if (disposed) {
            return;
          }
          await syncGateState(clerk, setState);
        });
      } catch (error) {
        console.error(error);
        if (!disposed) {
          setState({ status: "error", message: "Failed to initialize login" });
        }
      }
    };

    void run();

    return () => {
      disposed = true;
      removeListener?.();
    };
  }, []);

  if (state.status === "ready") {
    return <>{children}</>;
  }

  if (state.status === "loading") {
    return <div style={{ padding: 24 }}>Checking session...</div>;
  }

  if (state.status === "missing-key") {
    return (
      <div style={{ padding: 24 }}>
        Missing Clerk publishable key. Set `VITE_CLERK_PUBLISHABLE_KEY`.
      </div>
    );
  }

  if (state.status === "error") {
    return <div style={{ padding: 24 }}>{state.message}</div>;
  }

  if (state.status === "forbidden") {
    return (
      <div style={{ padding: 24 }}>
        <p>
          Signed in as {state.email || "unknown"} but this account is not allowed
          to access this editor.
        </p>
        <button type="button" onClick={() => void state.clerk.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <p>Sign in to continue.</p>
      <button type="button" onClick={() => state.clerk.openSignIn()}>
        Sign in with Clerk
      </button>
    </div>
  );
};
