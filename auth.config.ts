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

      if (pathname === "/login") {
        if (isLoggedIn) {
          return Response.redirect(new URL("/isler", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) return false;

      const role = auth?.user?.role;
      const isAdminRoute = adminOnlyRoutes.some((r) => pathname.startsWith(r));
      if (isAdminRoute && role !== "ADMIN") {
        return Response.redirect(new URL("/isler", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; role: Role };
        token.id = u.id;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
