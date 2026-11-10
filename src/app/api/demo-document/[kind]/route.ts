import { createHash } from "node:crypto";
import { demoAccounts } from "@/lib/demo-accounts";
import { getActiveStudyDocuments, STUDY_DOCUMENT_BUCKET } from "@/lib/study-documents";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  const account = new URL(request.url).searchParams.get("account");
  if ((kind !== "information" && kind !== "consent") ||
      (account !== "free" && (!account || !Object.hasOwn(demoAccounts, account)))) {
    return new Response("Not found", { status: 404 });
  }

  const document = await getActiveStudyDocuments();
  if (!document) return new Response("Document unavailable", { status: 503 });
  const path = kind === "information" ? document.information_path : document.consent_path;
  const expected = kind === "information" ? document.information_sha256 : document.consent_sha256;
  const { data: file, error } = await createSupabaseAdmin().storage
    .from(STUDY_DOCUMENT_BUCKET).download(path);
  if (error || !file) return new Response("Document unavailable", { status: 503 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    console.error("Demo document hash mismatch", { version: document.version, kind });
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
