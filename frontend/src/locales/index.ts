import { en } from "./en";
import { es } from "./es";

export type Language = "es" | "en";
export type Translation = typeof en;

export function getTranslation(language: Language): Translation {
  return language === "en" ? en : es;
}
