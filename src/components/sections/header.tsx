"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/#offer", label: "Offer" },
  { href: "/#appliances", label: "Appliances", hasDropdown: true },
  { href: "/#brands", label: "Brands" },
  { href: "/#why-us", label: "Why Choose Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

const applianceLinks = [
  { href: "/refrigerator-repair-charlotte-nc", label: "Refrigerator Repair" },
  { href: "/washer-repair-charlotte-nc", label: "Washer Repair" },
  { href: "/dryer-repair-charlotte-nc", label: "Dryer Repair" },
  { href: "/dishwasher-repair-charlotte-nc", label: "Dishwasher Repair" },
  { href: "/oven-repair-charlotte-nc", label: "Oven Repair" },
  { href: "/cooktop-repair-charlotte-nc", label: "Cooktop Repair" },
  { href: "/freezer-repair-charlotte-nc", label: "Freezer Repair" },
  { href: "/ice-machine-repair-charlotte-nc", label: "Ice Machine Repair" },
  { href: "/wine-cooler-repair-charlotte-nc", label: "Wine Cooler Repair" },
  { href: "/commercial-refrigerator-repair-charlotte-nc", label: "Commercial Refrigerator Repair" },
];

type HeaderProps = {
  logoHref?: string;
};

export function Header({ logoHref }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAppliancesOpen, setIsAppliancesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsAppliancesOpen(false);
  };

  const scrollToTop = () => {
    closeMenu();
    if (logoHref) {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        isScrolled
          ? "border-border/90 bg-surface/95 shadow-sm backdrop-blur"
          : "border-transparent bg-surface/85"
      }`}
    >
      <div className="container-shell">
        <div className="flex h-20 items-center justify-between">
          {logoHref ? (
            <Link href={logoHref} onClick={closeMenu} className="flex items-center gap-3 text-left" aria-label="Go to homepage">
              <Image src="/logo.jpg" alt="Dapl Appliance Repair logo" width={80} height={80} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Dapl
                </p>
                <p className="text-base font-bold text-primary">Appliance Repair</p>
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-3 text-left"
              aria-label="Scroll to top"
            >
              <Image src="/logo.jpg" alt="Dapl Appliance Repair logo" width={80} height={80} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Dapl
                </p>
                <p className="text-base font-bold text-primary">Appliance Repair</p>
              </div>
            </button>
          )}

          <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
            {navItems.map((item) =>
              item.hasDropdown ? (
                <div key={item.href} className="group relative">
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-1.5 py-7 text-sm font-medium text-foreground/90 transition hover:text-primary"
                  >
                    {item.label}
                    <svg className="h-4 w-4 transition group-hover:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                  <div className="invisible absolute left-0 top-full w-[520px] translate-y-2 rounded-2xl border border-border bg-white p-3 opacity-0 shadow-xl shadow-primary/10 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="grid grid-cols-2 gap-1">
                      {applianceLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="rounded-xl px-4 py-3 text-sm font-semibold text-foreground/85 transition hover:bg-primary/5 hover:text-primary"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-foreground/90 transition hover:text-primary"
                >
                  {item.label}
                </a>
              ),
            )}
            <a
              href="tel:+17042660508"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"
            >
              Schedule Your Repair
            </a>
          </nav>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => {
              setIsMenuOpen((open) => !open);
              setIsAppliancesOpen(false);
            }}
            className="rounded-lg border border-border p-2 lg:hidden"
          >
            <span className="block h-0.5 w-5 bg-foreground" />
            <span className="mt-1.5 block h-0.5 w-5 bg-foreground" />
            <span className="mt-1.5 block h-0.5 w-5 bg-foreground" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-border bg-surface lg:hidden"
          >
            <nav className="container-shell flex flex-col gap-4 py-5">
              {navItems.map((item) =>
                item.hasDropdown ? (
                  <div key={item.href}>
                    <button
                      type="button"
                      aria-expanded={isAppliancesOpen}
                      onClick={() => setIsAppliancesOpen((open) => !open)}
                      className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground/90 transition hover:text-primary"
                    >
                      {item.label}
                      <span className="relative h-5 w-5 text-primary" aria-hidden="true">
                        <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
                        <span
                          className={`absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition ${
                            isAppliancesOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
                          }`}
                        />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isAppliancesOpen ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 grid gap-2 border-l border-border pl-4">
                            {applianceLinks.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMenu}
                                className="py-1 text-sm font-medium text-foreground/75 transition hover:text-primary"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="text-sm font-medium text-foreground/90 transition hover:text-primary"
                  >
                    {item.label}
                  </a>
                ),
              )}
              <a
                href="tel:+17042660508"
                onClick={closeMenu}
                className="mt-2 inline-flex w-fit rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Schedule Your Repair
              </a>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
