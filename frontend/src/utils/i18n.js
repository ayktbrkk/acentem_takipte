import { translateText as translateCatalogText } from "@/generated/translations";

export function translateText(source, locale = "en") {
  return translateCatalogText(source, locale);
}

