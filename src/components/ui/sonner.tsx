"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// Light-first toaster wired to the app tokens. (next-themes integration lands
// with dark mode in Phase 6.)
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "rounded-lg border border-line shadow-md",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
