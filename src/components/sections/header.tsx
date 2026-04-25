"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/#offer", label: "Offer" },
  { href: "/#appliances", label: "Appliances" },
  { href: "/#brands", label: "Brands" },
  { href: "/#why-us", label: "Why Choose Us" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

type HeaderProps = {
  logoHref?: string;
};

export function Header({ logoHref }: HeaderProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollToTop = () => {
    setIsMenuOpen(false);
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

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        isScrolled
          ? "border-border/90 bg-surface/95 shadow-sm backdrop-blur"
          : "border-transparent bg-surface/85"
      }`}
    >
      <div className="container-shell">
        <div className="flex h-20 items-center justify-between">
          {logoHref ? (
            <Link href={logoHref} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 text-left" aria-label="Go to homepage">
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

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-foreground/90 transition hover:text-primary"
              >
                {item.label}
              </a>
            ))}
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
            onClick={() => setIsMenuOpen((open) => !open)}
            className="rounded-lg border border-border p-2 md:hidden"
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
            className="border-t border-border bg-surface md:hidden"
          >
            <nav className="container-shell flex flex-col gap-4 py-5">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-medium text-foreground/90 transition hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="tel:+17042660508"
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
