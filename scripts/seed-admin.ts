/**
 * Creates or updates the administrator account.
 *
 * Credentials are read from ADMIN_EMAIL and ADMIN_PASSWORD in .env. They are
 * never printed. Use a long, unique password for the first sign-in and rotate it
 * by running this script again.
 *
 * Usage: npm run seed:admin
 */
import { hashPassword } from "../lib/auth";
import { db } from "../lib/db";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running seed:admin.",
    );
  }
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
    },
    update: { passwordHash, role: "ADMIN" },
  });

  await db.syncLog.create({
    data: {
      kind: "admin",
      status: "SUCCESS",
      message: `Administrator account ready for ${user.email}.`,
    },
  });

  console.log(`Administrator ready: ${user.email}`);
}

main()
  .catch((error) => {
    console.error((error as Error).message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
