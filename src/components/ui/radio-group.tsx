import * as React from "react";
import { cn } from "@/lib/utils";

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

export interface RadioGroupProps extends React.HTMLProps<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function RadioGroup({
  className,
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  ...props
}: RadioGroupProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = (val: string) => {
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    if (onValueChange) {
      onValueChange(val);
    }
  };

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div
        role="radiogroup"
        className={cn("grid gap-2", className)}
        {...(props as any)}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, id, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const checked = context.value === value;

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        id={id}
        aria-checked={checked}
        onClick={() => context.onValueChange?.(value)}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer transition-colors",
          checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white hover:border-slate-400",
          className
        )}
        {...props}
      >
        {checked && (
          <span className="h-2 w-2 rounded-full bg-white block" />
        )}
      </button>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";
