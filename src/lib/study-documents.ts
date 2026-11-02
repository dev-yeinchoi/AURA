import "server-only";

import { createSupabaseAdmin } from "./supabase-admin";

export const STUDY_DOCUMENT_BUCKET = "study-documents";

export async function getActiveStudyDocuments() {
  const { data, error } = await createSupabaseAdmin()
    .from("study_documents")
    .select("version, information_path, consent_path, information_sha256, consent_sha256")
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
