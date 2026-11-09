/** Public examples verified against the checked-in 2025/2026 source datasets.
 * Routes retain source-specific keys; no private records are requested by the landing page. */
export const archiveCompanies = [
  {
    id: "google",
    name: "Google",
    short: "Google",
    logo: "/company-logos/google.png",
    routes: { 2025: "google", 2026: "google" },
  },
  {
    id: "jpmc",
    name: "JPMorgan Chase & Co.",
    short: "JPMorgan",
    logo: "/company-logos/jpmorgan.svg",
    routes: { 2026: "jp_morgan_chase_co" },
  },
  {
    id: "barclays",
    name: "Barclays",
    short: "Barclays",
    logo: "/company-logos/barclays.png",
    routes: { 2025: "barclays", 2026: "barclays" },
  },
  {
    id: "amazon",
    name: "Amazon India",
    short: "Amazon",
    logo: "/company-logos/amazon.png",
    routes: { 2025: "amazon-india" },
  },
  {
    id: "deloitte",
    name: "Deloitte India",
    short: "Deloitte",
    logo: "/company-logos/deloitte.png",
    routes: { 2025: "deloitte-india", 2026: "deloitte_india" },
  },
] satisfies {
  id: string;
  name: string;
  short: string;
  logo: string;
  routes: Partial<Record<number, string>>;
}[];
export type ArchiveCompany = (typeof archiveCompanies)[number];
export function companyYears(company: ArchiveCompany) {
  return Object.keys(company.routes).map(Number).sort();
}
export function companyRoute(company: ArchiveCompany, year: number) {
  return `#${year}/company/${encodeURIComponent((company.routes as Partial<Record<number, string>>)[year] || "")}`;
}

/** Individual source announcements (2025: highest reported CTC per company) for the records preview.
 * Reported roles/CTC map to the cited record. roleInference marks public-preview
 * estimates where the placement source has no role; base datasets stay unchanged. */
export const recordPreviews: Record<
  number,
  {
    key: string;
    name: string;
    logo: string;
    placementId: string;
    role: string;
    ctc: string;
    roleInference?: { url: string; title: string; note: string };
  }[]
> = {
  2025: [
    {
      key: "google",
      name: "Google",
      logo: "/company-logos/google.png",
      placementId: "Y25-0001",
      role: "Software Engineer",
      ctc: "51.72 LPA",
    },
    {
      key: "goldman-sachs",
      name: "Goldman Sachs",
      logo: "/company-logos/goldman-sachs.png",
      placementId: "Y25-0002",
      role: "Software Engineer",
      ctc: "30 LPA",
      roleInference: {
        url: "https://www.goldmansachs.com/careers/materials/india-echp-faqs.pdf",
        title: "Goldman Sachs 2025 Engineering Analyst hiring FAQ",
        note: "The 2025 program describes a software-engineer role. This does not verify the role for this individual off-campus placement.",
      },
    },
    {
      key: "crackeddevs",
      name: "CrackedDevs",
      logo: "/company-logos/crackeddevs.png",
      placementId: "Y25-0003",
      role: "Software Developer",
      ctc: "24.16 LPA",
      roleInference: {
        url: "https://cdn.isujith.dev/Sujith_Resume.pdf",
        title: "First-person CrackedDevs software-engineer work history",
        note: "A public first-person resume lists Software Engineer at CrackedDevs in 2025. It is a role-family example, not verification of the KJSCE placement.",
      },
    },
  ],
  2026: [
    {
      key: "google",
      name: "Google",
      logo: "/company-logos/google.png",
      placementId: "PL018",
      role: "Software Engineer",
      ctc: "54.88 LPA",
    },
    {
      key: "jp_morgan_chase_co",
      name: "JPMorgan",
      logo: "/company-logos/jpmorgan.svg",
      placementId: "PL006",
      role: "Software Engineer",
      ctc: "19.75 LPA",
    },
    {
      key: "barclays",
      name: "Barclays",
      logo: "/company-logos/barclays.png",
      placementId: "PL002",
      role: "Graduate Technology Trainee",
      ctc: "13.50 LPA",
    },
  ],
};
