import { MediaCard, Text } from "@shopify/polaris";
import "./styles.css";

interface ComingSoonBlockProps {
  image: string;
  title: string;
  description: string;
}

export default function ComingSoonBlock({
  image,
  title,
  description,
}: ComingSoonBlockProps) {
  return (
    <div className="container">
      <MediaCard
        portrait
        title={
          <Text tone="disabled" variant="headingSm" as="h2">
            {title}
          </Text>
        }
        description={description}
        primaryAction={{
          content: "Coming Soon!",
          onAction: () => {},
          disabled: true,
        }}
      >
        <img width="100%" alt={title} src={image} />
      </MediaCard>
    </div>
  );
}
