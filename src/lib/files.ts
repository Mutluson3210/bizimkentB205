const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

export function isImageFile(filenameOrPath: string): boolean {
  const lower = filenameOrPath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** "uuid-orijinal-ad.jpg" -> "orijinal-ad.jpg" (UUID-ek'i gizlemek için) */
export function stripUuidPrefix(path: string): string {
  return path.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}
