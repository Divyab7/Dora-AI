"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "elevated" | "flat";
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "glass", hover = false, children, ...props }, ref) => {
    const variants: Record<string, string> = {
      glass: "glass-card",
      elevated: "glass-elevated",
      flat: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl",
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          hover && "transition-all duration-200 hover:scale-[1.02] hover:border-[var(--border-hover)] cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 pb-0", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardContent, CardFooter };
