import rawPricebook from "@/data/pricebook.json";

export type PricebookEntry = {
  id: string;
  category: string;
  subcategory: string;
  brandGroup: string;
  name: string;
  description: string;
  price: string;
};

function cleanValue(value: string) {
  return value
    .replace(/^"+|"+$/g, "")
    .replace(/\bWhirpool\b/g, "Whirlpool")
    .replace(/\bELECTROLUX\b/g, "Electrolux")
    .trim();
}

export const pricebookEntries: PricebookEntry[] = rawPricebook.map((entry, index) => ({
  id: entry.uuid || `pricebook-${index}`,
  category: cleanValue(entry.category || "Other"),
  subcategory: cleanValue(entry.subcategory_1 || ""),
  brandGroup: cleanValue(entry.subcategory_2 || ""),
  name: cleanValue(entry.name || "Unnamed pricebook item"),
  description: cleanValue(entry.description || ""),
  price: cleanValue(entry.price || "$0.00"),
}));
