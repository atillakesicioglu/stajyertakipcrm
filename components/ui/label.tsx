"use client";

import * as React from "react";
import { Label as HeroLabel } from "@heroui/react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentProps<typeof HeroLabel>
>(({ className, ...props }, ref) => (
  <HeroLabel ref={ref} className={cn(className)} {...props} />
));
Label.displayName = "Label";

export { Label };
