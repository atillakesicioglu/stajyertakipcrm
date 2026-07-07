"use client";

import * as React from "react";
import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard>
>(({ className, ...props }, ref) => (
  <HeroCard ref={ref} className={cn(className)} variant="default" {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard.Header>
>(({ className, ...props }, ref) => (
  <HeroCard.Header ref={ref} className={cn(className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard.Title>
>(({ className, ...props }, ref) => (
  <HeroCard.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard.Description>
>(({ className, ...props }, ref) => (
  <HeroCard.Description ref={ref} className={cn(className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard.Content>
>(({ className, ...props }, ref) => (
  <HeroCard.Content ref={ref} className={cn(className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof HeroCard.Footer>
>(({ className, ...props }, ref) => (
  <HeroCard.Footer ref={ref} className={cn(className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
