import type { NextAuthConfig } from "next-auth";
import type { Theme } from "@prisma/client";

type Role = "ADMIN" | "INTERN";

const adminOnlyRoutes = ["/stajyerler", "/loglar"];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const mustSetPassword = !!auth?.user?.mustSetPassword;

      if (pathname === "/login") {
        if (isLoggedIn) {
          const dest = mustSetPassword ? "/sifre-belirle" : "/isler";
          return Response.redirect(new URL(dest, nextUrl));
        }
        return true;
      }

      if (pathname === "/sifre-belirle") {
        if (!isLoggedIn) return false;
        if (!mustSetPassword) {
          return Response.redirect(new URL("/isler", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      if (mustSetPassword) {
        return Response.redirect(new URL("/sifre-belirle", nextUrl));
      }

      const role = auth?.user?.role;
      const isAdminRoute = adminOnlyRoutes.some((r) => pathname.startsWith(r));
      if (isAdminRoute && role !== "ADMIN") {
        return Response.redirect(new URL("/isler", nextUrl));
      }

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as {
          id: string;
          role: Role;
          mustSetPassword?: boolean;
          theme?: Theme;
        };
        token.id = u.id;
        token.role = u.role;
        token.mustSetPassword = u.mustSetPassword ?? false;
        token.theme = u.theme ?? "SYSTEM";
      }
      if (trigger === "update" && session?.theme) {
        token.theme = session.theme as Theme;
      }
      if (trigger === "update") {
        token.mustSetPassword = false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.mustSetPassword = !!token.mustSetPassword;
        session.user.theme = (token.theme as Theme | undefined) ?? "SYSTEM";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
