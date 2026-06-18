import { db } from "@/lib/db";

export async function listUsers() {
  return db.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}

export type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

// Active users for the assignee picker.
export async function listAssignableUsers() {
  return db.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
}

export type AssignableUser = Awaited<
  ReturnType<typeof listAssignableUsers>
>[number];
