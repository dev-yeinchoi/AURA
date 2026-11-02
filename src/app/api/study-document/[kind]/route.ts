import { createHash } from "node:crypto";
import { getParticipantSession } from "@/lib/participant-session";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { STUDY_DOCUMENT_BUCKET } from "@/lib/study-documents";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const session = await getParticipantSession();
  if (!session || session.phase !== "pilot") return new Response("Not found", { status: 404 });
  const { kind } = await context.params;
  if (kind !== "information" && kind !== "consent") return new Response("Not found", { status: 404 });
  const version = new URL(request.url).searchParams.get("version");
  if (!version) return new Response("Not found", { status: 404 });

  const db = createSupabaseAdmin();
  const { data: document, error } = await db.from("study_documents")
    .select("information_path, consent_path, information_sha256, consent_sha256")
    .eq("version", version).maybeSingle();
  if (error) throw error;
  if (!document) return new Response("Not found", { status: 404 });
  const path = kind === "information" ? document.information_path : document.consent_path;
  const expected = kind === "information" ? document.information_sha256 : document.consent_sha256;
  const { data: file, error: downloadError } = await db.storage.from(STUDY_DOCUMENT_BUCKET).download(path);
  if (downloadError || !file) return new Response("Document unavailable", { status: 503 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    console.error("Study document hash mismatch", { version, kind });
    return new Response("Document unavailable", { status: 503 });
  }
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${kind}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
