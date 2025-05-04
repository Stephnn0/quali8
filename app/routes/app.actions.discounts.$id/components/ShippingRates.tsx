import {
  Banner,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  Layout,
  OptionList,
  Popover,
  Text,
} from "@shopify/polaris";
import { useCallback, useEffect, useState } from "react";
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
  const { fields } = form;

  const { shippingRateType, shippingRatesNames } = fields;

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

  const [selected, setSelected] = useState<string[]>(
    shippingRatesNames.value || [],
  );
  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const handleSelectionChange = (selectedValues: string[]) => {
    setSelected(selectedValues);
  };

  useEffect(() => {
    if (operator === ShippingRatesType.SELECTED_RATES) {
      shippingRatesNames.value = selected;
    }
  }, [selected, operator, shippingRatesNames]);

  const ratesToDisplay = selected.map((selected, index) => (
    <div
      key={index}
      style={{
        marginTop: "10px",
        padding: "0.5rem 1rem",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      {selected}
    </div>
  ));

  return (
    <Layout>
      <Layout.Section>
        <InlineStack wrap={false}>
          <ButtonGroup variant="segmented">
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
          </ButtonGroup>
        </InlineStack>
      </Layout.Section>

      <Layout.Section>
        {operator === ShippingRatesType.ALL_RATES ? (
          <Card>
            <Text variant="bodyMd" as="p" fontWeight="bold">
              Shipping Rate Selector
            </Text>
            <br />
            <Text variant="bodyMd" as="p">
              All shipping rates will be discounted.
            </Text>
          </Card>
        ) : (
          <Card>
            <Text variant="bodyMd" as="p" fontWeight="bold">
              Shipping Rate Selector
            </Text>
            <br />
            <Text variant="bodyMd" as="p">
              Choose the shipping rates that you would like to be discounted.
            </Text>
            <br />

            <Popover
              active={popoverActive}
              activator={
                <Button onClick={togglePopoverActive}>
                  Click to select one or more shipping rates
                </Button>
              }
              onClose={togglePopoverActive}
              fullWidth
            >
              <OptionList
                title=""
                onChange={handleSelectionChange}
                options={rateNames.map((rate: any) => ({
                  label: rate.name,
                  value: rate.name,
                }))}
                selected={selected}
                allowMultiple
              />
            </Popover>
            {ratesToDisplay}
          </Card>
        )}
      </Layout.Section>
      <Layout.Section>
        {operator === ShippingRatesType.SELECTED_RATES && (
          <Banner>
            <p>
              When applying discounts on specific shipping rates, make sure they
              have a unique name to avoid conflicts with other discounts.
            </p>
          </Banner>
        )}
      </Layout.Section>
    </Layout>
  );
}
