"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type TrackedAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  gtmEvent?: Record<string, unknown>;
};

export function TrackedAnchor({
  children,
  gtmEvent,
  onClick,
  ...props
}: TrackedAnchorProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && gtmEvent) {
          sendGTMEvent(gtmEvent);
        }
      }}
    >
      {children}
    </a>
  );
}
