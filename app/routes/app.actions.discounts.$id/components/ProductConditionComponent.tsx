import { Select } from "@shopify/polaris";
import { useState } from "react";
import { comparisonTypeMapProduct, comparisonTypeProductOptions, typeProductOptions } from "./ProductConditions";

export type Condition = {
    type: string;
    comparisonType: string;
};

export function ProductConditionsComponent() {
    const [conditions, setConditions] = useState<Condition[]>([
        { type: "", comparisonType: "" },
    ]);

    const addCondition = () => {
        setConditions((prev) => [
            ...prev,
            { type: "", comparisonType: "" },
        ]);
    };

    const removeCondition = (index: number) => {
        setConditions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleChange = (
        index: number,
        field: keyof Condition,
        value: string,
    ) => {
        const updated = [...conditions];
        updated[index][field] = value;

        // auto-set comparison when type changes
        if (field === "type") {
            const comparisons = comparisonTypeMapProduct[value] || [];
            updated[index].comparisonType = comparisons[0]?.value || "";
        }

        setConditions(updated);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {conditions.map((condition, index) => (
                <div
                    key={index}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                    <Select
                        label="Condition"
                        labelHidden
                        options={typeProductOptions}
                        value={condition.type}
                        onChange={(value) => handleChange(index, "type", value)}
                    />

                    <Select
                        label="Comparison"
                        labelHidden
                        options={
                            condition.type
                                ? comparisonTypeMapProduct[condition.type]
                                : comparisonTypeProductOptions
                        }
                        value={condition.comparisonType}
                        onChange={(value) =>
                            handleChange(index, "comparisonType", value)
                        }
                    />

                    <button onClick={() => removeCondition(index)}>✕</button>
                </div>
            ))}

            <button onClick={addCondition}>Add condition</button>
        </div>
    );
}
