# Dashboard data dictionary

| Field/metric | Meaning |
| --- | --- |
| `placement_id` | Source legacy announcement identifier; unique within the graduation batch. |
| `company.normalized_name` | Legacy company grouping key and hash-link identifier; preserved during this migration. |
| `result.declared_date` | Source result date, represented as a calendar date rather than a UTC timestamp. |
| `hiring.students_hired` | Hires reported in this announcement; not the college-wide running counter. |
| `hiring.placement_count` | Source-reported college cumulative counter; `null` remains unknown. |
| `candidates` | Listed candidate rows; repeated students may appear in multiple announcements. |
| `roll_number` | Legacy student identifier; used for unique-student counting within this batch. |
| `compensation.ctc_value_lpa` | Confirmed numeric annual INR compensation in lakhs; unknown/mixed bands remain `null`. |
| `compensation.ctc_text` | Original compensation wording, retained even when the numeric value is unavailable. |
| `source` | Original source document and page references, preserved without implying that the source PDF exists in this checkout. |
| `notes` | Extraction limitations and source corrections, retained and displayed. |
| `summary.selections` | Number of candidate selection rows. For this source it agrees with summed reported hires. |
| `summary.uniqueStudents` | Distinct source roll numbers in the selected graduation batch. |
| `summary.reportedCounter` | Largest confirmed source cumulative counter; not a computed selection total. |
| `summary.placementRate` | Unique students divided by the matching, sourced B.Tech registration base; unavailable for missing/zero denominator. |
| `summary.notConfirmedPlaced` | Registration base minus students confirmed in the supplied announcements; not a proven unemployment count. |
| `summary.avgCtc` / `medianCtc` | Announcement-weighted for 2026/2027, preserving legacy behavior; selection-weighted for the 2025 official-report dataset. |
| `branches[].avgCtc` / `medianCtc` | Selection-weighted compensation metrics; no compensation is inferred for mixed/unknown bands. |
| `ctcCoverage` | Count of known numerical compensation observations used by the relevant aggregate. |
| `timeline[].reportedCumulative` | Unmodified TPO counter, including nulls. |
| `timeline[].selections` | Calculated cumulative candidate rows, ordered by result date and then announcement ID. |
| `timeline[].uniqueStudents` | Calculated cumulative distinct source roll numbers in the same ordering. |
| `summary.techCompanies` | Legacy substring heuristic applied to role titles; explicitly labeled as a heuristic. |

- The 2026 B.Tech registration base is 524, sourced to the T&PO director's 19 September 2025 mail.
- Selection counts and company hire labels describe reported selections, not accepted offers or joining outcomes.
- CTC does not imply base salary or take-home pay.
- 2025 and retained 2027 have no sourced registration denominator; placement rate remains unavailable. Current routing hides 2027; see [features](features.md).
- The original dataset provides no candidate-specific numerical values for its mixed compensation announcement; those rows remain excluded from compensation calculations.
