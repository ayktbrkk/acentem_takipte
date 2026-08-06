import { describe, expect, it } from "vitest";

import { EXPORT_TRANSLATIONS } from "../../../src/config/export_translations";
import { IMPORT_TRANSLATIONS } from "../../../src/config/import_translations";

describe("translation parity", () => {
  const parityCases = [
    { name: "export_translations", map: EXPORT_TRANSLATIONS },
    { name: "import_translations", map: IMPORT_TRANSLATIONS },
  ];

  for (const { name, map } of parityCases) {
    describe(name, () => {
      it("defines exactly the same keys in tr and en", () => {
        const trKeys = Object.keys(map.tr).sort();
        const enKeys = Object.keys(map.en).sort();
        expect(trKeys).toEqual(enKeys);
      });

      it("has no empty or placeholder values", () => {
        for (const locale of ["tr", "en"]) {
          for (const [key, value] of Object.entries(map[locale])) {
            expect(value, `${name}.${locale}.${key}`).toBeTruthy();
          }
        }
      });

      it("keeps interpolation placeholders aligned between locales", () => {
        for (const key of Object.keys(map.tr)) {
          const trPlaceholders = (map.tr[key].match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
          const enPlaceholders = (map.en[key].match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
          expect(trPlaceholders, `${name}.tr.${key}`).toEqual(enPlaceholders);
        }
      });
    });
  }
});
