import { describe, expect, it } from "vitest";
import {
  extractAdaParsel,
  extractCandidateNames,
  extractPlates,
  extractSignals,
  extractTckns,
  isValidTckn,
  normalizePlate,
} from "../src/extractors/index.js";

/** Algoritmik olarak geçerli örnek TCKN */
const VALID_TCKN = "10000000146";

describe("extractPlates", () => {
  it("boşluklu plakayı süzer", () => {
    expect(extractPlates("HAVALE 34 ABC 123 KAPORA")).toEqual(["34ABC123"]);
  });

  it("bitişik plakayı normalize eder", () => {
    expect(normalizePlate("06-ab-1234")).toBe("06AB1234");
    expect(extractPlates("ODEME PLAKA:06AB1234")).toContain("06AB1234");
  });
});

describe("extractAdaParsel", () => {
  it("etiketli ada/parsel yakalar", () => {
    const hits = extractAdaParsel("Tapu bedeli Ada:120 Parsel:5 EFT");
    expect(hits).toEqual([
      expect.objectContaining({ ada: "120", parsel: "5", raw: expect.any(String) }),
    ]);
  });

  it("slash biçimini yakalar", () => {
    const hits = extractAdaParsel("Gelen havale 45/12 icin");
    expect(hits.some((h) => h.ada === "45" && h.parsel === "12")).toBe(true);
  });
});

describe("extractTckns", () => {
  it("geçerli TCKN doğrular", () => {
    expect(isValidTckn(VALID_TCKN)).toBe(true);
    expect(isValidTckn("11111111111")).toBe(false);
  });

  it("açıklamadaki TCKN'yi süzar", () => {
    expect(extractTckns(`GONDEREN TCKN ${VALID_TCKN} EFT`)).toEqual([
      VALID_TCKN,
    ]);
  });
});

describe("extractCandidateNames", () => {
  it("GONDEREN etiketinden ad çıkarır", () => {
    const names = extractCandidateNames("GONDEREN: AHMET YILMAZ EFT HAVALE");
    expect(names.some((n) => n.includes("AHMET") && n.includes("YILMAZ"))).toBe(
      true,
    );
  });
});

describe("extractSignals", () => {
  it("tüm sinyalleri birleştirir", () => {
    const signals = extractSignals(
      `GONDEREN: MEHMET DEMIR PLAKA 34 ABC 123 ADA 10 PARSEL 2 TCKN ${VALID_TCKN}`,
    );
    expect(signals.plates).toContain("34ABC123");
    expect(signals.adaParsel[0]).toMatchObject({ ada: "10", parsel: "2" });
    expect(signals.tckns).toContain(VALID_TCKN);
    expect(signals.candidateNames.length).toBeGreaterThan(0);
  });
});
