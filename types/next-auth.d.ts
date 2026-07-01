import { DefaultSession } from "next-auth";
import type { Theme } from "@prisma/client";

type Role = "ADMIN" | "INTERN";

declare module "next-auth" {
  interface User {
    role: Role;
    mustSetPassword?: boolean;
    theme?: Theme;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      mustSetPassword?: boolean;
      theme?: Theme;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustSetPassword?: boolean;
    theme?: Theme;
  }
}
