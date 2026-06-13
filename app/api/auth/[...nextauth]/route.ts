import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import db from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const [rows]: any = await db.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [user.email]
      );

      if (rows.length === 0) {
        await db.query(
          `
          INSERT INTO users (email, nickname, image, role, dotori)
          VALUES (?, ?, ?, 'user', 0)
          `,
          [user.email, user.name || "회원", user.image || null]
        );
      }

      return true;
    },

    async session({ session }) {
      if (!session.user?.email) return session;

      const [rows]: any = await db.query(
        `
        SELECT id, email, nickname, image, role, dotori
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [session.user.email]
      );

      if (rows.length > 0) {
        const dbUser = rows[0];

        session.user = {
          ...session.user,
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.nickname || "회원",
          image: dbUser.image || session.user.image,
          role: dbUser.role,
          dotori: dbUser.dotori,
        } as any;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };