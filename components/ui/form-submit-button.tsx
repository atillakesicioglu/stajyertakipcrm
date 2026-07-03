"use client";

import { useFormStatus } from "react-dom";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  icon?: LucideIcon;
} & Pick<ButtonProps, "variant" | "size" | "className">;

export function FormSubmitButton({
  label,
  pendingLabel = "Yükleniyor...",
  icon: Icon,
  variant,
  size,
  className,
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}
