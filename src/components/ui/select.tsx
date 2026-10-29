import { cn } from '@/lib/utils';

// Octicon chevron-down, in the muted text colour for light and dark.
const CHEVRON = (fill: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%23${fill}'%3E%3Cpath d='M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z'/%3E%3C/svg%3E")`;

/**
 * A native select styled like Primer's, with our own chevron so it can sit further in
 * from the edge than the browser's. Native, so long option lists (the date formats) scroll.
 */
function Select({ className, style, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'bg-button h-7 min-w-0 appearance-none rounded-md border bg-size-[12px] bg-position-[right_10px_center] bg-no-repeat py-[3px] pr-[30px] pl-2 text-xs/5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50',
        '[background-image:var(--chevron-light)] dark:[background-image:var(--chevron-dark)]',
        className,
      )}
      style={{ '--chevron-light': CHEVRON('59636e'), '--chevron-dark': CHEVRON('9198a1'), ...style } as React.CSSProperties}
      {...props}
    />
  );
}

export { Select };
