import { redirect } from "next/navigation";

// Centres now live under the unified Admin area.
export default function CentersRedirect() {
  redirect("/admin");
}
