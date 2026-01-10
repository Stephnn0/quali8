import React from "react";
import { Billing } from "~/components/BIlling";

const PLANS = [
  {
    name: "Free Plan",
    price: "Free",
    features: [
      "Create customer groups based on their behavior",
    ],
    // badge: "Current plan",
    action: null,
    highlight: false,
  },
  {
    name: "Basic",
    price: "$10/month",
    features: [
      "Unlimited shipping discounts at checkout",
      "Create customer groups based on their behavior",
    ],
    badge: null,
    highlight: true,
  },
];

export default function Settings() {
  return (
    <div>
      <h1 style={{ fontSize: "2rem", fontWeight: "600", margin: "2rem 0", textAlign: "center" }}>
        Plans &amp; Billing
      </h1>
      <div
        style={{
          display: "flex",
          gap: "2rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "2rem",
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            style={{
              boxShadow: "0 1px 5px rgba(13,28,43,0.12)",
              borderRadius: "12px",
              padding: "2rem 2.5rem",
              background: plan.highlight ? "#F3FBF7" : "#fff",
              minWidth: "320px",
              maxWidth: "340px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0 }}>{plan.name}</h3>
              {plan.badge && (
                <span
                  style={{
                    display: "inline-block",
                    background: "#E0F0EC",
                    color: "#008060",
                    borderRadius: "10px",
                    padding: "2px 10px",
                    fontSize: "0.79rem",
                    fontWeight: 500,
                  }}
                >
                  {/* {plan.badge} */}
                </span>
              )}
            </div>
            <div style={{ fontSize: "2.1rem", fontWeight: 700, margin: "5px 0 18px" }}>
              {plan.price}
            </div>
            <ul style={{ paddingLeft: 19, margin: 0, marginBottom: "1.3rem" }}>
              {plan.features.map((feature) => (
                <li key={feature} style={{ marginBottom: "3px" }}>
                  <span style={{ fontSize: "1rem", color: "#232323" }}>{feature}</span>
                </li>
              ))}
            </ul>
           
          </div>
        ))}
      </div>
      <br />
      <div   
        style={{
          display: "flex",
          gap: "2rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "2rem",
        }}>
      <Billing />

      </div>
    </div>
  );
}


// export default function Settings() {
//   return (
//     <Page title="Settings">
//       <Billing />
//     </Page>
//   );
// }
