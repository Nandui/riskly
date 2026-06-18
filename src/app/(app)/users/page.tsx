import { redirect } from "next/navigation";

// Users now live under the unified Admin area.
export default function UsersRedirect() {
  redirect("/admin");
}
