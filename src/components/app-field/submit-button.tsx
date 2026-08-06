"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type AppSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
};

export function AppSubmitButton({
  children,
  className = "",
  disabled,
  pendingText = "Working...",
  type = "submit",
  ...props
}: AppSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-65`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{pendingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
