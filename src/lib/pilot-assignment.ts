import "server-only";

import { createHash, randomInt } from "node:crypto";
import stimuli from "@/content/stimuli-v2.json";
import { sequences, type Authority, type Explanation } from "@/lib/experiment";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

const sequenceCodes = ["A-L_B-H", "B-L_A-H", "A-H_B-L", "B-H_A-L"] as const;
const authorities: Authority[] = ["low", "high"];
const explanations: Explanation[] = ["none", "fi", "case"];

export async function getPilotAssignment(participantId: string) {
  const db = createSupabaseAdmin();
  async function ensureRounds(sequence: number) {
    const rounds = sequences[sequence].map((round, index) => ({
      participant_id: participantId, round_no: index + 1,
      risk_level: round.risk, form_code: round.form,
    }));
    const { error } = await db.from("rounds").upsert(rounds,
      { onConflict: "participant_id,round_no", ignoreDuplicates: true });
    if (error) throw error;
  }
  const { data: existing, error: existingError } = await db.from("assignments")
    .select("authority_cue, explanation_type, sequence_code")
    .eq("participant_id", participantId).maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const sequence = sequenceCodes.indexOf(existing.sequence_code as typeof sequenceCodes[number]);
    if (sequence < 0) throw new Error("알 수 없는 라운드 순서입니다.");
    await ensureRounds(sequence);
    return {
      authority: existing.authority_cue as Authority,
      explanation: existing.explanation_type as Explanation,
      sequence,
    };
  }

  const payload = JSON.parse(JSON.stringify(stimuli));
  const sha256 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const { error: stimulusError } = await db.from("stimulus_sets").upsert({
    version: stimuli.version, sha256, payload,
  }, { onConflict: "version", ignoreDuplicates: true });
  if (stimulusError) throw stimulusError;

  const { data: assigned, error: countError } = await db.from("assignments")
    .select("authority_cue, explanation_type, sequence_code");
  if (countError) throw countError;
  const cells = authorities.flatMap(authority => explanations.flatMap(explanation =>
    sequenceCodes.map((sequenceCode, sequence) => ({
      authority, explanation, sequence, sequenceCode,
      count: (assigned ?? []).filter(row => row.authority_cue === authority &&
        row.explanation_type === explanation && row.sequence_code === sequenceCode).length,
    }))));
  const minimum = Math.min(...cells.map(cell => cell.count));
  const choices = cells.filter(cell => cell.count === minimum);
  const choice = choices[randomInt(choices.length)];
  const { error: assignmentError } = await db.from("assignments").insert({
    participant_id: participantId,
    authority_cue: choice.authority,
    explanation_type: choice.explanation,
    sequence_code: choice.sequenceCode,
    stimulus_version: stimuli.version,
  });
  if (assignmentError && assignmentError.code !== "23505") throw assignmentError;
  if (assignmentError) return getPilotAssignment(participantId);
  await ensureRounds(choice.sequence);
  return { authority: choice.authority, explanation: choice.explanation, sequence: choice.sequence };
}
