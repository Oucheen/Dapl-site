"use client";

import { useState } from "react";

const SERVICE_WINDOWS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
];

const WINDOW_RANGES = [
  { label: "8:00 AM - 10:00 AM", start: 8 * 60, end: 10 * 60 },
  { label: "10:00 AM - 12:00 PM", start: 10 * 60, end: 12 * 60 },
  { label: "12:00 PM - 2:00 PM", start: 12 * 60, end: 14 * 60 },
  { label: "2:00 PM - 4:00 PM", start: 14 * 60, end: 16 * 60 },
  { label: "4:00 PM - 6:00 PM", start: 16 * 60, end: 18 * 60 },
  { label: "6:00 PM - 8:00 PM", start: 18 * 60, end: 20 * 60 },
];

function getWindowForTime(timeValue: string) {
  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return "";
  }

  const totalMinutes = hours * 60 + minutes;
  const matchedWindow = WINDOW_RANGES.find(
    (window) => totalMinutes >= window.start && totalMinutes < window.end,
  );

  if (matchedWindow) {
    return matchedWindow.label;
  }

  if (totalMinutes < WINDOW_RANGES[0].start) {
    return WINDOW_RANGES[0].label;
  }

  return WINDOW_RANGES[WINDOW_RANGES.length - 1].label;
}

export function ManualScheduleFields() {
  const [serviceTime, setServiceTime] = useState("");
  const [serviceWindow, setServiceWindow] = useState("");

  return (
    <>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Service time optional
        <input
          type="time"
          name="serviceTime"
          value={serviceTime}
          onChange={(event) => {
            const nextTime = event.target.value;
            setServiceTime(nextTime);
            setServiceWindow(nextTime ? getWindowForTime(nextTime) : "");
          }}
          className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
        />
      </label>
      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
        Time window optional
        <select
          name="serviceWindow"
          value={serviceWindow}
          onChange={(event) => setServiceWindow(event.target.value)}
          className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none ring-primary/30 transition focus:border-primary focus:ring-2"
        >
          <option value="">Select window</option>
          {SERVICE_WINDOWS.map((window) => (
            <option key={window} value={window}>
              {window}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
