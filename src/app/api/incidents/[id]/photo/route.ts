import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";

// Serves an incident's private photo. The Blob URL is never exposed to the
// browser — only signed-in users with incident access can stream it here.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user, "view")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const incident = await db.incident.findUnique({
    where: { id },
    select: { photoUrl: true },
  });
  if (!incident?.photoUrl) {
    return new Response("Not found", { status: 404 });
  }

  const result = await get(incident.photoUrl, { access: "private" });
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
