"use client";

import * as React from "react";
import { Button as HeroButton } from "@heroui/react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantMap: Record<
  ButtonVariant,
  "primary" | "danger" | "outline" | "secondary" | "ghost" | "tertiary"
> = {
  default: "primary",
  destructive: "danger",
  outline: "outline",
  secondary: "secondary",
  ghost: "ghost",
  link: "tertiary",
};

const sizeMap: Record<ButtonSize, "sm" | "md" | "lg"> = {
  default: "md",
  sm: "sm",
  lg: "lg",
  icon: "md",
};

export interface ButtonProps
  extends Omit<
    React.ComponentProps<typeof HeroButton>,
    "variant" | "size" | "isDisabled" | "onPress"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size === "icon";

    return (
      <HeroButton
        ref={ref}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        isDisabled={disabled}
        isIconOnly={isIconOnly}
        className={cn(className)}
        {...props}
      >
        {children}
      </HeroButton>
    );
  }
);
Button.displayName = "Button";

function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(className);
}

export { Button, buttonVariants };
