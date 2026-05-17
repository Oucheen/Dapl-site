"use client";

import { useState } from "react";

export function PasswordField() {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        id="password"
        name="password"
        type={isVisible ? "text" : "password"}
        required
        autoComplete="current-password"
        className="w-full rounded-xl border border-border bg-white py-3 pl-4 pr-12 text-sm text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
      />
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
      >
        {isVisible ? (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
            <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5 0 8.5 3.2 10 8a13.4 13.4 0 0 1-2.4 4.1" />
            <path d="M6.2 6.2A13.4 13.4 0 0 0 2 12c1.5 4.8 5 8 10 8a10.8 10.8 0 0 0 4.4-.9" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
