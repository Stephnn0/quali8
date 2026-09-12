/**
 * Client-safe shapes for a special date and the per-date configs the
 * seasonal features edit. Mirrors what `loadSpecialDateDetail` returns so
 * both the Sales Calendar and the standalone feature pages share one type.
 */

export type SpecialDateSummary = {
  id: number;
  name: string;
  /** ISO yyyy-mm-dd */
  date: string;
  whyItMatters: string | null;
  source: "AI" | "MERCHANT";
};

export type SpecialDateTodoItem = {
  id: number;
  title: string;
  description: string | null;
  kind: "SEO" | "MARKETING" | "GENERAL";
  source: "AI" | "MERCHANT";
  done: boolean;
};

export type SeoAppliedAction = {
  id: number;
  resourceType: string;
  resourceTitle: string;
  newSeoTitle: string;
  createdAt: string;
};

export type AnnouncementBarConfig = {
  enabled: boolean;
  message: string;
  backgroundColor: string;
  textColor: string;
  startDate: string;
  endDate: string;
};

export type PopupConfig = {
  enabled: boolean;
  imageUrl: string;
  heading: string;
  description: string;
  discountCode: string;
  startDate: string;
  endDate: string;
};

export type MenuItemConfig = {
  enabled: boolean;
  menuId: string;
  menuTitle: string;
  itemTitle: string;
  linkType: "COLLECTION" | "URL";
  resourceId: string | null;
  resourceTitle: string | null;
  url: string | null;
  startDate: string;
  endDate: string;
  live: boolean;
  lastError: string | null;
};

export type SpecialDateDetail = {
  specialDate: SpecialDateSummary;
  todos: SpecialDateTodoItem[];
  seoActions: SeoAppliedAction[];
  announcementBar: AnnouncementBarConfig | null;
  popup: PopupConfig | null;
  menuItem: MenuItemConfig | null;
};

/** Result shape every special-date mutation returns to its fetcher. */
export type SpecialDateActionResult = {
  code: string;
  errors: Array<{ message: string }> | null;
};
