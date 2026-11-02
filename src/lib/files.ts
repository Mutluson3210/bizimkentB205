const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

export function isImageFile(filenameOrPath: string): boolean {
  const lower = filenameOrPath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const TURKISH_CHAR_MAP: Record<string, string> = {
  ş: "s", Ş: "S",
  ç: "c", Ç: "C",
  ğ: "g", Ğ: "G",
  ı: "i", İ: "I",
  ö: "o", Ö: "O",
  ü: "u", Ü: "U",
};

/**
 * Supabase Storage'ın object "key"i yalnızca belirli ASCII karakterlerine
 * izin veriyor (\w, boşluk ve birkaç noktalama) — Türkçe karakterler
 * içeren bir dosya adı doğrudan storage key olarak kullanılırsa
 * "Invalid key" hatasıyla reddediliyor. Bu yüzden belgeler ve duyuru
 * ekleri gibi dosya ADININ storage key olarak kullanıldığı yerlerde,
 * yüklemeden önce bu fonksiyonla ASCII'ye çevrilmesi gerekir.
 */
export function toStorageSafeFilename(filename: string): string {
  const transliterated = filename.replace(/[şŞçÇğĞıİöÖüÜ]/g, (c) => TURKISH_CHAR_MAP[c] ?? c);
  return transliterated.replace(/[^\w\-./!*'()\s&$@=;:+,?]/g, "_");
}

/** "uuid-orijinal-ad.jpg" -> "orijinal-ad.jpg" (UUID-ek'i gizlemek için) */
export function stripUuidPrefix(path: string): string {
  return path.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
