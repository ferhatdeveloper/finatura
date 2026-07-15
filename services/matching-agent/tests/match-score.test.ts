import { describe, expect, it } from "vitest";
import { createMatchingAgent } from "../src/matcher.js";
import type { MatchCandidate } from "../src/types.js";

const VALID_TCKN = "10000000146";

describe("MatchingAgent.score / matchTransaction", () => {
  const agent = createMatchingAgent();

  it("plaka + tutar ile yüksek skor üretir", () => {
    const candidate: MatchCandidate = {
      id: "inv-1",
      kind: "invoice",
      plate: "34 ABC 123",
      customerName: "Ahmet Yılmaz",
      amount: 250_000,
      status: "open",
    };

    const result = agent.scoreOne(
      "Gelen EFT 34ABC123 Ahmet Yilmaz araç bedeli",
      candidate,
      250_000,
    );

    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.breakdown.some((b) => b.signal === "plate")).toBe(true);
    expect(result.breakdown.some((b) => b.signal === "amount")).toBe(true);
  });

  it("TCKN eşleşmesini önceliklendirir", () => {
    const candidate: MatchCandidate = {
      id: "ctr-1",
      kind: "contract",
      tckn: VALID_TCKN,
      customerName: "Ayşe Kara",
      amount: 80_000,
      status: "open",
    };

    const hits = agent.matchTransaction(
      {
        id: "tx-1",
        description: `HAVALE TCKN:${VALID_TCKN} kapora`,
        amount: 80_000,
      },
      [candidate],
    );

    expect(hits).toHaveLength(1);
    expect(hits[0].breakdown.some((b) => b.signal === "tckn")).toBe(true);
    expect(hits[0].score).toBeGreaterThanOrEqual(45);
  });

  it("ada/parsel ile emlak sözleşmesini eşleştirir", () => {
    const candidate: MatchCandidate = {
      id: "re-9",
      kind: "contract",
      ada: "120",
      parsel: "5",
      customerName: "Can Öztürk",
      amount: 1_500_000,
      status: "open",
    };

    const result = agent.scoreOne(
      "Tapu peşinati Ada:120 Parsel:5 Can Ozturk",
      candidate,
      1_500_000,
    );

    expect(result.breakdown.some((b) => b.signal === "ada_parsel")).toBe(true);
  });

  it("minScore altında kalan adayları eler", () => {
    const weak: MatchCandidate = {
      id: "inv-weak",
      kind: "invoice",
      customerName: "Bilinmeyen Kişi",
      amount: 10,
      status: "open",
    };

    const hits = agent.matchTransaction(
      {
        id: "tx-2",
        description: "FAST ODEME REF 998877",
        amount: 999_999,
      },
      [weak],
      { minScore: 25 },
    );

    expect(hits).toHaveLength(0);
  });

  // TODO: tenant DB'den açık fatura/sözleşme adaylarını çekip batch eşleştirme
  // TODO: Finteo webhook sonrası otomatik öneri kuyruğu
});
