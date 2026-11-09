export const widgetOpenEvent = "dapl:widget-open";

export type LocalWidgetName = "chat" | "contact";

export function announceWidgetOpened(widget: LocalWidgetName) {
  window.dispatchEvent(
    new CustomEvent(widgetOpenEvent, {
      detail: { widget },
    }),
  );
}
