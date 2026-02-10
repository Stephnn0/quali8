
export const typeProductOptions = [
    { label: "Select a condition", value: "" }, // ⬅️ default placeholder
    { label: "Product Title", value: "product_title" },
    { label: "Product Id", value: "product_id" },
    { label: "Product SKU", value: "product_sku" },
    { label: "Collection", value: "collection" },
    // { label: "Cart has X amount of items from Y product", value: "cart_has_x_amount_of_items_from_y_product" },

];


export const comparisonTypeProductOptions = [
    { label: "Select a value type", value: "" }, // ⬅️ default placeholder
    { label: "is equal to", value: "equals" },
    { label: "is not equal to", value: "not_equals" },
];


export const comparisonTypeMapProduct: Record<
    string,
    { label: string; value: string }[]
> = {

    product_title: [{ label: "is equal to", value: "equals" }],
    product_id: [{ label: "is equal to", value: "equals" }],
    product_sku: [{ label: "is equal to", value: "equals" }],
    collection: [{ label: "is equal to", value: "equals" }],
    // cart_has_x_amount_of_items_from_y_product: [{ label: "is equal to", value: "equals" }],
};
