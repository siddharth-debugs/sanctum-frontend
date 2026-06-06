import type { SelectOption } from "@/components/fields";
import type { ClientSource, RelationshipHealth } from "@/lib/api/types";

/** Industries offered in the client form (value === label; free-form on backend). */
export const INDUSTRY_OPTIONS: SelectOption[] = [
  "Advertising & Marketing",
  "E-commerce",
  "SaaS / Software",
  "Healthcare",
  "Real Estate",
  "Food & Beverage",
  "Fashion & Apparel",
  "Fitness & Wellness",
  "Education",
  "Finance",
  "Travel & Hospitality",
  "Other",
].map((v) => ({ label: v, value: v }));

export const PHONE_CC_OPTIONS: SelectOption[] = [
  { label: "+91", value: "+91" },
  { label: "+1", value: "+1" },
  { label: "+44", value: "+44" },
  { label: "+61", value: "+61" },
  { label: "+971", value: "+971" },
  { label: "+65", value: "+65" },
];

export const CLIENT_SOURCE_OPTIONS: SelectOption[] = [
  { label: "Referral", value: "referral" },
  { label: "Inbound", value: "inbound" },
  { label: "Outbound", value: "outbound" },
  { label: "Social", value: "social" },
  { label: "Event", value: "event" },
  { label: "Agency Network", value: "agency_network" },
  { label: "Other", value: "other" },
];

export const CLIENT_SOURCE_LABEL: Record<ClientSource, string> = {
  referral: "Referral",
  inbound: "Inbound",
  outbound: "Outbound",
  social: "Social",
  event: "Event",
  agency_network: "Agency Network",
  other: "Other",
};

export const RELATIONSHIP_HEALTH_OPTIONS: SelectOption[] = [
  { label: "Excellent", value: "excellent" },
  { label: "Good", value: "good" },
  { label: "At risk", value: "at_risk" },
  { label: "Poor", value: "poor" },
];

export const RELATIONSHIP_HEALTH_LABEL: Record<RelationshipHealth, string> = {
  excellent: "Excellent",
  good: "Good",
  at_risk: "At risk",
  poor: "Poor",
};

/** Indian states + union territories for the billing state picker. */
export const INDIAN_STATE_OPTIONS: SelectOption[] = [
  // States
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
].map((v) => ({ label: v, value: v }));
