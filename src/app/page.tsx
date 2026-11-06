import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// The marketing site lives in landing/. The app root just routes you.
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/app" : "/login");
}
