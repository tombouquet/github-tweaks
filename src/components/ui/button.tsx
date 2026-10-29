import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Primer's buttons: 28px tall, 12px text.
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border text-xs/5 font-medium whitespace-nowrap outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-button text-foreground hover:bg-button-hover',
        primary: 'border-[#1f232826] bg-primary text-white hover:bg-primary-hover',
        danger: 'bg-button text-danger hover:bg-button-hover',
        ghost: 'text-muted-foreground hover:text-foreground border-transparent',
      },
      size: {
        default: 'h-7 px-3',
        icon: 'size-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({ className, variant, size, ...props }: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
