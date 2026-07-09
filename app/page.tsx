import { redirect } from "next/navigation";
import { assetPath } from "@/lib/assets";

export default function HomePage() {
  redirect(assetPath("/login"));
}
