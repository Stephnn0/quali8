import { useNavigate } from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Text,
} from "@shopify/polaris";
import type { SeasonStatus } from "../../route";

type Tile = {
  title: string;
  metric: string;
  active: boolean;
  description: string;
  cta: string;
  to: string;
};

function tiles(status: SeasonStatus): Tile[] {
  return [
    {
      title: "Storefront campaigns",
      metric: status.campaignsScheduled
        ? `${status.campaignsScheduled} scheduled`
        : "None scheduled",
      active: status.campaignsScheduled > 0,
      description:
        "Announcement bars, hero banners, popups, and menu links scheduled from your Sales Calendar.",
      cta: status.campaignsScheduled ? "Manage campaigns" : "Schedule one",
      to: "/app/special-dates",
    },
    {
      title: "SEO & content",
      metric:
        status.seoApplied + status.faqs > 0
          ? `${status.seoApplied} SEO updates · ${status.faqs} FAQs`
          : "Not started",
      active: status.seoApplied + status.faqs > 0,
      description:
        "AI meta titles and descriptions per date, plus collection FAQs with structured data.",
      cta: status.faqs ? "Manage content" : "Boost your SEO",
      to: "/app/faqs",
    },
    {
      title: "Recommendations",
      metric: status.occasions
        ? `${status.occasions} occasions`
        : "Not started",
      active: status.occasions > 0,
      description:
        "Occasion-based product picks shown on product and cart pages by the theme block.",
      cta: status.occasions ? "Manage occasions" : "Curate picks",
      to: "/app/occasions",
    },
    {
      title: "Promotions",
      metric:
        status.promotions + status.bundles > 0
          ? `${status.promotions} discounts · ${status.bundles} bundles`
          : "Not started",
      active: status.promotions + status.bundles > 0,
      description:
        "Shipping discounts and product bundles targeted at your audiences.",
      cta:
        status.promotions + status.bundles > 0
          ? "Manage promotions"
          : "Create a promotion",
      to: "/app/actions",
    },
  ];
}

/** The status grid: where each revenue pillar stands, one click to act. */
export default function StatusGrid({ status }: { status: SeasonStatus }) {
  const navigate = useNavigate();

  return (
    <BlockStack gap="300">
      <Text as="h2" variant="headingMd">
        Your season toolkit
      </Text>
      <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
        {tiles(status).map((tile) => (
          <Card key={tile.title}>
            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  {tile.title}
                </Text>
                <Badge tone={tile.active ? "success" : undefined}>
                  {tile.active ? "Active" : "To do"}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" fontWeight="medium">
                {tile.metric}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {tile.description}
              </Text>
              <div>
                <Button size="slim" onClick={() => navigate(tile.to)}>
                  {tile.cta}
                </Button>
              </div>
            </BlockStack>
          </Card>
        ))}
      </InlineGrid>
    </BlockStack>
  );
}
