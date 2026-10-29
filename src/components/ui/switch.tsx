import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

// Primer's toggle switch: 32×20, blue when on.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-5 w-8 shrink-0 rounded-full bg-switch-off transition-colors duration-75 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-checked:bg-accent data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_#1f232826] transition-transform duration-75 data-checked:translate-x-3" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
