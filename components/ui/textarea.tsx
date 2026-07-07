"use client";

import * as React from "react";
import { TextArea } from "@heroui/react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof TextArea>
>(({ className, ...props }, ref) => {
  return (
    <TextArea
      ref={ref}
      className={cn(className)}
      fullWidth
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
