"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("skeleton animate-shimmer", className)} {...props} />
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
