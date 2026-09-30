import type { Category } from "./types";

// Ordena categorías con sus subcategorías justo debajo y les pone "Padre › Hija".
export function withFullNames(categories: Category[]) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories
    .map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
      return {
        ...c,
        fullName: parent ? `${parent.name} › ${c.name}` : c.name,
        sortKey: parent ? `${parent.name}\u0000${c.name}` : c.name,
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey, "es"));
}
