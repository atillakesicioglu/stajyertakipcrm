import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { isUnsetPassword, isUnsetPasswordSync } from "@/lib/password";
import { logActivity } from "@/lib/activity";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    signIn: async ({ user }) => {
      if (!user.id) return;
      const userId = user.id;
      void prisma.user
        .update({
          where: { id: userId },
          data: { lastLoginAt: new Date() },
        })
        .catch(() => {});
      void logActivity(userId, "LOGIN", "/login", "Panele giriş yaptı").catch(
        () => {}
      );
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        if (isUnsetPasswordSync(user.passwordHash)) {
          if (password !== "") return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustSetPassword: true,
            theme: user.theme,
          };
        }

        if (password === "") {
          if (await isUnsetPassword(user.passwordHash)) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              mustSetPassword: true,
              theme: user.theme,
            };
          }
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash!);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustSetPassword: false,
          theme: user.theme,
        };
      },
    }),
  ],
});
