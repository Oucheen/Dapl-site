import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-10">
      <div className="container-shell">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/logo.jpg" alt="Dapl Appliance Repair logo" width={80} height={80} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Dapl
                </p>
                <p className="text-base font-bold text-primary">Appliance Repair</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted">
              Professional appliance repair services for homeowners and businesses in Charlotte, NC and surrounding areas.
            </p>
          </div>
          <address className="not-italic text-sm leading-7 text-muted">
            <p className="font-semibold text-foreground">Contact</p>
            <p className="mt-2">
              <a href="tel:+17042660508" className="hover:text-primary">
                +1 (704) 266-0508
              </a>
            </p>
            <p>
              <a href="mailto:dapl.appliance.repair@gmail.com" className="hover:text-primary">
                dapl.appliance.repair@gmail.com
              </a>
            </p>
            <p className="mt-2">9401 Peckham Rye Rd, Charlotte, NC 28227</p>
            <p>Service area: Charlotte, NC and surrounding areas</p>
          </address>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs text-muted">
          © {new Date().getFullYear()} Dapl Appliance Repair. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
