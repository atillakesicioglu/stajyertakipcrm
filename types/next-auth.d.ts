import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "INTERN";

declare module "next-auth" {
  interface User {
    role: Role;
    mustSetPassword?: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      mustSetPassword?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    mustSetPassword?: boolean;
  }
}
