"use client";

import { type ReactNode, useRef, useState } from "react";

type ScheduleDropZoneProps = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  serviceDate: string;
  serviceWindow: string;
  serviceTime: string;
  selectedDate: string;
  selectedView: string;
  technicianFilter: string;
};

export function DraggableScheduleCard({
  children,
  invoiceId,
}: {
  children: ReactNode;
  invoiceId: string;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", invoiceId);
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export function ScheduleDropZone({
  action,
  children,
  serviceDate,
  serviceWindow,
  serviceTime,
  selectedDate,
  selectedView,
  technicianFilter,
}: ScheduleDropZoneProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);

  return (
    <>
      <form ref={formRef} action={action} className="hidden">
        <input ref={invoiceInputRef} type="hidden" name="invoiceId" />
        <input type="hidden" name="selectedDate" value={selectedDate} />
        <input type="hidden" name="selectedView" value={selectedView} />
        <input type="hidden" name="technicianFilter" value={technicianFilter} />
        <input type="hidden" name="serviceDate" value={serviceDate} />
        <input type="hidden" name="serviceWindow" value={serviceWindow} />
        <input type="hidden" name="serviceTime" value={serviceTime} />
      </form>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsOver(false);

          const invoiceId = event.dataTransfer.getData("text/plain");

          if (!invoiceId || !invoiceInputRef.current || !formRef.current) {
            return;
          }

          invoiceInputRef.current.value = invoiceId;
          formRef.current.requestSubmit();
        }}
        className={`rounded-2xl transition ${isOver ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
      >
        {children}
      </div>
    </>
  );
}
