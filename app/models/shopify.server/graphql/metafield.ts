export const GRAPHQL_MUTATION_METAFIELD_SET = `#graphql
  mutation SetMetafield($metafieldsSetInput: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafieldsSetInput) {
      metafields {
        id
        namespace
        key
        value
        definition {
          access {
            admin
            customerAccount
            storefront
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const GRAPHQL_MUTATION_METAFIELD_DEFINITION_CREATE = `#graphql
  mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        namespace
        key
        ownerType
        access {
          admin
          customerAccount
          storefront
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const GRAPHQL_MUTATION_METAFIELD_DEFINITION_UPDATE = `#graphql
  mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition {
        id
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

// # ------------------------------------------------------------------------------- Metafield

export const METAFIELD = {
  type: {
    boolean: "boolean",
    color: "color",
    date: "date",
    date_time: "date_time",
    dimension: "dimension",
    json: "json",
    money: "money",
    multi_line_text_field: "multi_line_text_field",
    number_decimal: "number_decimal",
    number_integer: "number_integer",
    rating: "rating",
    rich_text_field: "rich_text_field",
    single_line_text_field: "single_line_text_field",
    url: "url",
    volume: "volume",
    weight: "weight",
    collection_reference: "collection_reference",
    file_reference: "file_reference",
    metaobject_reference: "metaobject_reference",
    mixed_reference: "mixed_reference",
    page_reference: "page_reference",
    product_reference: "product_reference",
    variant_reference: "variant_reference",
    list: {
      collection_reference: "list.collection_reference",
      color: "list.color",
      date: "list.date",
      date_time: "list.date_time",
      dimension: "list.dimension",
      file_reference: "list.file_reference",
      metaobject_reference: "list.metaobject_reference",
      mixed_reference: "list.mixed_reference",
      number_integer: "list.number_integer",
      number_decimal: "list.number_decimal",
      page_reference: "list.page_reference",
      product_reference: "list.product_reference",
      rating: "list.rating",
      single_line_text_field: "list.single_line_text_field",
      url: "list.url",
      variant_reference: "list.variant_reference",
      volume: "list.volume",
      weight: "list.weight",
    },
  },

  // https://shopify.dev/docs/api/admin-graphql/2024-07/mutations/metafieldDefinitionCreate
  access: {
    admin: {
      MERCHANT_READ: "MERCHANT_READ",
      MERCHANT_READ_WRITE: "MERCHANT_READ_WRITE",
      PRIVATE: "PRIVATE",
      PUBLIC_READ: "PUBLIC_READ",
      PUBLIC_READ_WRITE: "PUBLIC_READ_WRITE",
    },
    customerAccount: {
      NONE: "NONE",
      READ: "READ",
      READ_WRITE: "READ_WRITE",
    },
    storefront: {
      NONE: "NONE",
      PUBLIC_READ: "PUBLIC_READ",
    },
  },
};
