type AdminGlobalSearchProps = {
  defaultValue?: string;
  compact?: boolean;
};

export function AdminGlobalSearch({ defaultValue = "", compact = false }: AdminGlobalSearchProps) {
  return (
    <form
      action="/admin/search"
      className={`flex min-w-0 gap-2 ${compact ? "w-full max-w-xl" : "w-full"}`}
    >
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search name, phone, address, invoice, part..."
        className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground outline-none ring-primary/30 transition placeholder:text-muted focus:border-primary focus:ring-2"
      />
      <button
        type="submit"
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
      >
        Search
      </button>
    </form>
  );
}
