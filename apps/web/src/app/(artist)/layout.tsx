import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArtistNav } from "@/components/nav/artist-nav";

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <ArtistNav email={session.user.email} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
