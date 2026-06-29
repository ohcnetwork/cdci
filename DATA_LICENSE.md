# Data licence & redistribution

## Source data (NRCeS CDCI)

The drug data under `data/source/` is the **Common Drug Codes for India (CDCI) Flat File Package** by
NRCeS / C-DAC, licensed **CC BY 4.0**. The original `License.txt` is preserved in `data/source/`.

Key terms (paraphrased — the original `License.txt` governs):

- **CC BY 4.0** — you may share and adapt with attribution to C-DAC / NRCeS.
- **SNOMED CT content** within the package is governed by the **SNOMED CT Affiliate License**. SNOMED CT®
  is a trademark of SNOMED International. India is a SNOMED International member territory.
- The package permits **redistribution and derivatives within India**.
- **Brand / trade names** are the property of their respective owners (copyright is *not* assigned by
  the CC BY licence).

### What that means for this project

- This is an OHC Network project operating within India; the app is **intended for Indian healthcare use**
  and bundles the data with the attributions in [`NOTICE`](./NOTICE), surfaced in the app footer.
- We do **not** relicense brand names; they appear for identification only.
- If you fork and deploy this outside an Indian-healthcare context, review the SNOMED CT Affiliate
  License and the CDCI `License.txt` for your situation. When in doubt, contact NRCeS
  (`nrc-help@cdac.in`).

## Source data (NRCeS CLCI · LOINC)

The lab data under `data/source/clci/` is the **Common Lab Codes for India (CLCI)** by NRCeS / C-DAC — a
curated subset of **LOINC v2.82**. The original `NOTICE.txt` and `README.txt` are preserved alongside it.

- The CLCI subset contains content from **LOINC** (https://loinc.org), copyright © **Regenstrief
  Institute, Inc.** and the LOINC Committee, available at no cost under the LOINC license
  (https://loinc.org/license). **LOINC®** is a registered United States trademark of Regenstrief Institute,
  Inc.
- The subset does **not** modify the meaning of the original LOINC codes. **Regenstrief Institute and the
  LOINC Committee do not endorse this subset.**
- Refer to the official LOINC License for complete licensing and usage requirements. Attribution is
  surfaced in the app footer and on the About page.

## Generated artifacts

`public/data/` is a derivative of the source data and inherits its terms (CC BY 4.0 + SNOMED CT
Affiliate terms). It is produced by the build and is not committed. CARE `ProductKnowledge` JSON is
generated on demand in the app from this data and inherits the same terms.

## Community enrichment

Files under `enrichments/` are contributed under **CC BY 4.0** (see [CONTRIBUTING.md](./CONTRIBUTING.md)).

## Application code

All source code (everything except `data/source/` and `enrichments/`) is **MIT** licensed.
