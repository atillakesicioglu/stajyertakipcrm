import type { NextAuthConfig } from "next-auth";

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
    jwt({ token, user, trigger }) {
      if (user) {
        const u = user as { id: string; role: Role; mustSetPassword?: boolean };
        token.id = u.id;
        token.role = u.role;
        token.mustSetPassword = u.mustSetPassword ?? false;
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
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
