// ============================================================
// CRRT Prescription Trainer — Simulation Engine
// Deterministic compartment-model physiology simulation
// ============================================================

function calculateTBW(sex, age, height, weight) {
  if (sex === 'male') {
    return 2.447 - (0.09156 * age) + (0.1074 * height) + (0.3362 * weight);
  }
  return -2.097 + (0.1069 * height) + (0.2466 * weight);
}

function calculateGenerationRates(weight, liverFunction, bloods) {
  return {
    urea: 0.17 * weight,           // mmol/hr — catabolic ICU patient
    creatinine: 0.12 * weight,     // µmol/hr
    potassium: 4.5,                // mmol/hr — intracellular release + dietary
    phosphate: 0.08 * weight,      // mmol/hr — intracellular release
    bicarbonate: -1.0,             // mmol/hr — net acid production (negative = acid)
    lactate: bloods.lactate > 4 ? 2.0 : (bloods.lactate > 2 ? 1.0 : 0.5), // mmol/hr
    magnesium: 0.04 * weight * 0.01, // very small endogenous release
    sodium: 0,                     // Na+ generation is negligible
    chloride: 0                    // Cl- generation is negligible
  };
}

function getEffectiveSolutionComposition(solutionName, additives) {
  const sol = { ...SOLUTIONS[solutionName] };
  if (additives) {
    sol.K += (additives.potassium || 0);
    sol.PO4 += (additives.phosphate || 0);
    sol.Mg += (additives.magnesium || 0);
  }
  return sol;
}

function validatePrescription(prescription) {
  const warnings = [];
  const rx = { ...prescription };

  // Auto-correct modality mismatches
  if (rx.modality === 'CVVH') {
    if (rx.dialysateRate > 0) {
      warnings.push({ level: 'info', message: 'Dialysate rate auto-set to 0 for CVVH mode.' });
      rx.dialysateRate = 0;
    }
  }
  if (rx.modality === 'CVVHD') {
    if (rx.replacementFluidRate > 0) {
      warnings.push({ level: 'info', message: 'Replacement fluid rate auto-set to 0 for CVVHD mode.' });
      rx.replacementFluidRate = 0;
    }
  }

  // Citrate mode validations
  if (rx.anticoagulation === 'citrate') {
    const replSol = SOLUTIONS[rx.replacementFluid];
    if (replSol && replSol.hasCa) {
      warnings.push({ level: 'warning', message: 'Replacement fluid contains calcium \u2014 consider Ca-free solution for citrate mode.' });
    }
    const dialSol = SOLUTIONS[rx.dialysateSolution];
    if (dialSol && dialSol.hasCa) {
      warnings.push({ level: 'warning', message: 'Dialysate contains calcium \u2014 auto-switching to Prism0cal B22 (Ca-free) for citrate mode.' });
      rx.dialysateSolution = 'Prism0cal B22';
    }
    if (rx.citrateDose > 5) {
      warnings.push({ level: 'critical', message: 'Citrate dose > 5 mmol/L blood \u2014 excessive dosing.' });
    }
  }

  // Net UF warning
  if (rx.netUltrafiltrationRate > 200) {
    warnings.push({ level: 'warning', message: 'Net fluid removal > 200 mL/hr \u2014 risk of haemodynamic instability.' });
  }

  return { correctedRx: rx, warnings };
}

function runSimulation(patient, prescription) {
  const { correctedRx, warnings } = validatePrescription(prescription);
  const rx = correctedRx;
  const allWarnings = [...warnings];

  const TBW = calculateTBW(patient.sex, patient.age, patient.height, patient.weight);
  const TBW_L = TBW; // litres
  const genRates = calculateGenerationRates(patient.weight, patient.liverFunction, patient.bloods);

  // --- Flow calculations ---
  const Qb_mL_min = rx.bloodFlowRate;
  const Qb_mL_hr = Qb_mL_min * 60;
  const Qp_mL_hr = Qb_mL_hr * (1 - patient.haematocrit);

  // Citrate flow calculation
  let prismocitrateFlow = 0; // mL/hr
  if (rx.anticoagulation === 'citrate') {
    prismocitrateFlow = (rx.citrateDose * Qb_mL_hr) / (PRISMOCITRATE.citrate - rx.citrateDose);
    if (prismocitrateFlow < 0) prismocitrateFlow = 0;
  }

  // Replacement fluid distribution
  let Qpre = 0, Qpost = 0;
  if (rx.replacementFluidPosition === 'pre') {
    Qpre = rx.replacementFluidRate;
    Qpost = 0;
  } else if (rx.replacementFluidPosition === 'post') {
    Qpre = 0;
    Qpost = rx.replacementFluidRate;
  } else { // both — 50:50
    Qpre = rx.replacementFluidRate / 2;
    Qpost = rx.replacementFluidRate / 2;
  }

  // In citrate mode, prismocitrate is infused pre-filter (PBP line) — adds to pre-dilution
  const totalPreFilter = Qpre + prismocitrateFlow;

  // Effluent flow
  let Qeff;
  if (rx.modality === 'CVVH') {
    Qeff = rx.replacementFluidRate + rx.netUltrafiltrationRate;
  } else if (rx.modality === 'CVVHD') {
    Qeff = rx.dialysateRate + rx.netUltrafiltrationRate;
  } else { // CVVHDF
    Qeff = rx.replacementFluidRate + rx.dialysateRate + rx.netUltrafiltrationRate;
  }

  // In citrate mode, prismocitrate adds to effluent volume (it enters the circuit)
  if (rx.anticoagulation === 'citrate') {
    Qeff += prismocitrateFlow;
  }

  // Pre-dilution correction factor
  let preDilutionCorrection;
  if (totalPreFilter === 0) {
    preDilutionCorrection = 1;
  } else {
    preDilutionCorrection = Qb_mL_hr / (Qb_mL_hr + totalPreFilter);
  }

  // Filtration fraction
  const FF = (Qpost + rx.netUltrafiltrationRate) / (Qp_mL_hr + totalPreFilter);

  if (FF > 0.30) {
    allWarnings.push({ level: 'critical', message: `Filtration fraction ${(FF * 100).toFixed(1)}% \u2014 critically high clotting risk. Add pre-dilution.` });
  } else if (FF > 0.25) {
    allWarnings.push({ level: 'warning', message: `Filtration fraction ${(FF * 100).toFixed(1)}% \u2014 elevated clotting risk. Consider pre-dilution.` });
  }

  // CRRT dose
  const crrtDose = Qeff / patient.weight;
  if (crrtDose < 20) {
    allWarnings.push({ level: 'warning', message: `CRRT dose ${crrtDose.toFixed(1)} mL/kg/hr \u2014 below KDIGO recommendation of 20\u201325 mL/kg/hr.` });
  } else if (crrtDose > 35) {
    allWarnings.push({ level: 'warning', message: `CRRT dose ${crrtDose.toFixed(1)} mL/kg/hr \u2014 exceeds 35 mL/kg/hr, higher electrolyte derangement risk.` });
  }

  // --- Sieving coefficients ---
  const SC = {
    urea: 1.0, creatinine: 1.0, sodium: 1.0, potassium: 1.0,
    chloride: 1.0, bicarbonate: 1.0, phosphate: 0.9, magnesium: 0.7,
    lactate: 1.0, ionisedCalcium: 1.0, citrate: 1.0
  };

  // --- Solution compositions (with additives for replacement fluid) ---
  const replSol = getEffectiveSolutionComposition(rx.replacementFluid, rx.additives);
  const dialSol = SOLUTIONS[rx.dialysateSolution] || SOLUTIONS['Prismasol BGK 4/2.5'];

  // Map solution keys to blood keys
  const solToBlood = {
    Na: 'sodium', K: 'potassium', Ca: 'ionisedCalcium', Mg: 'magnesium',
    Cl: 'chloride', HCO3: 'bicarbonate', PO4: 'phosphate', Lactate: 'lactate'
  };

  // --- Time-stepping simulation ---
  const dt = 0.25; // hours (15 min steps)
  const totalHours = 24;
  const steps = totalHours / dt;

  // Current plasma concentrations
  let plasma = { ...patient.bloods };
  // Track citrate accumulation
  let systemicCitrate = 0; // mmol total in body
  let citrateComplexedCa = 0; // mmol complexed

  // Snapshots
  const snapshots = {
    0: { ...plasma, totalIonisedCaRatio: plasma.totalCalcium / plasma.ionisedCalcium },
    12: null,
    24: null
  };

  // Liver metabolism fraction for citrate
  const liverMetabFrac = patient.liverFunction === 'normal' ? 1.0 :
                         patient.liverFunction === 'impaired' ? 0.7 : 0.4;

  // Post-filter iCa (citrate mode) — calculated at steady state
  let postFilterICa = null;
  if (rx.anticoagulation === 'citrate') {
    const citrateInfused_mmol_hr = prismocitrateFlow * PRISMOCITRATE.citrate / 1000;
    postFilterICa = (Qp_mL_hr / 1000 * plasma.ionisedCalcium - citrateInfused_mmol_hr * 0.59) /
                    ((Qp_mL_hr + prismocitrateFlow) / 1000);
    if (postFilterICa < 0) postFilterICa = 0;

    if (postFilterICa > 0.4) {
      allWarnings.push({ level: 'warning', message: `Post-filter iCa ${postFilterICa.toFixed(2)} mmol/L \u2014 inadequate anticoagulation (target < 0.35).` });
    }
    if (postFilterICa < 0.15) {
      allWarnings.push({ level: 'warning', message: `Post-filter iCa ${postFilterICa.toFixed(2)} mmol/L \u2014 excess citrate, risk of hypocalcaemia.` });
    }
  }

  for (let step = 1; step <= steps; step++) {
    const t = step * dt;

    // --- Clearance for each solute (mL/hr) ---
    // Clearance = Qeff * SC * preDilutionCorrection

    // For each solute: mass removed by CRRT per time step
    // mass_removed = Clearance * [S]_plasma * dt / 1000  (convert mL to L)
    // mass_infused = solution contribution per dt

    // Replacement fluid infusion to patient: Qrepl total goes through circuit,
    // the patient receives the solute content. For post-dilution, it goes directly to patient.
    // For pre-dilution, the dilution effect is captured by preDilutionCorrection.
    // Net infusion rate of replacement fluid to patient = replacementFluidRate mL/hr

    // Dialysate does NOT infuse into patient — it only provides diffusion-based exchange.
    // However, in a mass-balance model, the net effect is captured by clearance equation.

    // Small solutes: ΔS = generation - clearance_removal + replacement_infusion + dialysate_net_effect
    // The clearance removes solute at plasma concentration.
    // Replacement fluid infuses at solution concentration.
    // For dialysate: net flux = Qd * (S_dialysate - S_plasma * SC * correction) — but simplified,
    // the effluent clearance approach already accounts for this.

    // Simplified mass balance per dt for solute S:
    // new_amount = old_amount + generation*dt - (Clearance/1000)*[S]*dt + (Qrepl/1000)*[S_repl]*dt
    //              + residualUO_clearance

    // Total body amount (in mmol, or µmol for creatinine):
    // amount = [S] * TBW_L (assumes TBW as Vd for small solutes)

    const processSolute = (bloodKey, solKey, sc, genRate, unit_factor) => {
      const clearance = Qeff * sc * preDilutionCorrection; // mL/hr
      const currentConc = plasma[bloodKey];
      const totalAmount = currentConc * TBW_L; // total body amount

      // Mass removed by CRRT (mL/hr * mmol/L * hr / 1000 mL/L = mmol... wait units)
      // clearance is in mL/hr, currentConc in mmol/L
      // mass_removed_per_hr = clearance (mL/hr) / 1000 (L/mL) * currentConc (mmol/L) = mmol/hr
      const massRemovedPerHr = (clearance / 1000) * currentConc;

      // Mass from replacement fluid
      const replConc = replSol[solKey] !== undefined ? replSol[solKey] : 0;
      const massFromRepl = (rx.replacementFluidRate / 1000) * replConc;

      // Mass from prismocitrate (pre-filter infusion) — Na, Cl mainly
      let massFromCitrateSol = 0;
      if (rx.anticoagulation === 'citrate' && PRISMOCITRATE[solKey] !== undefined) {
        massFromCitrateSol = (prismocitrateFlow / 1000) * PRISMOCITRATE[solKey];
      }

      // Residual UO clearance
      const massRemovedByUO = (patient.residualUO / 1000) * currentConc;

      // Generation
      const generation = genRate || 0;

      // Net change per hour
      const netChangePerHr = generation - massRemovedPerHr + massFromRepl + massFromCitrateSol - massRemovedByUO;

      // Update amount and concentration
      const newAmount = totalAmount + netChangePerHr * dt;
      return Math.max(0, newAmount / TBW_L);
    };

    // Process major solutes
    plasma.urea = processSolute('urea', null, SC.urea, genRates.urea);
    plasma.creatinine = processSolute('creatinine', null, SC.creatinine, genRates.creatinine);
    plasma.potassium = processSolute('potassium', 'K', SC.potassium, genRates.potassium);
    plasma.sodium = processSolute('sodium', 'Na', SC.sodium, genRates.sodium);
    plasma.chloride = processSolute('chloride', 'Cl', SC.chloride, genRates.chloride);
    plasma.phosphate = processSolute('phosphate', 'PO4', SC.phosphate, genRates.phosphate);
    plasma.magnesium = processSolute('magnesium', 'Mg', SC.magnesium, genRates.magnesium);
    plasma.lactate = processSolute('lactate', 'Lactate', SC.lactate, genRates.lactate);

    // --- Bicarbonate handling (special — acid-base) ---
    {
      const clearance = Qeff * SC.bicarbonate * preDilutionCorrection;
      const massRemovedPerHr = (clearance / 1000) * plasma.bicarbonate;
      const massFromRepl = (rx.replacementFluidRate / 1000) * replSol.HCO3;
      const massRemovedByUO = (patient.residualUO / 1000) * plasma.bicarbonate;

      // Metabolic acid production (consumes bicarb)
      const acidProduction = Math.abs(genRates.bicarbonate); // ~1 mmol/hr

      // Citrate metabolism -> HCO3 generation
      let citrateHCO3 = 0;
      if (rx.anticoagulation === 'citrate') {
        const citrateInfused = prismocitrateFlow * PRISMOCITRATE.citrate / 1000; // mmol/hr
        // Fraction cleared by filter
        const citrateClearedByFilter = (clearance / 1000) * (systemicCitrate / TBW_L);
        // Citrate returning to patient = infused - cleared by filter (approximate)
        const citrateReturnRate = citrateInfused * (1 - Qeff / (Qeff + Qb_mL_hr)) ; // rough approximation
        const citrateMetabolised = citrateReturnRate * liverMetabFrac;
        citrateHCO3 = citrateMetabolised * 3; // 3 HCO3 per citrate metabolised
      }

      const netChangePerHr = -acidProduction - massRemovedPerHr + massFromRepl + citrateHCO3 - massRemovedByUO;
      const totalBicarb = plasma.bicarbonate * TBW_L + netChangePerHr * dt;
      plasma.bicarbonate = Math.max(0, totalBicarb / TBW_L);
    }

    // --- pH calculation (Henderson-Hasselbalch) ---
    plasma.pH = 6.1 + Math.log10(plasma.bicarbonate / (0.03 * plasma.pCO2));

    // --- Calcium handling ---
    if (rx.anticoagulation === 'citrate') {
      // Citrate-calcium model
      const citrateInfused_mmol_hr = prismocitrateFlow * PRISMOCITRATE.citrate / 1000;

      // Citrate fraction that returns to patient (not cleared by filter)
      // Simplified: fraction returning = 1 - (filter clearance fraction)
      const citrateFilterClearanceFrac = Qeff / (Qeff + Qb_mL_hr);
      const citrateReturningRate = citrateInfused_mmol_hr * (1 - citrateFilterClearanceFrac);

      // Citrate metabolised by liver
      const citrateMetabolisedRate = citrateReturningRate * liverMetabFrac;
      // Unmetabolised citrate accumulates
      const citrateAccumRate = citrateReturningRate - citrateMetabolisedRate;
      systemicCitrate += citrateAccumRate * dt;
      // Decay of accumulated citrate (even impaired liver metabolises slowly)
      systemicCitrate = Math.max(0, systemicCitrate * Math.exp(-liverMetabFrac * 0.5 * dt));

      // Ca chelated by unmetabolised citrate in circulation
      const citrateConc = systemicCitrate / TBW_L; // mmol/L
      citrateComplexedCa = citrateConc * 0.59 * TBW_L; // total mmol complexed

      // Ionised calcium balance
      const iCaClearance = Qeff * SC.ionisedCalcium * preDilutionCorrection;
      const iCaRemoved = (iCaClearance / 1000) * plasma.ionisedCalcium;
      const iCaFromRepl = (rx.replacementFluidRate / 1000) * replSol.Ca;
      const iCaReplacement = rx.calciumReplacementRate; // mmol/hr
      const iCaReleasedFromMetab = citrateMetabolisedRate * 0.59; // Ca released when citrate metabolised
      const iCaRemovedByUO = (patient.residualUO / 1000) * plasma.ionisedCalcium;

      const netICaChange = -iCaRemoved + iCaFromRepl + iCaReplacement + iCaReleasedFromMetab - iCaRemovedByUO;
      const totalICa = plasma.ionisedCalcium * TBW_L + netICaChange * dt;
      plasma.ionisedCalcium = Math.max(0.01, totalICa / TBW_L);

      // Total calcium = ionised + protein-bound (~40% of ionised in normal state) + citrate-complexed
      const proteinBoundCa = plasma.ionisedCalcium * 0.8; // rough approximation
      plasma.totalCalcium = plasma.ionisedCalcium + proteinBoundCa + (citrateComplexedCa / TBW_L);
    } else {
      // Non-citrate calcium handling
      const iCaClearance = Qeff * SC.ionisedCalcium * preDilutionCorrection;
      const iCaRemoved = (iCaClearance / 1000) * plasma.ionisedCalcium;
      const iCaFromRepl = (rx.replacementFluidRate / 1000) * replSol.Ca;
      const iCaRemovedByUO = (patient.residualUO / 1000) * plasma.ionisedCalcium;

      const netICaChange = -iCaRemoved + iCaFromRepl - iCaRemovedByUO;
      const totalICa = plasma.ionisedCalcium * TBW_L + netICaChange * dt;
      plasma.ionisedCalcium = Math.max(0.01, totalICa / TBW_L);

      // Total calcium approximation (ionised ~45-50% of total)
      plasma.totalCalcium = plasma.ionisedCalcium * 2.04;
    }

    // Haemoglobin: affected by fluid balance (haemodilution/concentration)
    // Net fluid change per hour = all infusions - all removals
    {
      const fluidIn = rx.replacementFluidRate + prismocitrateFlow; // mL/hr infused
      const fluidOut = rx.netUltrafiltrationRate + patient.residualUO; // mL/hr removed
      const netFluidChange_L = (fluidIn - fluidOut) * dt / 1000; // litres per step
      // Hb is diluted/concentrated by volume changes (simplified)
      // Hb_new = Hb_old * old_volume / new_volume
      // But TBW is large, so effect is small per step
      const effectiveVolume = TBW_L; // approximate
      plasma.haemoglobin = plasma.haemoglobin * effectiveVolume / (effectiveVolume + netFluidChange_L);
    }

    // --- Capture snapshots ---
    if (Math.abs(t - 12) < dt / 2) {
      snapshots[12] = {
        ...plasma,
        totalIonisedCaRatio: plasma.totalCalcium / Math.max(0.01, plasma.ionisedCalcium)
      };
    }
    if (Math.abs(t - 24) < dt / 2) {
      snapshots[24] = {
        ...plasma,
        totalIonisedCaRatio: plasma.totalCalcium / Math.max(0.01, plasma.ionisedCalcium)
      };
    }
  }

  // Ensure 24h snapshot is captured
  if (!snapshots[24]) {
    snapshots[24] = {
      ...plasma,
      totalIonisedCaRatio: plasma.totalCalcium / Math.max(0.01, plasma.ionisedCalcium)
    };
  }
  if (!snapshots[12]) {
    snapshots[12] = snapshots[24]; // fallback
  }

  // Add ratio to baseline
  snapshots[0].totalIonisedCaRatio = patient.bloods.totalCalcium / Math.max(0.01, patient.bloods.ionisedCalcium);

  // --- Generate clinical alerts ---
  const alerts = [...allWarnings];
  const s24 = snapshots[24];

  // Check each parameter at 24h
  if (s24.potassium < 2.5) {
    alerts.push({ level: 'critical', message: `Severe hypokalaemia at 24h (K\u207A ${s24.potassium.toFixed(1)} mmol/L) \u2014 add KCl to replacement fluid or use K\u207A 4 mmol/L solution.` });
  } else if (s24.potassium < 3.5) {
    alerts.push({ level: 'warning', message: `Hypokalaemia at 24h (K\u207A ${s24.potassium.toFixed(1)} mmol/L) \u2014 consider increasing K\u207A in replacement fluid.` });
  }

  if (s24.phosphate < 0.3) {
    alerts.push({ level: 'critical', message: `Severe hypophosphataemia at 24h (PO\u2084 ${s24.phosphate.toFixed(2)} mmol/L) \u2014 consider Phoxillum or PO\u2084 supplementation. Risk of diaphragmatic weakness and respiratory failure.` });
  } else if (s24.phosphate < 0.8) {
    alerts.push({ level: 'warning', message: `Hypophosphataemia at 24h (PO\u2084 ${s24.phosphate.toFixed(2)} mmol/L) \u2014 consider Phoxillum or PO\u2084 supplementation.` });
  }

  if (s24.magnesium < 0.4) {
    alerts.push({ level: 'critical', message: `Severe hypomagnesaemia at 24h (Mg\u00b2\u207a ${s24.magnesium.toFixed(2)} mmol/L) \u2014 add MgCl\u2082 to replacement fluid.` });
  } else if (s24.magnesium < 0.7) {
    alerts.push({ level: 'warning', message: `Hypomagnesaemia at 24h (Mg\u00b2\u207a ${s24.magnesium.toFixed(2)} mmol/L) \u2014 consider Mg supplementation.` });
  }

  if (s24.ionisedCalcium < 0.8) {
    alerts.push({ level: 'critical', message: `Severe hypocalcaemia at 24h (iCa ${s24.ionisedCalcium.toFixed(2)} mmol/L).` });
  } else if (s24.ionisedCalcium < 1.0) {
    alerts.push({ level: 'warning', message: `Hypocalcaemia at 24h (iCa ${s24.ionisedCalcium.toFixed(2)} mmol/L).` });
  }

  if (s24.bicarbonate > 35) {
    alerts.push({ level: 'critical', message: `Metabolic alkalosis at 24h (HCO\u2083\u207b ${s24.bicarbonate.toFixed(1)} mmol/L) \u2014 consider lower-bicarb dialysate (B22) or reduce citrate dose.` });
  } else if (s24.bicarbonate > 28) {
    alerts.push({ level: 'warning', message: `Bicarbonate trending high at 24h (HCO\u2083\u207b ${s24.bicarbonate.toFixed(1)} mmol/L) \u2014 monitor for overcorrection.` });
  }

  if (s24.pH > 7.55) {
    alerts.push({ level: 'critical', message: `Severe alkalosis at 24h (pH ${s24.pH.toFixed(2)}).` });
  } else if (s24.pH < 7.15) {
    alerts.push({ level: 'critical', message: `Severe acidosis persisting at 24h (pH ${s24.pH.toFixed(2)}) \u2014 consider increasing CRRT dose or HCO\u2083\u207b delivery.` });
  }

  if (rx.anticoagulation === 'citrate' && s24.totalIonisedCaRatio > 2.8) {
    alerts.push({ level: 'critical', message: `Total:Ionised Ca ratio ${s24.totalIonisedCaRatio.toFixed(1)} at 24h \u2014 likely citrate accumulation. Consider switching to heparin.` });
  } else if (rx.anticoagulation === 'citrate' && s24.totalIonisedCaRatio > 2.5) {
    alerts.push({ level: 'warning', message: `Total:Ionised Ca ratio ${s24.totalIonisedCaRatio.toFixed(1)} at 24h \u2014 possible citrate accumulation. Monitor closely.` });
  }

  if (s24.sodium > 155) {
    alerts.push({ level: 'critical', message: `Hypernatraemia at 24h (Na\u207a ${s24.sodium.toFixed(0)} mmol/L).` });
  } else if (s24.sodium < 125) {
    alerts.push({ level: 'critical', message: `Severe hyponatraemia at 24h (Na\u207a ${s24.sodium.toFixed(0)} mmol/L).` });
  }

  // --- Teaching pearls ---
  const teachingPearls = generateTeachingPearls(patient, rx, snapshots, allWarnings);

  return {
    snapshots,
    alerts,
    teachingPearls,
    calculatedValues: {
      TBW: TBW_L,
      Qeff,
      crrtDose,
      filtrationFraction: FF,
      preDilutionCorrection,
      postFilterICa,
      prismocitrateFlow,
      Qp: Qp_mL_hr
    }
  };
}

function generateTeachingPearls(patient, rx, snapshots, warnings) {
  const pearls = [];
  const s0 = snapshots[0];
  const s24 = snapshots[24];

  // Potassium
  if (s24.potassium < 3.5 && s0.potassium > 5.0) {
    pearls.push({
      title: 'Potassium clearance in CRRT',
      content: 'CRRT is very effective at clearing potassium. A patient presenting with hyperkalaemia can develop hypokalaemia within 12\u201324 hours of CRRT. ' +
               'The K\u207a content of the replacement/dialysate fluid is critical \u2014 use K\u207a 4 mmol/L solutions when K\u207a is trending down, and consider ' +
               'additional KCl supplementation. Regular monitoring (4\u20136 hourly) is essential.'
    });
  } else if (s24.potassium > 6.0) {
    pearls.push({
      title: 'Persistent hyperkalaemia',
      content: 'Potassium remains elevated despite CRRT. Consider: (1) inadequate CRRT dose \u2014 aim for 20\u201325 mL/kg/hr per KDIGO guidelines, ' +
               '(2) use K\u207a-free replacement fluid (BGK 0/2.5), (3) ongoing massive cellular release (rhabdomyolysis, tumour lysis), ' +
               '(4) check for transcellular shift factors (acidosis, insulin deficiency).'
    });
  }

  // Phosphate
  if (s24.phosphate < 0.8) {
    pearls.push({
      title: 'Hypophosphataemia in CRRT',
      content: 'Phosphate is efficiently cleared by CRRT (SC \u2248 0.9). Severe hypophosphataemia (<0.3 mmol/L) can cause respiratory muscle weakness, ' +
               'cardiac dysfunction, and impaired oxygen delivery (reduced 2,3-DPG). This is one of the most common and dangerous complications of prolonged CRRT. ' +
               'Prevention: use phosphate-containing solutions (Phoxillum, PO\u2084 1.0 mmol/L) or add IV sodium phosphate supplementation.'
    });
  }

  // Magnesium
  if (s24.magnesium < 0.7) {
    pearls.push({
      title: 'Magnesium depletion during CRRT',
      content: 'Magnesium is partially cleared by CRRT (SC \u2248 0.7 due to protein binding). Hypomagnesaemia increases arrhythmia risk, potentiates hypokalaemia ' +
               '(refractory K\u207a replacement without correcting Mg\u00b2\u207a), and can worsen neuromuscular dysfunction. ' +
               'Add MgCl\u2082 to replacement fluid or give separate IV supplementation.'
    });
  }

  // Acid-base
  if (s0.pH < 7.25 && s24.pH > 7.35) {
    pearls.push({
      title: 'Acid-base correction with CRRT',
      content: 'CRRT corrects metabolic acidosis through: (1) removal of unmeasured anions (lactate, ketoacids), (2) infusion of bicarbonate from replacement fluid ' +
               '(most Prismasol solutions contain 32 mmol/L HCO\u2083\u207b), and (3) in citrate mode, metabolism of citrate to HCO\u2083\u207b (3 mmol per mmol citrate). ' +
               'Monitor for overcorrection \u2014 metabolic alkalosis can develop, especially with high-dose citrate.'
    });
  }

  if (s24.bicarbonate > 30) {
    pearls.push({
      title: 'Metabolic alkalosis risk',
      content: 'Overcorrection of acidosis is common in CRRT, especially with citrate anticoagulation (each mmol citrate metabolised \u2192 3 mmol HCO\u2083\u207b). ' +
               'Management: (1) switch to lower-bicarbonate solutions (B22 = 22 mmol/L HCO\u2083\u207b instead of 32), (2) reduce citrate dose if safe, ' +
               '(3) consider reducing CRRT dose. Severe alkalosis (pH > 7.55) causes ionised hypocalcaemia, arrhythmias, and seizures.'
    });
  }

  // Citrate-specific
  if (rx.anticoagulation === 'citrate') {
    if (s24.totalIonisedCaRatio > 2.5) {
      pearls.push({
        title: 'Citrate accumulation',
        content: 'Citrate accumulation occurs when citrate metabolism is impaired (liver failure, shock, hypothermia). The hallmark is a rising Total:Ionised Ca ratio ' +
                 '(>2.5 = warning, >2.8 = likely accumulation). This happens because citrate-calcium complexes are measured as "total calcium" but not as "ionised calcium". ' +
                 'The patient develops ionised hypocalcaemia despite normal or elevated total calcium. ' +
                 'Management: reduce citrate dose, increase calcium replacement, or switch to heparin. ' +
                 'Reference: Kramer et al (Crit Care Med 2003) \u2014 citrate metabolism in liver failure.'
      });
    }

    if (patient.liverFunction !== 'normal') {
      pearls.push({
        title: 'Citrate in liver disease',
        content: `This patient has ${patient.liverFunction} liver function. Citrate is metabolised primarily in the liver (and to a lesser extent, kidneys and skeletal muscle). ` +
                 'In liver failure, citrate half-life increases dramatically from ~5 minutes to 30\u201360+ minutes. ' +
                 'If using citrate anticoagulation in liver disease: (1) start with a lower citrate dose, (2) monitor Total:Ionised Ca ratio every 6h, ' +
                 '(3) use lower-bicarbonate dialysate (B22) to offset excess HCO\u2083\u207b generation, (4) have a low threshold to switch to heparin-free or heparin modes.'
      });
    }

    pearls.push({
      title: 'Regional citrate anticoagulation (RCA) principles',
      content: 'Citrate chelates ionised calcium in the circuit, preventing clotting (target post-filter iCa < 0.35 mmol/L). ' +
               'Prismocitrate 18/0 is infused pre-filter. The citrate-calcium complex is partially cleared in the effluent. ' +
               'Citrate returning to the patient is metabolised by the liver \u2192 3 HCO\u2083\u207b per citrate, releasing the bound calcium. ' +
               'Systemic calcium must be replaced via a separate CVC lumen (CaCl\u2082 infusion). ' +
               'Key monitoring: post-filter iCa (circuit), systemic iCa (patient), Total:Ionised Ca ratio (accumulation). ' +
               'Calcium-free dialysate (Prism0cal B22) is essential \u2014 calcium in dialysate would counteract the citrate anticoagulation.'
    });
  }

  // CRRT dose
  const crrtDose = snapshots[0] ? (rx.replacementFluidRate + rx.dialysateRate + rx.netUltrafiltrationRate) / patient.weight : 0;
  pearls.push({
    title: 'CRRT dosing evidence',
    content: 'The RENAL trial (Bellomo et al, NEJM 2009) and ATN trial (Palevsky et al, NEJM 2008) showed no survival benefit of higher-intensity CRRT ' +
             '(40 mL/kg/hr) compared with standard dosing (20\u201325 mL/kg/hr). KDIGO guidelines recommend prescribing 20\u201325 mL/kg/hr of effluent. ' +
             'Note: delivered dose is typically 10\u201315% less than prescribed (due to downtime, clotting). ' +
             'Pre-dilution reduces effective clearance \u2014 if using pre-dilution, increase prescribed dose to compensate.'
  });

  // Filtration fraction
  if (warnings.some(w => w.message && w.message.includes('Filtration fraction'))) {
    pearls.push({
      title: 'Filtration fraction and filter life',
      content: 'Filtration fraction (FF) = volume removed post-filter / (plasma flow + pre-dilution volume). ' +
               'FF > 25% increases haemoconcentration in the filter, promoting clotting and reducing filter life. ' +
               'FF > 30% is critical and associated with rapid filter loss. ' +
               'Solutions: (1) add pre-dilution replacement fluid, (2) increase blood flow rate (Qb), (3) reduce post-dilution replacement rate.'
    });
  }

  return pearls;
}

function getValueStatus(key, value) {
  const ref = REFERENCE_RANGES[key];
  if (!ref) return 'normal';

  if (ref.highCrit !== null && value > ref.highCrit) return 'critical-high';
  if (ref.lowCrit !== null && value < ref.lowCrit) return 'critical-low';
  if (ref.high !== null && value > ref.normHigh) return 'high';
  if (ref.low !== null && value < ref.normLow) return 'low';
  if (value >= ref.normLow && value <= ref.normHigh) return 'normal';
  if (value > ref.normHigh) return 'high';
  if (value < ref.normLow) return 'low';
  return 'normal';
}

function formatValue(key, value) {
  if (key === 'pH') return value.toFixed(2);
  if (key === 'ionisedCalcium' || key === 'totalIonisedCaRatio') return value.toFixed(2);
  if (key === 'creatinine' || key === 'haemoglobin') return Math.round(value);
  if (key === 'sodium' || key === 'chloride') return Math.round(value);
  return value.toFixed(1);
}
