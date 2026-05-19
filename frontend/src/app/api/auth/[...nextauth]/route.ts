import NextAuth from 'next-auth';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [],
  callbacks: {
    async session({ session, token }: any) {
      return {
        ...session,
        user: {
          ...session.user,
          role: 'ADMIN',
        },
        accessToken: 'mock-token',
      };
    },
  },
};

// next-auth v5 returns { handlers, auth, signIn, signOut }
const result = NextAuth(authOptions);

// v5 shape: destructure handlers and auth; fall back to result itself for v4 compat
const handlers = (result as any).handlers ?? result;
export const auth = (result as any).auth ?? (() => Promise.resolve(null));

export const GET = (handlers as any).GET ?? handlers;
export const POST = (handlers as any).POST ?? handlers;