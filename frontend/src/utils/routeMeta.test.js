import { describe, expect, it } from "vitest";

import { localizeRouteMetaValue, resolveRouteDocumentTitle } from "./routeMeta";

describe("route meta localization", () => {
  it("translates router string titles through the shared i18n layer", () => {
    expect(localizeRouteMetaValue("Acil Erişim Talebi", "en")).toBe("Break-Glass Request");
    expect(localizeRouteMetaValue("Communication Center", "tr")).toBe("İletişim Merkezi");
  });

  it("supports localized object labels used by aux workbench routes", () => {
    expect(localizeRouteMetaValue({ en: "Tasks", tr: "Görevler" }, "tr")).toBe("Görevler");
    expect(localizeRouteMetaValue({ en: "Tasks", tr: "Görevler" }, "en")).toBe("Tasks");
  });

  it("builds a browser title with app suffix", () => {
    expect(resolveRouteDocumentTitle({ meta: { title: "Raporlar" } }, "en")).toBe("Reports | Acentem Takipte");
  });
});