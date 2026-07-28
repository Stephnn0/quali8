/**
 * The niche taxonomy the assistant classifies stores into. The AI picks
 * FROM this list (never invents labels); "other" carries the merchant's
 * own words. Client-safe: no server imports.
 */

export const NICHES = [
  { slug: "flowers-gifting", label: "Flowers & gifting" },
  { slug: "fashion-apparel", label: "Fashion & apparel" },
  { slug: "jewelry-accessories", label: "Jewelry & accessories" },
  { slug: "beauty-cosmetics", label: "Beauty & cosmetics" },
  { slug: "food-beverage", label: "Food & beverage" },
  { slug: "coffee-tea", label: "Coffee & tea" },
  { slug: "bakery-sweets", label: "Bakery & sweets" },
  { slug: "pets", label: "Pets" },
  { slug: "home-decor", label: "Home decor" },
  { slug: "furniture", label: "Furniture" },
  { slug: "kitchen-dining", label: "Kitchen & dining" },
  { slug: "electronics-gadgets", label: "Electronics & gadgets" },
  { slug: "toys-games", label: "Toys & games" },
  { slug: "baby-kids", label: "Baby & kids" },
  { slug: "sports-outdoors", label: "Sports & outdoors" },
  { slug: "fitness", label: "Fitness" },
  { slug: "books-stationery", label: "Books & stationery" },
  { slug: "art-prints", label: "Art & prints" },
  { slug: "candles-fragrance", label: "Candles & fragrance" },
  { slug: "health-supplements", label: "Health & supplements" },
  { slug: "plants-garden", label: "Plants & garden" },
  { slug: "party-supplies", label: "Party supplies" },
  { slug: "crafts-diy", label: "Crafts & DIY" },
  { slug: "vintage-collectibles", label: "Vintage & collectibles" },
  { slug: "automotive", label: "Automotive" },
  { slug: "music-instruments", label: "Music & instruments" },
  { slug: "travel-goods", label: "Travel goods" },
  { slug: "eco-zero-waste", label: "Eco & zero-waste" },
  { slug: "other", label: "Other" },
] as const;

export type NicheSlug = (typeof NICHES)[number]["slug"];

export function nicheLabel(slug: string): string {
  return NICHES.find((niche) => niche.slug === slug)?.label ?? slug;
}

export function isNicheSlug(value: string): value is NicheSlug {
  return NICHES.some((niche) => niche.slug === value);
}

/** Deterministic keyword classifier — the no-AI fallback for inference. */
export function classifyByKeywords(text: string): NicheSlug {
  const haystack = text.toLowerCase();
  const rules: Array<[NicheSlug, string[]]> = [
    ["flowers-gifting", ["flower", "bouquet", "florist", "rose", "orchid", "arrangement"]],
    ["coffee-tea", ["coffee", "espresso", "roast", "tea ", "matcha"]],
    ["bakery-sweets", ["bakery", "cake", "cookie", "chocolate", "candy", "pastry"]],
    ["jewelry-accessories", ["jewelry", "necklace", "bracelet", "earring", "ring "]],
    ["beauty-cosmetics", ["skincare", "makeup", "cosmetic", "serum", "lipstick"]],
    ["candles-fragrance", ["candle", "fragrance", "perfume", "scent"]],
    ["pets", ["dog ", "cat ", "pet ", "puppy", "kitten", "leash"]],
    ["plants-garden", ["plant", "succulent", "seed", "garden", "pot "]],
    ["baby-kids", ["baby", "toddler", "nursery", "kids"]],
    ["toys-games", ["toy", "puzzle", "board game", "lego"]],
    ["fitness", ["yoga", "gym", "workout", "fitness", "protein"]],
    ["fashion-apparel", ["shirt", "dress", "hoodie", "jeans", "apparel", "clothing"]],
    ["home-decor", ["decor", "cushion", "vase", "wall art", "rug"]],
    ["electronics-gadgets", ["charger", "headphone", "gadget", "usb", "speaker"]],
    ["books-stationery", ["book", "journal", "notebook", "planner", "stationery"]],
    ["health-supplements", ["vitamin", "supplement", "wellness", "cbd"]],
  ];
  for (const [slug, words] of rules) {
    if (words.some((word) => haystack.includes(word))) return slug;
  }
  return "other";
}
