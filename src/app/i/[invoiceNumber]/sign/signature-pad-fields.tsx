"use client";

import { useEffect, useRef, useState } from "react";

type SignaturePadFieldsProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultSignerName: string;
  invoiceNumber: string;
  accessCode: string;
};

export function SignaturePadFields({
  action,
  defaultSignerName,
  invoiceNumber,
  accessCode,
}: SignaturePadFieldsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context?.scale(ratio, ratio);

    if (context) {
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.4;
      context.strokeStyle = "#0b1d3a";
    }
  }, []);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const point = getPoint(event);
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    setError("");
    setIsDrawing(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) {
      return;
    }

    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return;
    }

    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignature(true);
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    setIsDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError("");
  }

  function prepareSubmit(event: React.FormEvent<HTMLFormElement>) {
    const canvas = canvasRef.current;

    if (!canvas || !hasSignature) {
      event.preventDefault();
      setError("Please add the customer signature before saving.");
      return;
    }

    const form = event.currentTarget;
    const signatureInput = form.elements.namedItem("signatureDataUrl") as HTMLInputElement | null;

    if (signatureInput) {
      signatureInput.value = canvas.toDataURL("image/png");
    }
  }

  return (
    <form action={action} onSubmit={prepareSubmit} className="grid gap-5">
      <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
      <input type="hidden" name="accessCode" value={accessCode} />
      <input type="hidden" name="signatureDataUrl" />
      <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        Customer name
        <input
          type="text"
          name="signerName"
          defaultValue={defaultSignerName}
          required
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold normal-case tracking-normal text-slate-950 outline-none ring-primary/30 focus:border-primary focus:ring-2"
        />
      </label>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Customer signature
          </p>
          <button
            type="button"
            onClick={clearSignature}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-primary transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="mt-2 h-44 w-full touch-none rounded-2xl border border-slate-300 bg-white"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Sign inside the box with a finger or mouse.
        </p>
        {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
      </div>

      <label className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
        <input
          type="checkbox"
          name="acceptedTerms"
          value="yes"
          required
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span>
          I confirm the invoice, service details, and terms were reviewed, and I accept this
          electronic signature.
        </span>
      </label>

      <button
        type="submit"
        className="rounded-xl bg-primary px-5 py-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
      >
        Accept and sign
      </button>
    </form>
  );
}
