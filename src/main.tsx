import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import Dashboard from "@/pages/Dashboard.tsx";
import Settings from "@/pages/Settings.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import "./types/global.d.ts";

const ConvexAuthProviderAny = ConvexAuthProvider as any;

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Add an in-memory storage adapter to avoid localStorage usage
const memoryStorage = {
  getItem(key: string) {
    try {
      const store = (window as any).__VLY_MEM_STORE__ || {};
      return key in store ? store[key] : null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      const w = window as any;
      w.__VLY_MEM_STORE__ = w.__VLY_MEM_STORE__ || {};
      w.__VLY_MEM_STORE__[key] = value;
    } catch {
      // swallow
    }
  },
  removeItem(key: string) {
    try {
      const w = window as any;
      if (w.__VLY_MEM_STORE__) delete w.__VLY_MEM_STORE__[key];
    } catch {
      // swallow
    }
  },
};

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
  // Ensure the app is always wrapped with ConvexAuthProvider so useConvexAuth works
  return (
    <InstrumentationProvider>
      {/* Use memory storage to avoid localStorage in restricted environments */}
      <ConvexAuthProviderAny client={convex} storage={memoryStorage}>
        <AppRouter />
      </ConvexAuthProviderAny>
      <Toaster />
    </InstrumentationProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <RootProviders />
  </StrictMode>,
);