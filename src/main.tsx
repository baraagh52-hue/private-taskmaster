import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import Settings from "@/pages/Settings.tsx";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, useState, Component } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";

// Add: Simple top-level error boundary to avoid blank screen on runtime errors
class RootErrorBoundary extends Component<
  { children: any },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full space-y-4 text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-sm text-neutral-400">
              The app encountered a runtime error and could not render the UI.
            </p>
            <pre className="text-xs text-left bg-neutral-900 border border-neutral-800 rounded p-3 overflow-auto">
              {String(this.state.error?.message || this.state.error || "Unknown error")}
            </pre>
            <p className="text-xs text-neutral-400">
              If you just installed the app, make sure your Convex backend is configured
              (VITE_CONVEX_URL) or run Convex locally in dev mode.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
})();

/* Single-user mode: no ConvexAuthProvider needed. */

function ensureStoragePolyfill() {
  try {
    // Some environments throw on access; this will verify availability
    window.localStorage?.getItem?.("__vly_test__");
  } catch {
    (window as any).localStorage = memoryStorage as any;
  }
  try {
    window.sessionStorage?.getItem?.("__vly_test__");
  } catch {
    (window as any).sessionStorage = memoryStorage as any;
  }
}
ensureStoragePolyfill();

const convexUrl = (import.meta as any).env?.VITE_CONVEX_URL;
const convex = new ConvexReactClient(convexUrl);

function ConvexWarningBanner() {
  if (convexUrl) return null;
  return (
    <div className="w-full bg-yellow-500/10 text-yellow-200 border border-yellow-500/30 px-4 py-2 text-sm">
      Convex URL missing. Set VITE_CONVEX_URL or run Convex dev. Some features may not work.
    </div>
  );
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <RouteSyncer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootProviders() {
  // Ensure the app is always wrapped with ConvexProvider so useQuery/useMutation work (no auth)
  return (
    <InstrumentationProvider>
      <ConvexWarningBanner />
      <ConvexProvider client={convex}>
        {/* Use in-memory storage to avoid localStorage in restricted environments */}
        <AppRouter />
        <Toaster />
      </ConvexProvider>
    </InstrumentationProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <VlyToolbar />
      <RootProviders />
    </RootErrorBoundary>
  </StrictMode>,
);