"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ServicePageDirectoryItem } from "@/content/service-pages";

type RelatedServicesCarouselProps = {
  items: ServicePageDirectoryItem[];
};

export function RelatedServicesCarousel({ items }: RelatedServicesCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;

    if (!element) {
      return;
    }

    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    setCanScrollLeft(element.scrollLeft > 8);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 8);
  }, []);

  useEffect(() => {
    updateScrollState();

    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const centerInitialCard = () => {
      const cards = Array.from(
        element.querySelectorAll<HTMLElement>("[data-related-card-wrapper]"),
      );
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const initialIndex = isMobile ? Math.min(1, cards.length - 1) : 0;
      const initialCard = cards[initialIndex];

      if (!initialCard) {
        return;
      }

      if (!isMobile) {
        element.style.paddingLeft = "0px";
        element.style.paddingRight = "0px";
        element.scrollTo({
          left: 0,
          behavior: "auto",
        });
        return;
      }

      const sidePadding = Math.max(16, (element.clientWidth - initialCard.offsetWidth) / 2);
      element.style.paddingLeft = `${sidePadding}px`;
      element.style.paddingRight = `${sidePadding}px`;

      const centeredLeft =
        initialCard.offsetLeft - (element.clientWidth - initialCard.offsetWidth) / 2;

      element.scrollTo({
        left: Math.max(0, centeredLeft),
        behavior: "auto",
      });
    };

    centerInitialCard();
    window.addEventListener("resize", centerInitialCard);

    return () => {
      window.removeEventListener("resize", centerInitialCard);
    };
  }, [items]);

  const scrollByCardWidth = (direction: "prev" | "next") => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const card = element.querySelector<HTMLElement>("[data-related-card]");
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const gap = isDesktop ? 20 : 16;
    const amount = (card?.offsetWidth ?? 320) + gap;

    element.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative mt-10">
      <div className="mb-5 hidden items-center justify-end gap-3 md:flex">
        <button
          type="button"
          onClick={() => scrollByCardWidth("prev")}
          disabled={!canScrollLeft}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white text-lg font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
          aria-label="Scroll related services left"
        >
          {"\u2190"}
        </button>
        <button
          type="button"
          onClick={() => scrollByCardWidth("next")}
          disabled={!canScrollRight}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white text-lg font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
          aria-label="Scroll related services right"
        >
          {"\u2192"}
        </button>
      </div>

      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-primary/55 md:hidden">
        {"\u2190"} Swipe for more {"\u2192"}
      </p>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 scroll-smooth md:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <motion.div
            key={item.slug}
            data-related-card-wrapper
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="w-[220px] shrink-0 snap-center min-[390px]:w-[236px] md:min-w-[340px] xl:min-w-[360px]"
          >
            <Link
              href={`/${item.slug}`}
              data-related-card
              className="flex h-full min-h-[208px] flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md md:min-h-[240px] md:p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent/85">
                Service Page
              </p>
              <h3 className="mt-3 text-xl font-bold text-primary">{item.applianceName} Repair</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-muted">{item.summary}</p>
              <span className="mt-5 text-sm font-semibold text-primary">Read service page</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
