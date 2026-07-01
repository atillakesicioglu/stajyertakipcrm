"use server";

import { revalidatePath } from "next/cache";
import type { Theme } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function updateTheme(theme: Theme): Promise<void> {
  const session = await getSession();
  if (!session?.user) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { theme },
  });

  revalidatePath("/ayarlar");
}
