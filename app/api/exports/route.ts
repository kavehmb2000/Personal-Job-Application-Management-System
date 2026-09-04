import { getCurrentOwner } from "@/lib/auth/current-owner";
import { errorToResponse } from "@/lib/domain/errors";
import { ExportService } from "@/lib/services/export-service";

export async function GET() {
  try {
    const owner = await getCurrentOwner();

    const service = new ExportService();
    const result = await service.exportOwner(owner.id);

    const body = new ArrayBuffer(result.content.byteLength);
    new Uint8Array(body).set(result.content);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}
