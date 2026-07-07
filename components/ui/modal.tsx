"use client";

import * as React from "react";
import { Modal as HeroModal } from "@heroui/react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <HeroModal>
      <HeroModal.Backdrop
        isOpen={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose();
        }}
      >
        <HeroModal.Container>
          <HeroModal.Dialog className={cn("sm:max-w-lg", className)}>
            <HeroModal.CloseTrigger />
            {(title || description) && (
              <HeroModal.Header>
                {title && <HeroModal.Heading>{title}</HeroModal.Heading>}
                {description && (
                  <p className="text-sm text-muted">{description}</p>
                )}
              </HeroModal.Header>
            )}
            <HeroModal.Body>{children}</HeroModal.Body>
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  );
}
