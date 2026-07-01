import { cache } from "react";
import { auth } from "@/auth";

/** Aynı istek içinde tekrarlayan auth() çağrılarını birleştirir. */
export const getSession = cache(async () => auth());
