import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export class CurrentOwnerError extends Error {
  constructor(message = "Authenticated owner could not be resolved") {
    super(message);
    this.name = "CurrentOwnerError";
  }
}

export async function getCurrentOwner() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new CurrentOwnerError("Authentication is required");
  }

  const owner = await prisma.ownerAccount.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!owner) {
    throw new CurrentOwnerError("Current owner does not exist");
  }

  return owner;
}
