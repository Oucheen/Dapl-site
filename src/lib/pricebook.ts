import rawPricebook from "@/data/pricebook.json";

export type PricebookEntry = {
  id: string;
  category: string;
  subcategory: string;
  name: string;
  description: string;
  price: string;
};

export const pricebookEntries: PricebookEntry[] = rawPricebook.map((entry, index) => ({
  id: entry.uuid || `pricebook-${index}`,
  category: entry.category || "Other",
  subcategory: entry.subcategory_1 || "",
  name: entry.name || "Unnamed pricebook item",
  description: entry.description || "",
  price: entry.price || "$0.00",
}));
