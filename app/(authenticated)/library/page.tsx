import { getCurrentOwner } from "@/lib/auth/current-owner";
import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import { ArtefactLibrary } from "@/components/library/artefact-library";

export default async function LibraryPage() {
  const owner = await getCurrentOwner();

  const service = new ArtefactService(new ArtefactRepository());
  const artefacts = await service.list(owner.id);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage your CVs, cover letters, research, presentations, and other
          career artefacts.
        </p>
      </div>

      <ArtefactLibrary initialArtefacts={artefacts} />
    </main>
  );
}
