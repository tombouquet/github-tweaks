/** The title row of a full page. Text sits on the title's baseline, so the smaller version reads as level with it; the icon stays centred. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-2 flex items-baseline gap-3">
      <img src="/icon/48.png" alt="" className="size-8 self-center" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </header>
  );
}

/** The muted line under a page's title. */
export function Intro({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mb-6">{children}</p>;
}
