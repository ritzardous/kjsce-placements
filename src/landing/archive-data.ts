/** Public examples verified against the checked-in 2025/2026 source datasets.
 * Routes retain source-specific keys; no private records are requested by the landing page. */
export const archiveCompanies = [
  {
    "id": "jpmc",
    "name": "JPMorgan Chase & Co.",
    "short": "JPMorgan",
    "logo": "/company-logos/jpmorgan.svg",
    "routes": {
      "2025": "jpmc",
      "2026": "jp_morgan_chase_co"
    }
  },
  {
    "id": "ion",
    "name": "ION",
    "short": "ION",
    "logo": "/company-logos/ion.png",
    "routes": {
      "2025": "ion",
      "2026": "ion_group"
    }
  },
  {
    "id": "edra",
    "name": "EDRA Labs",
    "short": "EDRA Labs",
    "logo": "/company-logos/edra.jpg",
    "routes": {
      "2025": "edra-labs",
      "2026": "edra_labs_llp"
    }
  },
  {
    "id": "browserstack",
    "name": "Browserstack",
    "short": "Browserstack",
    "logo": "/company-logos/browserstack.png",
    "routes": {
      "2025": "browserstack",
      "2026": "browserstack_software_pvt_ltd"
    }
  },
  {
    "id": "eventstrat",
    "name": "Eventstrat Labs",
    "short": "Eventstrat",
    "logo": "/company-logos/eventstrat.png",
    "routes": {
      "2025": "eventstrat-labsprivatelimited"
    }
  }
] satisfies {
  id: string;
  name: string;
  short: string;
  logo: string;
  routes: Partial<Record<number, string>>;
}[];
/** Hero brands are separate from the package previews and alumni examples. */
export const heroCompanies = [
  archiveCompanies[0],
  { id:'barclays', name:'Barclays', short:'Barclays', logo:'/company-logos/barclays.png', routes:{2025:'barclays',2026:'barclays'} },
  { id:'deloitte', name:'Deloitte India', short:'Deloitte', logo:'/company-logos/deloitte.png', routes:{2025:'deloitte-india',2026:'deloitte_india'} },
  { id:'oracle', name:'Oracle', short:'Oracle', logo:'/company-logos/oracle.png', routes:{2025:'oracle',2026:'oracle'} },
  { id:'capgemini', name:'Capgemini', short:'Capgemini', logo:'/company-logos/capgemini.png', routes:{2025:'capgemini',2026:'capgemini'} },
];
export type ArchiveCompany = (typeof archiveCompanies)[number];
export function companyYears(company: ArchiveCompany) {
  return Object.keys(company.routes).map(Number).sort();
}
export function companyRoute(company: ArchiveCompany, year: number) {
  return `#${year}/company/${encodeURIComponent((company.routes as Partial<Record<number, string>>)[year] || "")}`;
}

/** Maintainer-selected on-campus source records for the public preview.
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

  "2025": [
    {
      "key": "browserstack",
      "name": "Browserstack",
      "logo": "/company-logos/browserstack.png",
      "placementId": "Y25-0004",
      "role": "Role not provided",
      "ctc": "22.00 LPA"
    },
    {
      "key": "jpmc",
      "name": "JPMorgan Chase & Co.",
      "logo": "/company-logos/jpmorgan.svg",
      "placementId": "Y25-0005",
      "role": "Software Engineer",
      "ctc": "19.75 LPA"
    },
    {
      "key": "eventstrat-labsprivatelimited",
      "name": "Eventstrat Labs",
      "logo": "/company-logos/eventstrat.png",
      "placementId": "Y25-0007",
      "role": "Software Development Engineer",
      "ctc": "18 LPA"
    }
  ],
  "2026": [
    {
      "key": "jp_morgan_chase_co",
      "name": "JPMorgan Chase & Co.",
      "logo": "/company-logos/jpmorgan.svg",
      "placementId": "PL006",
      "role": "Software Engineer",
      "ctc": "19.75 LPA"
    },
    {
      "key": "ion_group",
      "name": "ION",
      "logo": "/company-logos/ion.png",
      "placementId": "PL042",
      "role": "Technical Analyst - Client Services",
      "ctc": "17.30 LPA"
    },
    {
      "key": "edra_labs_llp",
      "name": "EDRA Labs",
      "logo": "/company-logos/edra.jpg",
      "placementId": "PL074",
      "role": "Software Engineer",
      "ctc": "16.50 LPA"
    }
  ]
};
