import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getInternList = cache(async () =>
  prisma.user.findMany({
    where: { role: "INTERN" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
);

export const getInternOptions = getInternList;
