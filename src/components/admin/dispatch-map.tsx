"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type DispatchMapJob = {
  id: string;
  name: string;
  address: string;
  technician: string;
  time: string;
};

type GoogleMapApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    InfoWindow: new (options?: Record<string, unknown>) => GoogleInfoWindow;
    Geocoder: new () => GoogleGeocoder;
    LatLngBounds: new () => GoogleBounds;
  };
};

type GoogleMapInstance = { fitBounds: (bounds: GoogleBounds, padding?: number) => void };
type GoogleMarker = { addListener: (event: string, callback: () => void) => void };
type GoogleInfoWindow = { open: (options: { map: GoogleMapInstance; anchor: GoogleMarker }) => void; setContent: (content: string) => void };
type GoogleGeocoder = { geocode: (request: { address: string }, callback: (results: Array<{ geometry: { location: unknown } }> | null, status: string) => void) => void };
type GoogleBounds = { extend: (location: unknown) => void; isEmpty?: () => boolean };

declare global {
  interface Window {
    google?: GoogleMapApi;
  }
}

const MAX_MARKERS = 2;

function loadGoogleMaps(apiKey: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-dapl-google-maps]");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.daplGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
}

export function DispatchMap({ jobs, apiKey }: { jobs: DispatchMapJob[]; apiKey?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const visibleJobs = useMemo(
    () => jobs.filter((job) => job.address && !job.address.toLowerCase().startsWith("address pending")).slice(0, MAX_MARKERS),
    [jobs],
  );

  useEffect(() => {
    if (!apiKey || !mapRef.current || !visibleJobs.length) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || !window.google?.maps) {
          return;
        }

        const googleMaps = window.google.maps;
        const map = new googleMaps.Map(mapRef.current, {
          center: { lat: 35.2271, lng: -80.8431 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const bounds = new googleMaps.LatLngBounds();
        const geocoder = new googleMaps.Geocoder();
        let remaining = visibleJobs.length;
        let found = 0;

        visibleJobs.forEach((job) => {
          geocoder.geocode({ address: job.address }, (results, status) => {
            if (cancelled) {
              return;
            }

            if (status === "OK" && results?.[0]) {
              const marker = new googleMaps.Marker({
                map,
                position: results[0].geometry.location,
                title: `${job.name} · ${job.technician}`,
              });
              const infoWindow = new googleMaps.InfoWindow();
              infoWindow.setContent(`<strong>${job.name}</strong><br>${job.technician}<br>${job.time}<br>${job.address}`);
              marker.addListener("click", () => infoWindow.open({ map, anchor: marker }));
              bounds.extend(results[0].geometry.location);
              found += 1;
            }

            remaining -= 1;

            if (!remaining && found) {
              map.fitBounds(bounds, 48);
            }
          });
        });
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Google Maps could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, visibleJobs]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-6 text-sm font-bold text-muted">
        To show all jobs directly on this page, add the restricted public environment variable <code className="rounded bg-white px-1.5 py-0.5 text-primary">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in Vercel. The address list and Google Maps links remain available without it.
      </div>
    );
  }

  if (!visibleJobs.length) {
    return <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-sm font-bold text-muted">There are no jobs with a usable address for this filter.</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-xl font-black text-primary">Jobs on map</h2>
          <p className="mt-1 text-xs font-bold text-muted">Showing up to {MAX_MARKERS} addresses on the current Dispatch view.</p>
        </div>
        {error ? <span className="text-xs font-bold text-accent">{error}</span> : null}
      </div>
      <div ref={mapRef} className="h-[34rem] w-full bg-slate-100" aria-label="Dispatch jobs map" />
    </div>
  );
}
