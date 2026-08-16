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
      // 신규 Google 로그인 사용자는 여기서 users 레코드를 미리 만들지 않습니다.
      // /nickname 에서 직접 닉네임을 정한 뒤 가입이 완료됩니다.
      return Boolean(user.email);
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