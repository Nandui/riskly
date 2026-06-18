import { redirect } from "next/navigation";

// The library now lives under the unified Admin area.
export default function LibraryRedirect() {
  redirect("/admin");
}
