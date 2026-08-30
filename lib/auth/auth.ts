import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/db";

const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

if (!ownerEmail) {
  throw new Error("OWNER_EMAIL is not configured");
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = user.email?.trim().toLowerCase();
      console.log("[auth][signIn] Google sign-in attempt", {
        provider: account?.provider,
        email: email ? `${email.slice(0, 3)}***@${email.split("@")[1]}` : null,
        ownerEmailConfigured: Boolean(ownerEmail),
        emailMatchesOwner: email === ownerEmail,
        hasGoogleSubject: typeof profile?.sub === "string",
      });

      if (!email || email !== ownerEmail) {
        return false;
      }

      const googleSubject =
        typeof profile?.sub === "string" ? profile.sub : null;

      if (!googleSubject) {
        return false;
      }

      const existingOwner = await prisma.ownerAccount.findUnique({
        where: {
          email: ownerEmail,
        },
      });
      /*
      if (!existingOwner) {
        await prisma.ownerAccount.create({
          data: {
            email: ownerEmail,
            googleSubject,
            displayName: user.name,
          },
        });

        return true;
      }
*/
      if (!existingOwner) {
        console.log("[auth][signIn] Creating OwnerAccount", {
          email: ownerEmail,
          hasGoogleSubject: Boolean(googleSubject),
        });

        try {
          const createdOwner = await prisma.ownerAccount.create({
            data: {
              email: ownerEmail,
              googleSubject,
              displayName: user.name,
            },
          });

          console.log("[auth][signIn] OwnerAccount created", {
            id: createdOwner.id,
          });

          return true;
        } catch (error) {
          console.error("[auth][signIn] OwnerAccount creation failed", error);
          throw error;
        }
      }
      if (existingOwner.googleSubject === `seed:${ownerEmail}`) {
        await prisma.ownerAccount.update({
          where: {
            id: existingOwner.id,
          },
          data: {
            googleSubject,
            displayName: user.name ?? existingOwner.displayName,
            lastSignInAt: new Date(),
          },
        });

        return true;
      }

      if (existingOwner.googleSubject !== googleSubject) {
        return false;
      }

      await prisma.ownerAccount.update({
        where: {
          id: existingOwner.id,
        },
        data: {
          displayName: user.name ?? existingOwner.displayName,
          lastSignInAt: new Date(),
        },
      });

      return true;
    },

    async jwt({ token }) {
      if (!token.email) {
        return token;
      }

      const email = token.email.trim().toLowerCase();

      if (email !== ownerEmail) {
        return token;
      }

      const owner = await prisma.ownerAccount.findUnique({
        where: {
          email: ownerEmail,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (owner) {
        token.ownerId = owner.id;
        token.email = owner.email;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.ownerId) {
        session.user.id = token.ownerId;
      }

      return session;
    },
  },
});
