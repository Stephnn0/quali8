import { ButtonGroup, Button, Card } from "@shopify/polaris";
import { useCallback, useState } from "react";

export function OperatorQualifier() {
  const [activeButtonIndex, setActiveButtonIndex] = useState(0);

  const handleButtonClick = useCallback(
    (index: number) => {
      if (activeButtonIndex === index) return;
      setActiveButtonIndex(index);
    },
    [activeButtonIndex],
  );

  return (
    <Card>
      <ButtonGroup variant="segmented">
        <Button
          pressed={activeButtonIndex === 0}
          onClick={() => handleButtonClick(0)}
        >
          All
        </Button>
        <Button
          pressed={activeButtonIndex === 1}
          onClick={() => handleButtonClick(1)}
        >
          Any
        </Button>
      </ButtonGroup>
    </Card>
  );
}
