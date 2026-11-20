/** UI-level shared shapes. Simulation entities live with the simulation engine. */

export type Language = "zh" | "en";

/** Display state of the caller's saving access. */
export type ApprovalDisplayStatus =
  | "signedOut"
  | "loading"
  | "admin"
  | "approved"
  | "notApproved"
  | "requested";

/** Sidebar tab identifiers on the lab route. */
export type LabTab = "inspector" | "dashboard" | "environment" | "experiment";

export interface NavItem {
  to: "/" | "/experiments" | "/compare" | "/admin";
  labelKey: "nav.lab" | "nav.experiments" | "nav.compare" | "nav.admin";
  ocid: string;
  adminOnly?: boolean;
}
