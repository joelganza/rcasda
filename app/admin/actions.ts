"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncCurrentQuarter } from "@/lib/sabbath";

export type SyncActionResult = { ok: boolean; message: string };

export async function syncQuarterAction(): Promise<SyncActionResult> {
  await requireAdmin();

  try {
    const result = await syncCurrentQuarter();
    revalidatePath("/admin");
    revalidatePath("/sabbath-school");
    revalidatePath(`/sabbath-school/${result.quarterId}`);
    return {
      ok: true,
      message: `Synced ${result.title}: ${result.lessons} lessons from the official source.`,
    };
  } catch (error) {
    console.error("manual quarter sync failed", error);
    revalidatePath("/admin");
    return {
      ok: false,
      message:
        error instanceof Error
          ? `Sync failed: ${error.message}`
          : "Sync failed. Check the server logs.",
    };
  }
}

export async function updateRoleAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || (role !== "ADMIN" && role !== "MEMBER")) return;
  if (userId === admin.id) return;

  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}

export async function deleteUserSessionsAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return;

  await db.session.deleteMany({ where: { userId } });
  revalidatePath("/admin");
}
