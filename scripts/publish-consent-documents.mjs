import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error(".env.local에 Supabase URL과 서버 전용 키가 필요합니다.");

const base = join(process.cwd(), "data", "private", "documents");
const files = [
  ["information", "participant-information.pdf"],
  ["consent", "written-consent.pdf"],
];
const documents = await Promise.all(files.map(async ([kind, filename]) => {
  const bytes = await readFile(join(base, filename));
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error(`${filename}: PDF 파일이 아닙니다.`);
  return { kind, bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
}));
const version = `sha256-${createHash("sha256").update(documents.map(d => d.sha256).join(":"))
  .digest("hex").slice(0, 16)}`;
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

for (const document of documents) {
  const path = `${version}/${document.kind}.pdf`;
  const { error } = await db.storage.from("study-documents").upload(path, document.bytes, {
    contentType: "application/pdf", upsert: false,
  });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`${document.kind} 업로드 실패: ${error.message}`);
  }
  const { data: stored, error: readError } = await db.storage.from("study-documents").download(path);
  if (readError || !stored) throw new Error(`${document.kind} 업로드 검증 실패`);
  const storedHash = createHash("sha256").update(Buffer.from(await stored.arrayBuffer())).digest("hex");
  if (storedHash !== document.sha256) throw new Error(`${document.kind} 저장 파일의 해시가 일치하지 않습니다.`);
}

const { error } = await db.rpc("activate_study_documents", {
  p_version: version,
  p_information_path: `${version}/information.pdf`,
  p_consent_path: `${version}/consent.pdf`,
  p_information_sha256: documents[0].sha256,
  p_consent_sha256: documents[1].sha256,
});
if (error) throw new Error(`문서 활성화 실패: ${error.message}`);
process.stdout.write(`온라인 동의 문서 등록 완료: ${version}\n`);
process.stdout.write("참가자는 이 버전의 PDF를 확인하고 화면에서 동의할 수 있습니다.\n");
