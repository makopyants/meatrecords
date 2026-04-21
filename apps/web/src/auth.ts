import NextAuth, { type NextAuthResult } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const MODERATOR_EMAILS = (process.env["MODERATOR_EMAILS"] ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const result: NextAuthResult = NextAuth({
  ...(process.env["AUTH_SECRET"] ? { secret: process.env["AUTH_SECRET"] } : {}),
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.password) return null;

        const valid = await compare(parsed.data.password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (user) {
        token["id"] = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token["id"] as string;
      session.user.isModerator = MODERATOR_EMAILS.includes(session.user.email);
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login/error",
  },
});

export const { handlers, auth, signIn, signOut } = result;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      isModerator: boolean;
    };
  }
}
