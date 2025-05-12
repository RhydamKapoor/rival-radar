import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import GoogleProvider from "next-auth/providers/google";
import { pool } from "@/utils/db";
import { v4 as uuidv4 } from 'uuid';  


interface DBUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  provider: string;
  createdAt: Date;
  image?: string;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60*60*24
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }
        try {
          //   await connectDB();

          const [rows]: any = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [credentials.email]
          );
          const user: DBUser = rows[0];
          console.log(user)
          if (!user) {
            throw new Error("User not found");
          }
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error("Invalid credentials");
          }

          if (!isValid) {
            console.log("Invalid credentials");
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            provider: user.provider,
            createdAt: user.createdAt,
          };
        } catch (error: any) {
          console.error("Error in authorize:", error.message);
          throw new Error(error.message);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {

      if (account?.provider === "google") {
        try {
          const [rows]: any = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [user.email]
          );

          if (rows.length === 0) {
            console.log("No existing user, creating new one...");
            const id = uuidv4();
            const firstName = user.name ? user.name.split(" ")[0] : "NoName";
            const lastName = user.name ? user.name.split(" ")[1] || "" : "NoName";
            await pool.execute(
              "INSERT INTO users (id, firstName, lastName, email, image, role, provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
              [id, firstName, lastName, user.email, user.image || null, "User", account?.provider]
            );
          } else {
            console.log("Existing user found:", rows[0]);
          }
        } catch (error) {
          console.error("SignIn Error:", error);
          return false; // AccessDenied
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session?.user) {
        return { ...token, ...session.user };
      }

      if (user) {
          const [rows]: any = await pool.execute(
            "SELECT * FROM users WHERE email = ?",
            [user.email]
          );
          const existingUser = rows[0];

        if (existingUser) {
          token.id = existingUser.id;
          token.firstName = existingUser.firstName;
          token.lastName = existingUser.lastName;
          token.role = existingUser.role;
          token.email = existingUser.email;
          token.createdAt = existingUser.createdAt;
          token.picture = existingUser.image;
          token.provider = existingUser.provider;
        }
      }

      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (token) {
        session.user.id = token.id;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.role = token.role;
        session.user.email = token.email;
        session.user.createdAt = token.createdAt;
        session.user.picture = token.picture;
        session.user.provider = token.provider;

        // Combine firstName and lastName to create a name property
        if (token.firstName && token.lastName) {
          session.user.name = `${token.firstName} ${token.lastName}`;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login"
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };