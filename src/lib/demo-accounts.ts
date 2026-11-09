import type {Authority, Explanation} from "./experiment";

export const demoAccounts: Record<string, {group:string; authority:Authority; explanation:Explanation}> = {
  "DM-001": {group:"G1",authority:"low",explanation:"none"},
  "DM-002": {group:"G2",authority:"low",explanation:"fi"},
  "DM-003": {group:"G3",authority:"low",explanation:"case"},
  "DM-004": {group:"G4",authority:"high",explanation:"none"},
  "DM-005": {group:"G5",authority:"high",explanation:"fi"},
  "DM-006": {group:"G6",authority:"high",explanation:"case"},
};
