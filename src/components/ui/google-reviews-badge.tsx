import { Star } from "lucide-react";
import { TrackedAnchor } from "@/components/ui/tracked-anchor";
import { googleReviewCount, googleReviewRating, googleReviewsUrl } from "@/content/google-profile";

function GoogleWordmark() {
  return (
    <span className="font-black leading-none" aria-label="Google">
      <span className="text-[#4285f4]">G</span>
      <span className="text-[#ea4335]">o</span>
      <span className="text-[#fbbc05]">o</span>
      <span className="text-[#4285f4]">g</span>
      <span className="text-[#34a853]">l</span>
      <span className="text-[#ea4335]">e</span>
    </span>
  );
}

export function GoogleReviewsBadge({
  className = "",
  location,
}: {
  className?: string;
  location: string;
}) {
  return (
    <TrackedAnchor
      href={googleReviewsUrl}
      target="_blank"
      rel="noreferrer"
      gtmEvent={{ event: "reviews_click", location }}
      className={`max-w-full items-center gap-2 rounded-full bg-transparent px-1 py-1 text-primary drop-shadow-[0_1px_1px_rgba(255,255,255,0.72)] transition hover:-translate-y-0.5 sm:gap-3 ${className}`}
      aria-label={`Read ${googleReviewCount} Google reviews`}
    >
      <span className="min-w-0 text-sm sm:text-base">
        <GoogleWordmark />
        <span className="mt-0.5 flex items-center gap-1 text-accent sm:mt-1">
          <span className="text-xs font-black leading-none text-[#fbbc05] sm:text-sm">
            {googleReviewRating}
          </span>
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" />
            ))}
          </span>
        </span>
        <span className="mt-0.5 block text-[0.65rem] font-black uppercase leading-tight tracking-[0.08em] text-primary sm:text-xs">
          {googleReviewCount} reviews
        </span>
      </span>
    </TrackedAnchor>
  );
}
