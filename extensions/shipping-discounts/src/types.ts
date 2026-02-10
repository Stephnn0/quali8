export type Customer = {
  id: string;
  shopifyId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
};

export type ParsedBody = {
  shippingRateType: "ALL_RATES" | "SELECTED_RATES";
  type: "percentage" | "fixed"; // "currency" | "percentage"
  code: string;
  value: string;
  //
  customers: Customer[];
  shippingRatesNames: string[];
  //
  startDate: string; // ISO string date
  startTime: string; // Hour as a string
  hasEndDate: boolean;
  endDate: string; // ISO string date
  endTime: string; // Hour as a string
  //
  appliesToAllCustomers: boolean;
  isMinimumCartValueEnabled: boolean;
  minimumCartValue: number;
};
