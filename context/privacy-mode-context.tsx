"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "_privacy_mode";

type PrivacyCtx = {
  isPrivate: boolean;
  toggle:    () => void;
  mask:      (value: string | number) => string;
};

const PrivacyContext = createContext<PrivacyCtx>({
  isPrivate: false,
  toggle:    () => {},
  mask:      (v) => String(v),
});

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    setIsPrivate(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = useCallback(() => {
    setIsPrivate(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const mask = useCallback(
    (value: string | number) => (isPrivate ? "•••••" : String(value)),
    [isPrivate],
  );

  return (
    <PrivacyContext.Provider value={{ isPrivate, toggle, mask }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacyMode = () => useContext(PrivacyContext);
