type OpenAIPixelCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    oaiq?: OpenAIPixelCommand;
  }
}

export function measureOpenAICustomerAction(eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.oaiq?.("measure", eventName, {
    type: "customer_action",
  });
}

export function measureOpenAICustomEvent(eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.oaiq?.(
    "measure",
    "custom",
    { type: "custom" },
    { custom_event_name: eventName },
  );
}
