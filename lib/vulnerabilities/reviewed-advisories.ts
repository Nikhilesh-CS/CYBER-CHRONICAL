import type { VulnerabilityEvidence } from "../models.ts";

/** Vendor assessments retained with their source when structured CVE records are incomplete. */
export const REVIEWED_ADVISORIES: Readonly<Partial<Record<string, VulnerabilityEvidence>>> = {
  "CVE-2026-129975": {
    id: "CVE-2026-129975",
    vendorUrl: "https://lists.gnupg.org/pipermail/gnupg-announce/2026q4/000517.html",
    severity: "Critical",
    affected: ["GPGME releases before the corrected public release 2.3.1"],
    action: "Update GPGME to 2.3.1. Rebuild applications that statically link GPGME against the corrected release.",
  },
};
