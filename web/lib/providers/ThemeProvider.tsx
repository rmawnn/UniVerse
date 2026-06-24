"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/stores/theme-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    const stored = localStorage.getItem("uv_theme");
    const theme = stored === "light" ? "light" : "dark";
    setTheme(theme);
  }, [setTheme]);

  return <>{children}</>;
}
