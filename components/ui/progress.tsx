"use client";
import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
export function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      value={value ?? null}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-primary transition-all motion-reduce:transition-none",
          value == null && "w-1/3 motion-safe:animate-pulse",
        )}
        style={
          value == null
            ? undefined
            : { width: `${Math.min(100, Math.max(0, value))}%` }
        }
      />
    </ProgressPrimitive.Root>
  );
}
