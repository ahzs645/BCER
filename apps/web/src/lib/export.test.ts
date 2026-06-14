import { describe, expect, it } from "vitest";
import { toCsv, toFilenameStem } from "./export";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("derives headers from the first row and humanizes keys", () => {
    const csv = toCsv([{ wa_num: 123, well_name: "Test" }]);
    expect(csv).toBe("Wa Num,Well Name\r\n123,Test");
  });

  it("applies label overrides for known columns", () => {
    const csv = toCsv([{ wa_num: 1 }], { wa_num: "WA Number" });
    expect(csv.split("\r\n")[0]).toBe("WA Number");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ name: 'A,B', note: 'has "quote"', multi: "a\nb" }]);
    const [, dataRow] = csv.split("\r\n");
    expect(dataRow).toBe('"A,B","has ""quote""","a\nb"');
  });

  it("renders null and undefined as empty fields", () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv.split("\r\n")[1]).toBe(",,0");
  });
});

describe("toFilenameStem", () => {
  it("slugifies labels and trims separators", () => {
    expect(toFilenameStem("Tourmaline Oil Corp.")).toBe("tourmaline-oil-corp");
  });

  it("falls back to a default for empty input", () => {
    expect(toFilenameStem("!!!")).toBe("export");
  });
});
