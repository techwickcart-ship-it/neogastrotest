import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, ...props }, ref) => {
    const hasValueProp = "value" in props || value !== undefined;
    let safeValue = value;
    if (hasValueProp) {
      if (safeValue === null || safeValue === undefined) {
        safeValue = "";
      }
    } else if (props.onChange !== undefined && props.defaultValue === undefined) {
      safeValue = "";
    }

    const shouldInjectValue = hasValueProp || (props.onChange !== undefined && props.defaultValue === undefined);

    return (
      <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        ref={ref}
        {...props}
        {...(shouldInjectValue ? { value: safeValue } : {})}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
