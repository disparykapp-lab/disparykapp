/** Inisial nama untuk avatar tanpa foto. */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  return ((kata[0]?.[0] ?? "?") + (kata.length > 1 ? kata[kata.length - 1][0] : "")).toUpperCase();
}
