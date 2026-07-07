"use client";

import * as React from "react";
import { Switch as HeroSwitch } from "@heroui/react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: SwitchProps) {
  return (
    <HeroSwitch
      id={id}
      isSelected={checked}
      onChange={onCheckedChange}
      isDisabled={disabled}
      aria-label="Toggle"
      className={cn(className)}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}
