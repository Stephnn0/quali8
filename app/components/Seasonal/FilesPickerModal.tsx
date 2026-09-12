import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Banner,
  BlockStack,
  InlineStack,
  Modal,
  Spinner,
  Text,
  TextField,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import type { ShopifyFileImage } from "app/routes/api.shopify-files/route";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

/**
 * Picks an image from the store's Files (Content → Files). Requires the
 * read_files scope; explains how to enable it when missing.
 */
export default function FilesPickerModal({ open, onClose, onSelect }: Props) {
  const fetcher = useFetcher<{
    images: ShopifyFileImage[];
    scopeMissing: boolean;
    errors: Array<{ message: string }> | null;
  }>();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(
      () =>
        fetcher.load(
          `/api/shopify-files?search=${encodeURIComponent(search)}`,
        ),
      search ? 400 : 0,
    );
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  const loading = fetcher.state !== "idle";
  const images = fetcher.data?.images ?? [];
  const scopeMissing = fetcher.data?.scopeMissing ?? false;
  const error = fetcher.data?.errors?.[0]?.message ?? null;

  return (
    <Modal open={open} onClose={onClose} title="Choose from your files">
      <Modal.Section>
        <BlockStack gap="400">
          {scopeMissing ? (
            <Banner tone="warning" title="File access isn't enabled yet">
              <p>
                Add the <code>read_files</code> access scope to your app
                configuration and redeploy, then approve the new permission —
                your Shopify Files (Content → Files) will appear here.
              </p>
            </Banner>
          ) : (
            <>
              <TextField
                label="Search files"
                labelHidden
                autoComplete="off"
                prefix={<SearchIcon width={16} />}
                value={search}
                onChange={setSearch}
                placeholder="Search by file name"
                clearButton
                onClearButtonClick={() => setSearch("")}
              />

              {error ? <Banner tone="warning" title={error} /> : null}

              {loading ? (
                <InlineStack align="center">
                  <Spinner size="small" accessibilityLabel="Loading files" />
                </InlineStack>
              ) : images.length === 0 ? (
                <Text as="p" tone="subdued">
                  No images found{search ? ` for “${search}”` : ""}. Upload
                  images in Shopify admin under Content → Files.
                </Text>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(7.5rem, 1fr))",
                    gap: "0.625rem",
                  }}
                >
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => {
                        onSelect(image.url);
                        onClose();
                      }}
                      style={{
                        appearance: "none",
                        border: "1px solid #e3e3e3",
                        borderRadius: "10px",
                        padding: 0,
                        overflow: "hidden",
                        cursor: "pointer",
                        aspectRatio: "1 / 1",
                        background: "#fafafa",
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.alt ?? ""}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
