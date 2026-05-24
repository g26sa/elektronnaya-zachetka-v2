"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { logoCacheKeyFromUrl } from "@/lib/institution-logo-display";

interface LogoContextValue {
  logoUrl: string | null;
  logoCacheKey: number;
  setLogo: (url: string | null, cacheKey?: number) => void;
  /** @deprecated используйте setLogo */
  setLogoUrl: (url: string | null) => void;
}

const LogoContext = createContext<LogoContextValue>({
  logoUrl: null,
  logoCacheKey: 0,
  setLogo: () => {},
  setLogoUrl: () => {},
});

export function LogoProvider({
  children,
  initialLogoUrl,
}: {
  children: ReactNode;
  initialLogoUrl?: string | null;
}) {
  const [logoUrl, setLogoUrlState] = useState<string | null>(initialLogoUrl ?? null);
  const [logoCacheKey, setLogoCacheKey] = useState(() => logoCacheKeyFromUrl(initialLogoUrl));

  const setLogo = useCallback((url: string | null, cacheKey?: number) => {
    setLogoUrlState(url);
    setLogoCacheKey(cacheKey ?? logoCacheKeyFromUrl(url));
  }, []);

  const setLogoUrl = useCallback((url: string | null) => {
    setLogo(url);
  }, [setLogo]);

  return (
    <LogoContext.Provider value={{ logoUrl, logoCacheKey, setLogo, setLogoUrl }}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogo() {
  return useContext(LogoContext);
}
