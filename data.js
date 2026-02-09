// ============================================================
// CRRT Prescription Trainer — Data Module
// Solution compositions, clinical scenarios, reference ranges
// ============================================================

const SOLUTIONS = {
  'Prismasol BGK 0/2.5': {
    Na: 140, K: 0, Ca: 1.25, Mg: 0.75, Cl: 109.0, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: true, label: 'Prismasol BGK 0/2.5'
  },
  'Prismasol BGK 4/2.5': {
    Na: 140, K: 4, Ca: 1.25, Mg: 0.75, Cl: 113.0, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: true, label: 'Prismasol BGK 4/2.5'
  },
  'Prismasol BGK 2/3.5': {
    Na: 140, K: 2, Ca: 1.75, Mg: 0.50, Cl: 111.5, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: true, label: 'Prismasol BGK 2/3.5'
  },
  'Prismasol BGK 2/0': {
    Na: 140, K: 2, Ca: 0, Mg: 0.50, Cl: 108.0, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: false, label: 'Prismasol BGK 2/0'
  },
  'Prismasol BGK 4/0/1.2': {
    Na: 140, K: 4, Ca: 0, Mg: 0.60, Cl: 110.2, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: false, label: 'Prismasol BGK 4/0/1.2'
  },
  'Prismasol B22GK 4/0': {
    Na: 140, K: 4, Ca: 0, Mg: 0.75, Cl: 120.5, HCO3: 22, Lactate: 3, PO4: 0, Glucose: 5.5,
    hasCa: false, label: 'Prismasol B22GK 4/0'
  },
  'Prismasol BK 0/0/1.2': {
    Na: 140, K: 0, Ca: 0, Mg: 0.60, Cl: 106.2, HCO3: 32, Lactate: 3, PO4: 0, Glucose: 0,
    hasCa: false, label: 'Prismasol BK 0/0/1.2'
  },
  'Phoxillum BK 4/2.5': {
    Na: 140, K: 4, Ca: 1.25, Mg: 0.75, Cl: 114.5, HCO3: 32, Lactate: 0, PO4: 1.0, Glucose: 0,
    hasCa: true, label: 'Phoxillum BK 4/2.5'
  },
  'Phoxillum B22K 4/0': {
    Na: 140, K: 4, Ca: 0, Mg: 0.75, Cl: 122.0, HCO3: 22, Lactate: 0, PO4: 1.0, Glucose: 0,
    hasCa: false, label: 'Phoxillum B22K 4/0'
  },
  'Prism0cal B22': {
    Na: 140, K: 4, Ca: 0, Mg: 0.75, Cl: 120.5, HCO3: 22, Lactate: 3, PO4: 0, Glucose: 0,
    hasCa: false, label: 'Prism0cal B22 (Ca-free dialysate for RCA)'
  }
};

const PRISMOCITRATE = {
  citrate: 18,   // mmol/L trisodium citrate
  Na: 140,       // mmol/L
  Ca: 0,
  K: 0,
  Mg: 0,
  Cl: 86,        // mmol/L
  HCO3: 0,
  PO4: 0,
  Lactate: 0
};

const CLINICAL_SCENARIOS = {
  'septic_aki': {
    name: 'Septic AKI \u2014 Anuric',
    description: 'Septic shock from pneumonia, on noradrenaline. Anuric \u00d7 24h, metabolic acidosis.',
    patient: {
      weight: 70, sex: 'male', height: 175, age: 55,
      residualUO: 0, liverFunction: 'normal', haematocrit: 0.30,
      bloods: {
        urea: 35, creatinine: 450, sodium: 138, potassium: 6.2,
        chloride: 108, bicarbonate: 16, pH: 7.25, pCO2: 35,
        ionisedCalcium: 1.15, totalCalcium: 2.35, phosphate: 2.8,
        magnesium: 1.0, lactate: 2.5, haemoglobin: 90
      }
    }
  },
  'rhabdomyolysis': {
    name: 'Rhabdomyolysis with Hyperkalaemia',
    description: 'Crush injury, massive CK, oliguric.',
    patient: {
      weight: 85, sex: 'male', height: 180, age: 30,
      residualUO: 5, liverFunction: 'normal', haematocrit: 0.30,
      bloods: {
        urea: 25, creatinine: 380, sodium: 135, potassium: 7.1,
        chloride: 108, bicarbonate: 14, pH: 7.20, pCO2: 30,
        ionisedCalcium: 0.90, totalCalcium: 1.95, phosphate: 3.5,
        magnesium: 1.3, lactate: 4.0, haemoglobin: 95
      }
    }
  },
  'liver_cirrhosis': {
    name: 'Decompensated Liver Cirrhosis with AKI',
    description: 'Known cirrhosis, hepatorenal syndrome, coagulopathic. Citrate preferred but metabolism impaired!',
    patient: {
      weight: 65, sex: 'male', height: 170, age: 60,
      residualUO: 0, liverFunction: 'impaired', haematocrit: 0.25,
      bloods: {
        urea: 20, creatinine: 280, sodium: 128, potassium: 5.0,
        chloride: 108, bicarbonate: 20, pH: 7.32, pCO2: 32,
        ionisedCalcium: 1.10, totalCalcium: 2.20, phosphate: 1.5,
        magnesium: 0.7, lactate: 3.5, haemoglobin: 75
      }
    }
  },
  'post_cardiac': {
    name: 'Post-Cardiac Surgery AKI',
    description: 'Post-CABG, haemodynamically stable on low-dose noradrenaline.',
    patient: {
      weight: 90, sex: 'male', height: 178, age: 68,
      residualUO: 10, liverFunction: 'normal', haematocrit: 0.28,
      bloods: {
        urea: 22, creatinine: 320, sodium: 142, potassium: 5.5,
        chloride: 108, bicarbonate: 19, pH: 7.30, pCO2: 38,
        ionisedCalcium: 1.05, totalCalcium: 2.30, phosphate: 2.0,
        magnesium: 0.8, lactate: 2.0, haemoglobin: 85
      }
    }
  },
  'tumour_lysis': {
    name: 'Tumour Lysis Syndrome',
    description: 'Haematological malignancy, massive tumour lysis. Extreme hyperkalaemia, hyperphosphataemia, hypocalcaemia.',
    patient: {
      weight: 75, sex: 'female', height: 165, age: 45,
      residualUO: 5, liverFunction: 'normal', haematocrit: 0.25,
      bloods: {
        urea: 40, creatinine: 500, sodium: 140, potassium: 7.5,
        chloride: 108, bicarbonate: 12, pH: 7.15, pCO2: 28,
        ionisedCalcium: 0.75, totalCalcium: 1.80, phosphate: 4.5,
        magnesium: 1.2, lactate: 3.0, haemoglobin: 80
      }
    }
  }
};

const REFERENCE_RANGES = {
  urea:            { lowCrit: null, low: null,  normLow: 2.5, normHigh: 7.0,  high: 40,   highCrit: 40,   unit: 'mmol/L' },
  creatinine:      { lowCrit: null, low: null,  normLow: 60,  normHigh: 110,  high: 500,  highCrit: 500,  unit: '\u00b5mol/L' },
  sodium:          { lowCrit: 125,  low: 134,   normLow: 135, normHigh: 145,  high: 155,  highCrit: 155,  unit: 'mmol/L' },
  potassium:       { lowCrit: 2.5,  low: 3.4,   normLow: 3.5, normHigh: 5.0,  high: 6.0,  highCrit: 6.0,  unit: 'mmol/L' },
  bicarbonate:     { lowCrit: 12,   low: 21,    normLow: 22,  normHigh: 28,   high: 35,   highCrit: 35,   unit: 'mmol/L' },
  pH:              { lowCrit: 7.15, low: 7.34,  normLow: 7.35,normHigh: 7.45, high: 7.55, highCrit: 7.55, unit: '' },
  ionisedCalcium:  { lowCrit: 0.8,  low: 1.0,   normLow: 1.0, normHigh: 1.3,  high: 1.5,  highCrit: 1.5,  unit: 'mmol/L' },
  totalCalcium:    { lowCrit: 1.8,  low: 2.1,   normLow: 2.1, normHigh: 2.6,  high: 3.0,  highCrit: 3.0,  unit: 'mmol/L' },
  phosphate:       { lowCrit: 0.3,  low: 0.7,   normLow: 0.8, normHigh: 1.5,  high: 2.5,  highCrit: 2.5,  unit: 'mmol/L' },
  magnesium:       { lowCrit: 0.4,  low: 0.6,   normLow: 0.7, normHigh: 1.0,  high: 1.5,  highCrit: 1.5,  unit: 'mmol/L' },
  lactate:         { lowCrit: null, low: null,   normLow: 0,   normHigh: 2.0,  high: 4.0,  highCrit: 4.0,  unit: 'mmol/L' },
  haemoglobin:     { lowCrit: 60,   low: 69,    normLow: 70,  normHigh: 120,  high: 180,  highCrit: 180,  unit: 'g/L' },
  totalIonisedCaRatio: { lowCrit: null, low: null, normLow: 1.5, normHigh: 2.5, high: 2.8, highCrit: 2.8, unit: 'ratio' }
};

const DEFAULT_PRESCRIPTION = {
  modality: 'CVVHDF',
  bloodFlowRate: 200,
  anticoagulation: 'heparin',
  heparinRate: 1000,
  citrateDose: 3.0,
  calciumReplacementRate: 1.7,
  replacementFluidRate: 1000,
  replacementFluidPosition: 'post',
  dialysateRate: 1000,
  netUltrafiltrationRate: 100,
  replacementFluid: 'Prismasol BGK 4/2.5',
  dialysateSolution: 'Prismasol BGK 4/2.5',
  additives: { potassium: 0, phosphate: 0, magnesium: 0 }
};
