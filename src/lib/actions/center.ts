"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CENTER_COOKIE, ALL_CENTERS } from "@/lib/center-shared";

// Switch the active centre (or "all"). Called from the sidebar switcher.
export async function selectCenter(centerId: string) {
  const value = centerId || ALL_CENTERS;
  const store = await cookies();
  store.set(CENTER_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
