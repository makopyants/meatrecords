import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NewReleaseForm } from "./new-release-form";

export default async function NewReleasePage() {
  const session = await auth();

  const artists = await prisma.artist.findMany({
    where: { user: { email: session!.user.email }, deletedAt: null },
    orderBy: { name: "asc" },
  });

  if (artists.length === 0) redirect("/artists/new");

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-bold">Новый релиз</h1>
      <NewReleaseForm artists={artists.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
