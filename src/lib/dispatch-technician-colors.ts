export type DispatchTechnicianColor = {
  section: string;
  card: string;
  heading: string;
  muted: string;
  markerIcon: string;
  markerColor: string;
};

const COLORS: DispatchTechnicianColor[] = [
  {
    section: "border-sky-200 bg-sky-50/60",
    card: "border-sky-200 bg-sky-50",
    heading: "text-sky-950",
    muted: "text-sky-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    markerColor: "#1d4ed8",
  },
  {
    section: "border-emerald-200 bg-emerald-50/60",
    card: "border-emerald-200 bg-emerald-50",
    heading: "text-emerald-950",
    muted: "text-emerald-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
    markerColor: "#047857",
  },
  {
    section: "border-orange-200 bg-orange-50/60",
    card: "border-orange-200 bg-orange-50",
    heading: "text-orange-950",
    muted: "text-orange-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
    markerColor: "#c2410c",
  },
  {
    section: "border-purple-200 bg-purple-50/60",
    card: "border-purple-200 bg-purple-50",
    heading: "text-purple-950",
    muted: "text-purple-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png",
    markerColor: "#7e22ce",
  },
  {
    section: "border-rose-200 bg-rose-50/60",
    card: "border-rose-200 bg-rose-50",
    heading: "text-rose-950",
    muted: "text-rose-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
    markerColor: "#be123c",
  },
  {
    section: "border-amber-200 bg-amber-50/60",
    card: "border-amber-200 bg-amber-50",
    heading: "text-amber-950",
    muted: "text-amber-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
    markerColor: "#a16207",
  },
  {
    section: "border-cyan-200 bg-cyan-50/60",
    card: "border-cyan-200 bg-cyan-50",
    heading: "text-cyan-950",
    muted: "text-cyan-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png",
    markerColor: "#0e7490",
  },
  {
    section: "border-pink-200 bg-pink-50/60",
    card: "border-pink-200 bg-pink-50",
    heading: "text-pink-950",
    muted: "text-pink-700",
    markerIcon: "https://maps.google.com/mapfiles/ms/icons/pink-dot.png",
    markerColor: "#be185d",
  },
];

export function getDispatchTechnicianColor(technician: string, technicians: string[]) {
  const sortedTechnicians = Array.from(new Set(technicians.filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const index = Math.max(0, sortedTechnicians.indexOf(technician));

  return COLORS[index % COLORS.length];
}
