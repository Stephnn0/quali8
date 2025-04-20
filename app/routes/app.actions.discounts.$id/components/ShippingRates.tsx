import {
  Button,
  Card,
  IndexTable,
  Layout,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import type { DiscountForm } from "../hooks";

type PickShippingRatesProps = {
  shippingRates: any;
  form: DiscountForm;
};

enum ShippingRatesType {
  ALL_RATES = "ALL_RATES",
  SELECTED_RATES = "SELECTED_RATES",
}

export function ShippingRates({ shippingRates, form }: PickShippingRatesProps) {
  console.log("ShippingRates", shippingRates);
  const { fields } = form;

  const { shippingRateType, shippingRatesIds } = fields;

  const [operator, setOperator] = useState<
    ShippingRatesType.ALL_RATES | ShippingRatesType.SELECTED_RATES
  >(ShippingRatesType.ALL_RATES);

  const handleOperatorChange = (
    selectedOperator:
      | ShippingRatesType.ALL_RATES
      | ShippingRatesType.SELECTED_RATES,
  ) => {
    setOperator(selectedOperator);
    shippingRateType.value = selectedOperator;
  };

  const rateNames = shippingRates.map((rate: any, index: any) => ({
    id: rate.id,
    name: rate.name,
  }));

  const resourceName = {
    singular: "rate",
    plural: "rates",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(rateNames);

  useEffect(() => {
    if (operator === ShippingRatesType.SELECTED_RATES) {
      shippingRatesIds.value = selectedResources;
    }
  }, [selectedResources, operator, shippingRatesIds]);

  const rowMarkup = rateNames?.map(({ id, name }: any, index: any) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {name}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Layout>
      <Layout.Section>
        {/* Toggle Buttons for AND/OR */}
        <div style={{ display: "flex", gap: "10px" }}>
          <Button
            disabled={operator === ShippingRatesType.ALL_RATES}
            onClick={() => handleOperatorChange(ShippingRatesType.ALL_RATES)}
          >
            All Rates
          </Button>

          <Button
            disabled={operator === ShippingRatesType.SELECTED_RATES}
            onClick={() =>
              handleOperatorChange(ShippingRatesType.SELECTED_RATES)
            }
          >
            Custom Rates
          </Button>
        </div>
      </Layout.Section>

      <Layout.Section>
        {operator === ShippingRatesType.ALL_RATES ? (
          <Card>
            <Text variant="bodyMd" as="p">
              All shipping rates will be applied.
            </Text>
          </Card>
        ) : (
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={rateNames?.length || 0}
              selectedItemsCount={
                allResourcesSelected ? "All" : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              headings={[{ title: "Name" }]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        )}
      </Layout.Section>
    </Layout>
  );
}
