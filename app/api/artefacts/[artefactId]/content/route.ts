import { ArtefactRepository } from "@/lib/repositories/artefact-repository";
import { ArtefactService } from "@/lib/services/artefact-service";
import { CurrentOwnerError, getCurrentOwner } from "@/lib/auth/current-owner";
import { errorToResponse } from "@/lib/domain/errors";

type RouteContext = {
  params: Promise<{
    artefactId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const owner = await getCurrentOwner();
    const { artefactId } = await params;

    const service = new ArtefactService(new ArtefactRepository());
    const content = await service.download(owner.id, artefactId);

    const body = new ArrayBuffer(content.content.byteLength);
    new Uint8Array(body).set(content.content);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": content.metadata.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${content.metadata.name}"`,
      },
    });
  } catch (error) {
    if (error instanceof CurrentOwnerError) {
      return errorToResponse(error);
    }

    return errorToResponse(error);
  }
}
