import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
  dropdownItems?: {
    label: string;
    href: string;
  }[];
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-border/70 bg-white/90 backdrop-blur lg:sticky lg:top-20 lg:z-40"
    >
      <ol className="container-shell flex min-w-0 items-center gap-2 overflow-x-auto py-3 text-xs font-semibold text-muted sm:text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-border">
                  /
                </span>
              ) : null}

              {item.href && !isCurrent ? (
                item.dropdownItems?.length ? (
                  <span className="group relative inline-flex">
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 whitespace-nowrap transition hover:text-primary"
                    >
                      {item.label}
                      <span aria-hidden="true" className="text-[0.65rem] text-primary">
                        v
                      </span>
                    </Link>
                    <span className="invisible absolute left-0 top-full z-50 mt-2 w-72 translate-y-1 rounded-xl border border-border bg-white p-2 opacity-0 shadow-xl shadow-primary/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      {item.dropdownItems.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.href}
                          href={dropdownItem.href}
                          className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-primary/5 hover:text-primary"
                        >
                          {dropdownItem.label}
                        </Link>
                      ))}
                    </span>
                  </span>
                ) : (
                  <Link href={item.href} className="whitespace-nowrap transition hover:text-primary">
                    {item.label}
                  </Link>
                )
              ) : (
                <span aria-current={isCurrent ? "page" : undefined} className={isCurrent ? "truncate text-foreground" : "whitespace-nowrap"}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
