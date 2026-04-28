import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// ============================================================
// NextAuth Configuration — Google OAuth
// Exchanges Google token for our own backend JWT.
// ============================================================

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

const googleConfigured =
  !!googleClientId &&
  googleClientId !== "your-google-client-id" &&
  !!googleClientSecret &&
  googleClientSecret !== "your-google-client-secret";

console.log(`[NextAuth] Google OAuth configured: ${googleConfigured}`);

const providers: any[] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-me",

  callbacks: {
    async jwt({ token, account, user, trigger }) {
      console.log(`[NextAuth JWT] trigger=${trigger}, provider=${account?.provider || "none"}, email=${user?.email || token?.email || "?"}`);

      // On first Google sign-in, exchange for our backend JWT
      if (account?.provider === "google" && user?.email) {
        console.log(`[NextAuth JWT] Calling backend: POST ${API_BASE}/api/auth/google`);
        console.log(`[NextAuth JWT] Payload: email=${user.email}, name=${user.name}, googleId=${account.providerAccountId}`);

        try {
          const res = await fetch(`${API_BASE}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name || user.email.split("@")[0],
              googleId: account.providerAccountId,
            }),
          });

          const data = await res.json();
          console.log(`[NextAuth JWT] Backend response: status=${res.status}, success=${data.success}`);

          if (data.success && data.data?.token) {
            token.backendToken = data.data.token;
            token.backendError = null;
            console.log(`[NextAuth JWT] ✅ Backend token obtained successfully`);
          } else {
            token.backendToken = null;
            token.backendError = data.error || "Google login failed on backend";
            console.log(`[NextAuth JWT] ❌ Backend error: ${token.backendError}`);
          }
        } catch (err: any) {
          console.error(`[NextAuth JWT] ❌ Fetch failed:`, err.message);
          token.backendToken = null;
          token.backendError = "Could not connect to backend server";
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose our custom fields to the client
      (session as any).backendToken = token.backendToken || null;
      (session as any).backendError = token.backendError || null;
      console.log(`[NextAuth Session] backendToken=${token.backendToken ? "present" : "null"}, error=${token.backendError || "none"}`);
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After Google callback, always go back to the home page (login page handles the rest)
      console.log(`[NextAuth Redirect] url=${url}, baseUrl=${baseUrl}`);
      return baseUrl;
    },
  },

  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
