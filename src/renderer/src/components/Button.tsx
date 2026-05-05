import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", children, ...props },
    ref,
  ) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none";

    const variants = {
      primary:
        "bg-acc hover:bg-acc-hi active:bg-acc-dk text-white shadow-sm",
      secondary:
        "bg-ctrl hover:bg-ctrl-hi active:bg-surf-1 text-ink-1 border border-bdr-hi",
      ghost:
        "hover:bg-ctrl/60 active:bg-ctrl text-ink-2 hover:text-ink-1",
      danger:
        "bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-sm",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
