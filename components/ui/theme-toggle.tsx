"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/ui/material-icons";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "pill" | "icon";
}

export function ThemeToggle({ className, variant = "pill" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const label = mounted ? `Switch to ${nextTheme} theme` : "Change color theme";

  if (variant === "icon")
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!mounted}
        aria-label={label}
        title={label}
        onClick={() => setTheme(nextTheme)}
        className={cn("shrink-0", className)}
      >
        <Sun className="hidden size-4 dark:inline-flex" />
        <Moon className="size-4 dark:hidden" />
      </Button>
    );

  return (
    <button
      type="button"
      disabled={!mounted}
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className={cn(
        "relative inline-flex h-11 w-16 shrink-0 cursor-pointer items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait",
        className,
      )}
    >
      <span className="relative flex h-8 w-full items-center rounded-full border border-zinc-200 bg-white p-[3px] dark:border-zinc-800 dark:bg-zinc-950">
        <span className="absolute left-[3px] size-6 translate-x-8 rounded-full bg-gray-200 transition-transform duration-300 motion-reduce:transition-none dark:translate-x-0 dark:bg-zinc-800" />
        <Moon
          aria-hidden="true"
          strokeWidth={1.5}
          className="relative z-10 ml-1 size-4 text-black dark:text-white"
        />
        <Sun
          aria-hidden="true"
          strokeWidth={1.5}
          className="relative z-10 ml-4 size-4 text-gray-700 dark:text-gray-500"
        />
      </span>
    </button>
  );
}
