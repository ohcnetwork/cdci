// Curated plain-English glossary for LOINC FSN tokens. Shared by the build
// pipeline (to attach glosses + validate the split) and the client (no extra
// fetch). Intentionally curated, not exhaustive: tokens absent here render as
// their raw form, never blank. Improve incrementally.
import type { LoincAxis } from "./types";

/** LOINC "Property" axis — the kind of quantity measured. */
export const PROPERTY_GLOSS: Record<string, string> = {
  MCnc: "Mass concentration",
  SCnc: "Substance concentration",
  ACnc: "Arbitrary concentration",
  NCnc: "Number concentration",
  CCnc: "Catalytic concentration",
  LsCnc: "Substance concentration (log)",
  PrThr: "Presence or threshold",
  Prid: "Presence or identity of an organism",
  Titr: "Titre",
  Susc: "Susceptibility",
  NFr: "Number fraction",
  MFr: "Mass fraction",
  CFr: "Catalytic fraction",
  VFr: "Volume fraction",
  Ratio: "Ratio",
  MRto: "Mass ratio",
  SRto: "Substance ratio",
  NRto: "Number ratio",
  VRat: "Volume ratio",
  MRat: "Mass rate (per time)",
  SRat: "Substance rate (per time)",
  CRat: "Catalytic rate (per time)",
  Arb: "Arbitrary units",
  Imp: "Impression / interpretation",
  Find: "Finding",
  Type: "Type",
  Time: "Time",
  TmStp: "Timestamp",
  Osmol: "Osmolality",
  Vel: "Velocity",
  Vol: "Volume",
  Area: "Area",
  Len: "Length",
  Visc: "Viscosity",
  Num: "Number / count",
  CCnt: "Catalytic content",
  Score: "Score",
  Geno: "Genotype",
  Naric: "Number per area",
  EntVol: "Entitic volume",
  EntMass: "Entitic mass",
  EntCat: "Entitic catalytic amount",
  RelMCnc: "Relative mass concentration",
  RelACnc: "Relative arbitrary concentration",
  RelCCnc: "Relative catalytic concentration",
  RelTime: "Relative time",
  NCncRange: "Number concentration range",
  Pn: "Panel",
  Cmplx: "Complex / panel",
  OD: "Optical density",
};

/** LOINC "Time aspect" axis. */
export const TIME_GLOSS: Record<string, string> = {
  Pt: "Point in time (single random specimen)",
  "24H": "24-hour timed collection",
  "12H": "12-hour timed collection",
  XXX: "Unspecified / varies",
};

/** LOINC "Scale" axis — this set is also the validation whitelist (see KNOWN_SCALE). */
export const SCALE_GLOSS: Record<string, string> = {
  Qn: "Quantitative — reported as a number",
  Ord: "Ordinal — e.g. positive / negative",
  Nom: "Nominal — a named category",
  SemiQn: "Semi-quantitative",
  OrdQn: "Ordinal or quantitative",
  Doc: "Document / report",
  Nar: "Narrative text",
  Set: "Set (panel of results)",
};

/** LOINC "System" axis — the specimen. Values double as the specimen facet label. */
export const SYSTEM_GLOSS: Record<string, string> = {
  Ser: "Serum",
  Plas: "Plasma",
  "Ser/Plas": "Serum or plasma",
  "Ser/Plas/Bld": "Serum, plasma or blood",
  Bld: "Blood",
  "Bld/Tiss": "Blood or tissue",
  "Bld.dot": "Blood (dried spot)",
  BldC: "Blood (capillary)",
  BldA: "Blood (arterial)",
  BldV: "Blood (venous)",
  CSF: "Cerebrospinal fluid",
  Urine: "Urine",
  "Urine sed": "Urine sediment",
  PPP: "Platelet-poor plasma",
  PRP: "Platelet-rich plasma",
  Isolate: "Isolate (cultured organism)",
  "Body fld": "Body fluid",
  Tiss: "Tissue",
  Sputum: "Sputum",
  Stool: "Stool",
  BAL: "Bronchoalveolar lavage",
  Nph: "Nasopharynx",
  Thrt: "Throat",
  Semen: "Semen",
  Saliva: "Saliva",
  Hair: "Hair",
  Nail: "Nail",
  "Bone mar": "Bone marrow",
  "Plr fld": "Pleural fluid",
  "Periton fld": "Peritoneal fluid",
  "Synv fld": "Synovial fluid",
  "Amtic fld": "Amniotic fluid",
  "Amnio fld": "Amniotic fluid",
  "Pericard fld": "Pericardial fluid",
  "Gast fld": "Gastric fluid",
  Asp: "Aspirate",
  Pus: "Pus",
  "Bld/Bone mar": "Blood or bone marrow",
  "Respiratory system specimen.lower": "Lower respiratory specimen",
  WBC: "White blood cells",
  RBC: "Red blood cells",
  Cvx: "Cervix",
  Vag: "Vagina",
  Wound: "Wound",
  Genital: "Genital specimen",
  Skin: "Skin",
  Eye: "Eye",
  Ear: "Ear",
  Genv: "Genital (vaginal)",
  XXX: "Unspecified specimen",
};

/** LOINC "Method" axis — expands the abbreviated methods; readable ones pass through. */
export const METHOD_GLOSS: Record<string, string> = {
  IA: "Immunoassay",
  "IA.rapid": "Rapid immunoassay",
  "Probe.amp.tar": "Nucleic acid amplification (target probe)",
  "Probe.amp.sig": "Nucleic acid amplification (signal probe)",
  "Non-probe.amp.tar": "Non-probe amplification (target)",
  Probe: "Nucleic acid probe",
  Molgen: "Molecular genetics",
  LA: "Latex agglutination",
  "Microscopy.light": "Light microscopy",
  "Microscopy.light.HPF": "Light microscopy (high-power field)",
  IF: "Immunofluorescence",
  IB: "Immunoblot",
  Coag: "Coagulation assay",
  FISH: "Fluorescence in situ hybridization (FISH)",
  RIA: "Radioimmunoassay",
  Aggl: "Agglutination",
  "Aggl.standard tube": "Agglutination (standard tube)",
  HA: "Haemagglutination",
  HPLC: "High-performance liquid chromatography",
  "LC/MS/MS": "Liquid chromatography–tandem mass spectrometry",
  RAST: "Radioallergosorbent test (RAST)",
  VDRL: "VDRL flocculation test",
  MIC: "Minimum inhibitory concentration",
  "Acid fast stain.Ziehl-Neelsen": "Acid-fast stain (Ziehl-Neelsen)",
  Westergren: "Westergren method",
};

const GLOSS_BY_AXIS = {
  property: PROPERTY_GLOSS,
  time: TIME_GLOSS,
  scale: SCALE_GLOSS,
  system: SYSTEM_GLOSS,
  method: METHOD_GLOSS,
} as const;

/** Build an axis token with its gloss (gloss undefined when not curated). */
export function glossAxis(
  axis: keyof typeof GLOSS_BY_AXIS,
  raw: string,
): LoincAxis {
  const g = GLOSS_BY_AXIS[axis][raw];
  return g ? { raw, gloss: g } : { raw };
}

/** The set of valid LOINC scale tokens — the validation key for the FSN split. */
export const KNOWN_SCALE: ReadonlySet<string> = new Set(Object.keys(SCALE_GLOSS));

/** Normalized specimen facet label. LOINC encodes the System axis as
 *  `System^Super-system` (e.g. `PPP^Control`, `Plas^Donor`, `^Patient`); we key
 *  off the base specimen so qualified variants group with their base, and a
 *  leading-caret token (super-system only, no real specimen) keeps its label. */
export function normalizeSpecimen(systemRaw: string): string {
  const base = systemRaw.split("^")[0];
  if (base) return SYSTEM_GLOSS[base] ?? base; // PPP^Control → Platelet-poor plasma
  return SYSTEM_GLOSS[systemRaw] ?? systemRaw.replace(/^\^/, ""); // ^Patient → "Patient"
}

/** Coarse scale facet bucket for the browse rail. */
export function scaleFacet(scaleRaw: string): string {
  return scaleRaw === "Qn" ? "Quantitative" : "Qualitative / ordinal";
}
