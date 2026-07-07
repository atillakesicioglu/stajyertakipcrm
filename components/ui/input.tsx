"use client";

import * as React from "react";
import { Input as HeroInput } from "@heroui/react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof HeroInput>>(
  ({ className, ...props }, ref) => {
    return (
      <HeroInput
        ref={ref}
        className={cn(className)}
        fullWidth
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
