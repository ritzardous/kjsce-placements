import type { ReactNode } from "react";

const references = {
  dpdp: "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf",
  commencement:
    "https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf",
  rules:
    "https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa",
  it: "https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf",
  copyright: "https://copyright.gov.in/Copyright_Act_1957/chapter_xi.html",
};
function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function ProjectLegalNotice() {
  return (
    <>
      <div className="note-policy-divider">
        <h2>Legal Notes</h2>
        <p>
          Sources, personal data and conditions of use. Last revised 15 November
          2026.
        </p>
      </div>
      <section id="note-sources" className="note-legal">
        <h2>1. Sources and data limitations</h2>
        <h3>1.1 Independent status and scope</h3>
        <p>
          Placement Stats is an independent student-built project providing
          historical placement information and recruitment experiences. It is
          not an official service, agent or representative of KJSCE, Somaiya
          Vidyavihar University, its Training and Placement Office, any employer
          or LinkedIn. Names, marks and references identify the relevant
          institutions, records or services; they do not imply affiliation,
          approval, sponsorship or endorsement.
        </p>
        <h3>1.2 Source provenance and publication authority</h3>
        <p>
          The compilation draws on official T&amp;PO emails, official placement
          documents published on the college website, and supporting information
          from unofficial web sources. Official records anchor the placement
          statistics. Unofficial material supplies context and does not
          independently establish a confirmed selection, package or campus
          recruitment relationship. Source references identify the material
          used; they are not a certification of authenticity or permission to
          republish.
        </p>
        <p>
          Receipt of an email, inclusion in an institutional document,
          availability on the internet or possession of a profile link does not,
          by itself, establish consent, a licence or another lawful basis for
          every subsequent use. This notice does not establish that every person
          named has authorised republication. Applicable data-protection,
          confidentiality, intellectual-property and other legal requirements
          remain relevant to the underlying processing.
        </p>
        <h3>1.3 Statistical methodology and uncertainty</h3>
        <p>
          Candidate selections, distinct students and institution-reported
          running counters are different measures. Repeat selections may count
          more than once. A placement rate is not calculated without a sourced
          registration denominator. Unknown dates, roles, recruitment routes and
          compensation remain unknown. Numerical compensation statistics exclude
          missing or mixed values where an individual amount cannot be
          established.
        </p>
        <p>
          The 2025 overall compensation calculations are selection-weighted. The
          2026 and 2027 overall calculations are announcement-weighted, while
          branch calculations are selection-weighted. These are calculations
          from the available records, not certified institution-wide averages.
          CTC is reported annual compensation, not a representation of take-home
          pay, fixed salary, realised bonus or the terms of an individual
          employment contract. Refer to each batch’s data notes for coverage and
          calculation details.
        </p>
        <p>
          Result dates, email dates and document export dates are recorded
          separately where available. LIVE or Ongoing identifies an ongoing
          season covered by reviewed publications; it does not indicate
          automatic ingestion, continuous monitoring or a complete current
          record. Source corrections and omissions can affect totals, rankings
          and derived statistics.
        </p>
        <h3>1.4 Contributions, employer details and external profiles</h3>
        <p>
          Experiences are contributor accounts or community-attributed material.
          Editorial review controls publication but does not independently
          verify every statement, author identity, alumni status or claimed
          outcome. An experience is not an employer’s official recruitment
          policy. A community-created company or maintainer-supplied role and
          package is not proof of an on-campus hire, current vacancy or offer to
          a particular student.
        </p>
        <p>
          Alumni links identify available external profiles. A link does not
          establish profile ownership, employment status, willingness to respond
          or endorsement of this project. Third-party content, privacy settings,
          availability and terms remain under the third party’s control.
        </p>
        <h3>1.5 Reliance</h3>
        <p>
          The material is informational and is not an employment offer,
          placement guarantee, professional recommendation, or legal, financial
          or career advice tailored to an individual. Independently confirm
          eligibility, compensation, recruitment procedures and other material
          facts with the employer or institution before making a decision. Past
          results do not predict future hiring.
        </p>
      </section>

      <section id="note-privacy" className="note-legal">
        <h2>2. Privacy and personal data</h2>
        <h3>2.1 Information processed and its purposes</h3>
        <p>
          Placement records may contain names, roll numbers, branches,
          employers, roles, reported compensation, result dates and linked
          profiles obtained from compiled sources. Account information includes
          the Google identity identifier, verified email, display name and
          profile image where supplied. The application also processes drafts,
          submission revisions, attribution choices, votes, bookmarks, follows,
          reports, notification preferences, administrative decisions and
          related timestamps.
        </p>
        <p>
          These categories support authentication, publication of placement
          statistics and reviewed experiences, saving contributions, personal
          preparation tools, moderation, notifications, account administration,
          security and abuse prevention. Google/Firebase handles sign-in; this
          application does not receive the user’s Google password. Signing in
          authenticates an account. It does not constitute consent on behalf of
          another person named in a source record.
        </p>
        <h3>2.2 Access, visibility and pseudonymity</h3>
        <p>
          Placement views and approved experiences are available to eligible
          signed-in accounts under the application’s access rules. Google
          sign-in does not establish college affiliation; there is no
          college-domain eligibility restriction. Drafts, submissions and review
          history are accessible to the owner and authorised administrators
          according to their permissions. Trusted operational credentials may
          also permit administrative access.
        </p>
        <p>
          Anonymous attribution changes the displayed author name, not the
          internal ownership record. It is pseudonymous presentation, not
          anonymous processing. Do not include another person’s private contact
          information, identification documents, credentials, confidential
          interview materials or unnecessary personal details in an experience
          or public report.
        </p>
        <p>
          Some source transcriptions, datasets and profile mappings also exist
          in the linked code repository. A sign-in requirement on this website
          does not make those repository copies confidential or prevent copies
          already obtained by others from being retained. Website access
          controls must not be treated as a guarantee against copying,
          redistribution or re-identification.
        </p>
        <h3>2.3 Providers, device storage and measurement</h3>
        <p>
          The application uses Firebase/Google for authentication and data
          storage, and Vercel for hosting and API execution. Provider processing
          is subject to the relevant service terms, configuration and applicable
          law. Providers may process request metadata, IP addresses, device
          information and operational logs. No guarantee of storage exclusively
          within India or of tracking-free operation is made by this notice.
        </p>
        <p>
          Browser storage supports sign-in persistence, preferences, navigation
          state and recovery copies of unsynchronised writing. Recovery copies
          can remain on a shared device. Clearing site data can remove local
          copies and can also erase unsaved work. Google Analytics is loaded
          when enabled in a production deployment. This notice does not
          represent that an analytics consent-management interface is
          implemented.
        </p>
        <p>
          Consult{" "}
          <LegalLink href="https://policies.google.com/privacy">
            Google’s privacy policy
          </LegalLink>{" "}
          and{" "}
          <LegalLink href="https://vercel.com/legal/privacy-notice">
            Vercel’s privacy notice
          </LegalLink>{" "}
          for their respective processing practices. An external link is not an
          assurance that every provider practice is controlled by this project.
        </p>
        <h3>2.4 Retention, correction and erasure</h3>
        <p>
          A fixed retention schedule has not yet been published. Removing an
          experience is not a promise of complete erasure across
          ownership/version markers, moderation or audit records, notifications,
          source publications, repository history, provider logs, backups or
          copies held by others. Each request requires assessment of the
          affected records, technical dependencies and any applicable
          preservation duties. Technical retention does not, by itself,
          establish a legal entitlement to retain information indefinitely.
        </p>
        <p>
          To request access information, correction, restriction of display,
          withdrawal of a permission previously given, or removal of personal
          data, use the <a href="#about/contact">developer contacts above</a>.
          Identify the affected page or record, the issue, the action requested
          and a safe means of reply. Send only the information reasonably
          necessary to identify the record and your authority to make the
          request; do not send passwords or identity documents in an initial
          message. Applicable statutory rights, conditions and time limits take
          precedence over this notice.
        </p>
        <p>
          Personal-data and security concerns should be sent privately rather
          than posted in a public GitHub issue. These are the project’s
          published contact channels; no separately appointed statutory
          grievance officer or data-protection officer is identified on this
          page. The absence of an appointment or published procedure does not
          waive any requirement that applies to the project.
        </p>
        <h3>2.5 Security and younger users</h3>
        <p>
          Implemented controls include verified Google sessions, server-side
          authorisation, constrained database access, request validation and
          version-checked mutations. These controls reduce particular risks;
          they are not a warranty of absolute security or an independent
          security certification. The service is intended for college placement
          research and does not implement age verification or a verifiable
          parental-consent workflow. Do not submit children’s personal data
          without any authorisation required by applicable law.
        </p>
        <h3>2.6 Applicable framework and commencement</h3>
        <p>
          Relevant Indian legislation includes the{" "}
          <LegalLink href={references.dpdp}>
            Digital Personal Data Protection Act, 2023
          </LegalLink>
          , its{" "}
          <LegalLink href={references.rules}>
            notified rules and official updates
          </LegalLink>
          , and the{" "}
          <LegalLink href={references.it}>
            Information Technology Act, 2000
          </LegalLink>{" "}
          and applicable rules. Their application depends on the processing
          activity, legal status of the operator and provisions in force at the
          relevant time. This notice does not claim an exemption, a government
          approval or verified compliance.
        </p>
        <p>
          The DPDP Act has phased commencement under{" "}
          <LegalLink href={references.commencement}>
            G.S.R. 843(E), dated 13 November 2025
          </LegalLink>
          . Several substantive processing obligations and individual-rights
          provisions are assigned to the eighteen-month phase. They must not be
          represented as universally in force on this notice’s revision date.
          Requests can still be made through the contacts above; any mandatory
          right or obligation applies according to its actual commencement and
          scope. A public-source label or this notice cannot substitute for a
          legally required processing basis, notice or consent.
        </p>
      </section>

      <section id="note-terms" className="note-legal">
        <h2>3. Conditions of use and legal boundaries</h2>
        <h3>3.1 Permitted purpose and prohibited conduct</h3>
        <p>
          Use the service for lawful placement research and responsible sharing
          of recruitment experiences. Do not impersonate a person or
          institution, misrepresent authorisation, publish defamatory or
          unlawfully discriminatory content, disclose trade secrets or material
          covered by confidentiality obligations, harass individuals, distribute
          unsolicited bulk messages, or use records for identity profiling or
          unrelated targeting.
        </p>
        <p>
          Do not bulk-extract or redistribute personal records, circumvent
          access controls, interfere with the service, misuse another account or
          submit malicious content. An accessible record is not permission for
          unrestricted reuse. Account access and content publication remain
          subject to the application’s moderation and access controls and to
          applicable law.
        </p>
        <h3>3.2 Contributions and attribution</h3>
        <p>
          Submit material you are entitled to share, distinguish personal
          experience from inference, and exclude unnecessary third-party
          personal information. Submission requests storage, editorial review
          and, if approved, display through the application using the selected
          attribution. Publication does not transfer ownership of a contribution
          to the developers or automatically place it under the project’s code
          licence. Editing, withdrawal and deletion remain subject to the
          implemented workflows and the retention limitations described above.
        </p>
        <p>
          The project can decline publication or restrict access to content
          under its moderation workflows, including following a substantiated
          rights complaint or lawful direction. Such action is not a judicial
          determination of the underlying claim. Publication review does not
          certify a claim’s truth, legal sufficiency or suitability for every
          reader.
        </p>
        <h3>3.3 Intellectual property and rights complaints</h3>
        <p>
          The MIT licence covers the original project code and documentation to
          the extent stated in the{" "}
          <LegalLink href="https://github.com/ritzardous/kjsce-placements/blob/main/LICENSE">
            project licence
          </LegalLink>
          . It does not grant rights in third-party logos, institutional
          documents, personal records, trademarks or user contributions.
          Educational intent, attribution and non-commercial use do not, by
          themselves, establish a copyright exception or permission. Rights and
          exceptions under the{" "}
          <LegalLink href={references.copyright}>Copyright Act, 1957</LegalLink>{" "}
          depend on the particular use.
        </p>
        <p>
          A rights holder or authorised representative may send a private
          complaint using the developer contacts above, identifying the
          material, its location, the asserted right, the reason for the
          complaint and the requested remedy. Include sufficient information for
          assessment and a reply. The project may seek clarification and address
          the material through the available correction or moderation process.
          Do not attach unnecessary personal information or submit a knowingly
          false claim.
        </p>
        <h3>3.4 Availability, warranties and liability</h3>
        <p>
          To the extent permitted by applicable law, the service and its
          informational material are provided on an as-available basis without a
          warranty of completeness, accuracy, timeliness, uninterrupted
          availability, fitness for a particular purpose or any employment
          outcome. Errors, delays, third-party failures and changes to the
          underlying recruitment process may occur. Users remain responsible for
          independently verifying material facts and safeguarding their own
          account and device.
        </p>
        <p>
          To the extent legally enforceable, the project and its developers
          exclude liability for indirect or consequential loss arising from
          reliance on the material, interruption of access or use of linked
          services. This wording is not an absolute release from liability.
          Nothing in this notice excludes or limits a liability that applicable
          law prohibits excluding, excuses unlawful processing or fraud, removes
          a mandatory remedy, or prevents a person from approaching a competent
          court, regulator or other statutory forum. No guaranteed hiring or
          financial result is represented.
        </p>
        <h3>3.5 Interpretation, changes and mandatory rights</h3>
        <p>
          Mandatory law prevails over an inconsistent provision of this notice.
          If a provision cannot lawfully operate, it applies only to the extent
          permitted, without displacing other applicable obligations. This page
          does not impose mandatory arbitration, an exclusive court venue, a
          waiver of statutory complaint rights or a retrospective grant of
          consent. Displaying a notice does not replace any separate consent or
          contractual acceptance mechanism required by law.
        </p>
        <p>
          The revision date identifies this published version. Changes to the
          wording do not, by themselves, authorise a new processing purpose or
          cure missing permissions. Material changes to actual processing
          require the notices, permissions and other measures applicable to that
          change. Questions about this notice, personal-data requests and rights
          complaints can be directed to the contacts in the preceding developer
          section.
        </p>
      </section>
    </>
  );
}
