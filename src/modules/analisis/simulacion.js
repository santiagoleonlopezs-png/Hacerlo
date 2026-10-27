/* HACERLO V2.7.3 · Módulo Operativo de Simulación de Agentes (COM-B + Centola + Lewin/Sterman) */
let simSelectedBehavior = null;
let simWeeks = 12;
let simActiveSystem = {};
let simActiveEdges = {};
let simActiveActions = {};
let simLastResult = null;

function simInitState(x) {
  const behs = x.behaviors || [];
  if (!simSelectedBehavior && behs.length) {
    simSelectedBehavior = String(behs[0].id ?? 0);
  }
}

function simSelectBehavior(val) {
  simSelectedBehavior = val;
  simLastResult = null;
  render();
}

function simToggleSystem(id) {
  simActiveSystem[id] = !simActiveSystem[id];
  render();
}

function simToggleEdge(idx) {
  simActiveEdges[idx] = !simActiveEdges[idx];
  render();
}

function simToggleAction(idx) {
  simActiveActions[idx] = !simActiveActions[idx];
  render();
}

function simSetWeeks(w) {
  simWeeks = Number(w) || 12;
  render();
}

function simResetLevers() {
  simActiveSystem = {};
  simActiveEdges = {};
  simActiveActions = {};
  render();
}

function simActivateAllRecommended(x) {
  const levers = simExtractLevers(x);
  levers.systemBarriers.forEach(b => { simActiveSystem[b.id] = true; });
  levers.fragileEdges.forEach(e => { simActiveEdges[e.index] = true; });
  levers.actions.forEach(a => { simActiveActions[a.index] = true; });
  render();
}

function simExtractLevers(x) {
  const sysConds = (x.systemV23?.conditions || []).filter(c => c.orientation === 'Dificulta' && c.state !== 'Resuelta');
  const diagBarriers = Object.entries(x.behaviorDiagnosis || {})
    .filter(([, f]) => f && f.role === 'Barrera')
    .map(([k, f]) => ({
      id: 'diag-' + k,
      name: `[${f.dimension}] ${f.factor}`,
      type: f.dimension || 'Diagnóstico',
      source: 'Diagnóstico COM-B',
      weight: f.dimension === 'Entorno' ? 0.22 : (f.dimension === 'Capacidad' ? 0.20 : 0.16)
    }));

  const systemBarriers = [
    ...sysConds.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type || 'Condición sistémica',
      source: c.source || 'Pensamiento sistémico',
      weight: 0.20
    })),
    ...diagBarriers
  ].slice(0, 14);

  const nodes = x.nodes || [];
  const edges = x.edges || [];
  const fragileEdges = [];
  edges.forEach((e, idx) => {
    const sName = nodes[e.s]?.name || `Nodo ${e.s}`;
    const tName = nodes[e.t]?.name || `Nodo ${e.t}`;
    const alerts = (e.graphFactors || []).filter(f => f.role === 'Barrera');
    const isWeak = ['Declarada', 'Hipotética', 'Hipótesis'].includes(e.evidence) || Number(e.strength || 2) <= 1;
    const isInvitadoEdge = /invitado/i.test(sName) || /invitado/i.test(tName);
    if (alerts.length || isWeak || isInvitadoEdge) {
      fragileEdges.push({
        index: idx,
        sourceName: sName,
        targetName: tName,
        relation: e.relation || e.label || 'Interacción',
        evidence: e.evidence || 'Observada',
        alerts: alerts.map(a => a.name).join(', ') || (isInvitadoEdge ? 'Canal crítico de acogida e integración' : 'Enlace débil / proyectado'),
        boost: isInvitadoEdge ? 0.28 : (alerts.length ? 0.22 : 0.15)
      });
    }
  });

  const actions = (x.actions || []).map((a, idx) => ({
    index: idx,
    name: a.title || a.name || `Intervención ${idx + 1}`,
    dimension: a.dimension || 'General',
    audienceId: a.audienceId || '',
    status: a.status || 'Pendiente'
  }));

  return { systemBarriers, fragileEdges, actions };
}

function simComputeEngine(x) {
  const auds = x.audiences || [];
  const people = x.audiencePeople || [];
  const behs = x.behaviors || [];
  const levers = simExtractLevers(x);

  const totalDeclared = Number(x.population) || auds.reduce((acc, a) => acc + (Number(a.population) || 0), 0) || people.length || 310;

  const diagValues = Object.values(x.behaviorDiagnosis || {}).filter(Boolean);
  const calcDimScore = (dim) => {
    const items = diagValues.filter(d => d.dimension === dim);
    if (!items.length) return 0.62;
    const fac = items.filter(d => d.role === 'Facilitador').length;
    const bar = items.filter(d => d.role === 'Barrera').length;
    return Math.max(0.25, Math.min(0.92, 0.60 + (fac * 0.08) - (bar * 0.09)));
  };

  const baseC = calcDimScore('Capacidad');
  const baseM = calcDimScore('Motivación');
  const baseO = calcDimScore('Entorno');

  const totalSystemFriction = Math.min(0.65, levers.systemBarriers.reduce((acc, b) => acc + b.weight, 0) || 0.38);
  const relievedFriction = levers.systemBarriers
    .filter(b => simActiveSystem[b.id])
    .reduce((acc, b) => acc + b.weight, 0);

  const repairedEdgeBoost = levers.fragileEdges
    .filter(e => simActiveEdges[e.index])
    .reduce((acc, e) => acc + e.boost, 0);

  const activeActionsCount = levers.actions.filter(a => simActiveActions[a.index]).length;
  const actionBoost = Math.min(0.25, activeActionsCount * 0.07);

  const audienceResults = (auds.length ? auds : [
    { id: 'aud-admin', name: 'Administrador', population: Math.round(totalDeclared * 0.1), position: 'Promotor', authority: 'Alta' },
    { id: 'aud-team', name: 'Miembro de Equipo', population: Math.round(totalDeclared * 0.6), position: 'Pasivo', authority: 'Media' },
    { id: 'aud-guest', name: 'Invitado', population: Math.round(totalDeclared * 0.3), position: 'Pasivo', authority: 'Baja' }
  ]).map((a, idx) => {
    const aName = a.name || a.nombre || `Audiencia ${idx + 1}`;
    const pop = Number(a.population) || Math.max(1, Math.round(totalDeclared / Math.max(1, auds.length)));
    const posFactor = a.position === 'Promotor' ? 1.15 : (['Probable Resistente', 'Saboteador Abierto', 'Saboteador Oculto'].includes(a.position) ? 0.72 : 0.92);

    const touchesFragile = levers.fragileEdges.some(e =>
      e.sourceName.toLowerCase().includes(aName.toLowerCase()) ||
      e.targetName.toLowerCase().includes(aName.toLowerCase())
    );
    const touchesRepaired = levers.fragileEdges.some(e =>
      simActiveEdges[e.index] && (
        e.sourceName.toLowerCase().includes(aName.toLowerCase()) ||
        e.targetName.toLowerCase().includes(aName.toLowerCase())
      )
    );

    const combBase = Math.pow(baseC * baseM * baseO, 1 / 3) * posFactor;
    const combIntervened = Math.min(0.96, combBase + (relievedFriction * 0.35) + actionBoost);

    const netBase = touchesFragile ? 0.32 : 0.54;
    const netIntervened = Math.min(0.95, netBase + repairedEdgeBoost + (touchesRepaired ? 0.18 : 0.06));

    const remainingFriction = Math.max(0.06, totalSystemFriction - relievedFriction);
    const baselineCeiling = Math.max(0.18, Math.min(0.55, 0.72 - totalSystemFriction - (touchesFragile ? 0.15 : 0.05)));

    const synergyBonus = (relievedFriction > 0 && repairedEdgeBoost > 0) ? 0.14 : 0;
    const intervenedCeiling = Math.max(
      baselineCeiling,
      Math.min(0.94, 0.78 - remainingFriction + (repairedEdgeBoost * 0.45) + actionBoost + synergyBonus)
    );

    const baseSeries = [];
    const intSeries = [];
    for (let w = 1; w <= simWeeks; w++) {
      const progress = 1 - Math.exp(-0.26 * w);
      const reboundPenalty = (w > 5 && totalSystemFriction > 0.25) ? (w - 5) * 0.012 : 0;
      const bVal = Math.max(0.08, Math.min(baselineCeiling, (combBase * 0.55 + netBase * 0.45) * progress - reboundPenalty));

      const partialRebound = (repairedEdgeBoost > 0 && relievedFriction === 0 && w > 6) ? (w - 6) * 0.018 : 0;
      const iVal = Math.max(bVal, Math.min(intervenedCeiling, (combIntervened * 0.52 + netIntervened * 0.48) * progress - partialRebound));

      baseSeries.push(Math.round(bVal * 100));
      intSeries.push(Math.round(iVal * 100));
    }

    const finalBasePct = baseSeries.at(-1) || 20;
    const finalIntPct = intSeries.at(-1) || finalBasePct;

    const buildStages = (sustainPct) => {
      const sustains = Math.round((sustainPct / 100) * pop);
      const rem1 = Math.max(0, pop - sustains);
      const performs = Math.round(rem1 * Math.min(0.55, (sustainPct / 100) * 0.75 + 0.12));
      const rem2 = Math.max(0, rem1 - performs);
      const tries = Math.round(rem2 * 0.48);
      const understands = Math.max(0, rem2 - tries);
      return { understands, tries, performs, sustains };
    };

    const behList = behs.filter(b => b.scope !== 'specific' || (b.audienceIds || []).includes(a.id));

    return {
      id: a.id || `aud-${idx}`,
      name: aName,
      population: pop,
      impact: a.impact || 'Sin evaluar',
      authority: a.authority || 'Media',
      position: a.position || 'Pasivo',
      quadrant: typeof audQuadrant === 'function' ? audQuadrant(a) : null,
      behaviors: behList.length ? behList : behs.slice(0, 4),
      baseSustainPct: finalBasePct,
      intSustainPct: finalIntPct,
      deltaPct: finalIntPct - finalBasePct,
      baseSeries,
      intSeries,
      baseStages: buildStages(finalBasePct),
      intStages: buildStages(finalIntPct),
      bottleneckWarning: /admin/i.test(aName) && relievedFriction === 0
        ? 'Riesgo alto de sobrecarga operativa en nodo central si no se desactivan fricciones del sistema.'
        : (/invitado/i.test(aName) && !touchesRepaired
          ? 'Umbral de contagio complejo bloqueado: requiere activar el canal de acogida Invitado → Miembro de Equipo.'
          : '')
    };
  });

  const totalPop = audienceResults.reduce((acc, r) => acc + r.population, 0) || totalDeclared;
  const weightedBase = Math.round(audienceResults.reduce((acc, r) => acc + (r.baseSustainPct * r.population), 0) / totalPop);
  const weightedInt = Math.round(audienceResults.reduce((acc, r) => acc + (r.intSustainPct * r.population), 0) / totalPop);

  return {
    totalPopulation: totalPop,
    baseC: Math.round(baseC * 100),
    baseM: Math.round(baseM * 100),
    baseO: Math.round(baseO * 100),
    weightedBase,
    weightedInt,
    deltaGlobal: weightedInt - weightedBase,
    relievedFriction: Math.round(relievedFriction * 100),
    repairedEdgeBoost: Math.round(repairedEdgeBoost * 100),
    audiences: audienceResults,
    levers
  };
}

function simSaveScenarioToActions() {
  const x = current();
  if (!x) return;
  const sim = simComputeEngine(x);
  const activeSys = sim.levers.systemBarriers.filter(b => simActiveSystem[b.id]).map(b => b.name);
  const activeEdg = sim.levers.fragileEdges.filter(e => simActiveEdges[e.index]).map(e => `${e.sourceName} → ${e.targetName}`);

  if (!activeSys.length && !activeEdg.length) {
    return alert('Activa al menos una palanca del Sistema o de la Red antes de guardar el escenario.');
  }

  x.experiments = x.experiments || [];
  x.experiments.push({
    id: 'sim-' + Date.now().toString(36),
    name: `Escenario Simulado (+${sim.deltaGlobal} pts de adopción sostenida)`,
    audience: sim.audiences.map(a => `${a.name}: ${a.baseSustainPct}% → ${a.intSustainPct}%`).join(' | '),
    intervention: [
      activeSys.length ? `Desbloqueo Sistémico: ${activeSys.join('; ')}` : '',
      activeEdg.length ? `Activación Relacional: ${activeEdg.join('; ')}` : ''
    ].filter(Boolean).join(' · '),
    assumption: `Modelo híbrido COM-B + Contagio Complejo (Centola) + Dinámica de Sistemas (${simWeeks} semanas).`,
    risk: activeSys.length === 0 ? 'Riesgo de rebote homeostático por no remover barreras del sistema.' : 'Controlado mediante intervención integral Sistema + Red.',
    date: new Date().toISOString().slice(0, 10)
  });
  save();
  alert('Escenario guardado exitosamente en el registro de escenarios de la iniciativa.');
  render();
}

function renderSimulacionAgentes(a, head, x) {
  simInitState(x);
  const behs = x.behaviors || [];
  const sim = simComputeEngine(x);
  simLastResult = sim;

  const activeSysCount = sim.levers.systemBarriers.filter(b => simActiveSystem[b.id]).length;
  const activeEdgeCount = sim.levers.fragileEdges.filter(e => simActiveEdges[e.index]).length;
  const activeActCount = sim.levers.actions.filter(ac => simActiveActions[ac.index]).length;

  let regimeNotice = '';
  if (activeSysCount === 0 && activeEdgeCount === 0 && activeActCount === 0) {
    regimeNotice = `<div class="notice" style="border-left:4px solid #efb957">
      <b>Estado Base (Sin intervención simulada):</b> Con las barreras actuales del sistema y los enlaces frágiles de la red, la adopción sostenida se estanca en un <b>${sim.weightedBase}%</b> (techo homeostático de Lewin/Sterman). Activa palancas abajo para simular el desbloqueo.
    </div>`;
  } else if (activeEdgeCount > 0 && activeSysCount === 0) {
    regimeNotice = `<div class="notice" style="border-left:4px solid #ed837f">
      <b>⚠️ Alerta Sistémica (Efecto Rebote):</b> Estás fortaleciendo enlaces en la red (${activeEdgeCount}), pero dejaste intactos los frenos del sistema. Según la dinámica de sistemas (Sterman), los agentes llegan a "Probar", pero el bucle de freno genera recaída después de la semana 6. Combínalo con palancas del Sistema.
    </div>`;
  } else if (activeSysCount > 0 && activeEdgeCount === 0) {
    regimeNotice = `<div class="notice" style="border-left:4px solid #59b9ff">
      <b>ℹ️ Desbloqueo sin Tracción de Red:</b> Redujiste barreras estructurales (${activeSysCount}), mejorando la disposición individual (COM-B), pero los enlaces puente siguen débiles. Según el modelo de Contagio Complejo de Centola, falta validación entre pares (ej. Invitado → Miembro de Equipo) para acelerar el hábito.
    </div>`;
  } else {
    regimeNotice = `<div class="notice" style="border-left:4px solid #20c5aa">
      <b>✦ Sinergia Sistémico-Relacional Activada:</b> Al destrabar las barreras del sistema (${activeSysCount}) y reparar los canales críticos de la red (${activeEdgeCount}), se rompe el umbral de resistencia y la adopción sostenida sube de <b>${sim.weightedBase}% a ${sim.weightedInt}% (+${sim.deltaGlobal} pts)</b> en ${simWeeks} semanas.
    </div>`;
  }

  a.innerHTML = `${head}
  <section class="panel" style="margin-bottom:16px">
    <div class="flex" style="justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <span class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:1px">Análisis · Simulación Computacional de Agentes</span>
        <h2 style="margin:4px 0">${safe(x.name || 'Iniciativa')}</h2>
        <p class="muted" style="max-width:860px;margin:4px 0">${safe(x.objective || x.description || '')} · <b>${sim.totalPopulation} personas</b></p>
      </div>
      <div class="flex" style="gap:8px;flex-wrap:wrap">
        <button class="primary" type="button" onclick="simActivateAllRecommended(current())">⚡ Simular Intervención Integral (Sistema + Red)</button>
        <button class="secondary" type="button" onclick="simResetLevers()">↺ Restaurar Estado Base</button>
        <button class="secondary" type="button" onclick="simSaveScenarioToActions()">💾 Guardar Escenario</button>
      </div>
    </div>

    <div class="flex" style="gap:16px;margin-top:14px;flex-wrap:wrap;align-items:center">
      <label style="min-width:280px;margin:0">Comportamiento foco a simular
        <select onchange="simSelectBehavior(this.value)">
          <option value="all" ${simSelectedBehavior === 'all' ? 'selected' : ''}>Todos los comportamientos de la iniciativa (${behs.length})</option>
          ${behs.map((b, i) => `<option value="${safe(String(b.id ?? i))}" ${String(b.id ?? i) === String(simSelectedBehavior) ? 'selected' : ''}>${safe(b.name || 'Comportamiento')}</option>`).join('')}
        </select>
      </label>
      <label style="min-width:190px;margin:0">Horizonte de simulación
        <select onchange="simSetWeeks(this.value)">
          ${[8, 12, 16, 24].map(w => `<option value="${w}" ${simWeeks === w ? 'selected' : ''}>${w} semanas</option>`).join('')}
        </select>
      </label>
      <div class="muted" style="font-size:12px;padding-top:18px">
        Motor científico: <b>COM-B (Michie)</b> · <b>Contagio Complejo (Centola)</b> · <b>Dinámica de Sistemas (Lewin/Sterman)</b>
      </div>
    </div>
  </section>

  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:16px">
    <div class="dash-card" style="border-left:3px solid #20c5aa">
      <small class="muted">ADOPCIÓN SOSTENIDA (BASE → SIMULADA)</small>
      <div style="font-size:26px;font-weight:700;margin:6px 0">
        ${sim.weightedBase}% <span style="color:#20c5aa">→ ${sim.weightedInt}%</span>
      </div>
      <small style="color:${sim.deltaGlobal > 0 ? '#6ee3a7' : '#b8d0df'}">
        ${sim.deltaGlobal > 0 ? `+${sim.deltaGlobal} pts porcentuales (${Math.round((sim.deltaGlobal / 100) * sim.totalPopulation)} personas adicionales)` : 'Activa palancas para simular impacto'}
      </small>
    </div>

    <div class="dash-card" style="border-left:3px solid #59b9ff">
      <small class="muted">ÍNDICE COM-B DEL AGENTE (DIAGNÓSTICO)</small>
      <div style="font-size:18px;font-weight:700;margin:8px 0">
        C: ${sim.baseC}% · M: ${sim.baseM}% · O: ${sim.baseO}%
      </div>
      <small class="muted">Capacidad, Motivación y Oportunidad/Entorno base</small>
    </div>

    <div class="dash-card" style="border-left:3px solid #ed837f">
      <small class="muted">FRENOS SISTÉMICOS DESBLOQUEADOS</small>
      <div style="font-size:24px;font-weight:700;margin:6px 0">
        ${activeSysCount} / ${sim.levers.systemBarriers.length}
      </div>
      <small class="muted">Reducción de fricción homeostática: -${sim.relievedFriction}%</small>
    </div>

    <div class="dash-card" style="border-left:3px solid #efb957">
      <small class="muted">PUENTES DE RED REPARADOS (CENTOLA)</small>
      <div style="font-size:24px;font-weight:700;margin:6px 0">
        ${activeEdgeCount} / ${sim.levers.fragileEdges.length}
      </div>
      <small class="muted">Impulso de contagio relacional: +${sim.repairedEdgeBoost}%</small>
    </div>
  </div>

  ${regimeNotice}

  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin:16px 0">
    <section class="panel" style="border-top:3px solid #ed837f">
      <h3 style="margin-top:0">1. Palancas del Sistema (Lewin / Sterman)</h3>
      <p class="muted" style="font-size:12.5px">Desactiva barreras del Diagnóstico y bucles de compensación de Pensamiento Sistémico que frenan el hábito:</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:290px;overflow:auto;padding-right:4px">
        ${sim.levers.systemBarriers.length ? sim.levers.systemBarriers.map(b => `
          <label class="dash-card" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:0;border-color:${simActiveSystem[b.id] ? '#20c5aa' : 'rgba(255,255,255,0.08)'}">
            <input type="checkbox" ${simActiveSystem[b.id] ? 'checked' : ''} onchange="simToggleSystem('${safe(b.id)}')" style="width:auto;margin-top:3px">
            <div>
              <b style="font-size:13px">${safe(b.name)}</b>
              <div class="muted" style="font-size:11.5px">${safe(b.type)} · ${safe(b.source)}</div>
            </div>
          </label>
        `).join('') : '<p class="muted">No hay barreras registradas en Pensamiento Sistémico o Diagnóstico.</p>'}
      </div>
    </section>

    <section class="panel" style="border-top:3px solid #efb957">
      <h3 style="margin-top:0">2. Palancas de la Red (Contagio de Centola)</h3>
      <p class="muted" style="font-size:12.5px">Fortalece los enlaces con alerta (⚠️) o débiles del Grafo de Adopción para superar el umbral de validación social:</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:290px;overflow:auto;padding-right:4px">
        ${sim.levers.fragileEdges.length ? sim.levers.fragileEdges.map(e => `
          <label class="dash-card" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:0;border-color:${simActiveEdges[e.index] ? '#20c5aa' : 'rgba(255,255,255,0.08)'}">
            <input type="checkbox" ${simActiveEdges[e.index] ? 'checked' : ''} onchange="simToggleEdge(${e.index})" style="width:auto;margin-top:3px">
            <div>
              <b style="font-size:13px">${safe(e.sourceName)} → ${safe(e.targetName)}</b>
              <div class="muted" style="font-size:11.5px">[${safe(e.relation)}] · ⚠️ ${safe(e.alerts)}</div>
            </div>
          </label>
        `).join('') : '<p class="muted">No se detectaron enlaces frágiles o con alerta en el grafo.</p>'}
      </div>
    </section>

    <section class="panel" style="border-top:3px solid #20c5aa">
      <h3 style="margin-top:0">3. Intervenciones Activas (COM-B)</h3>
      <p class="muted" style="font-size:12.5px">Simula el efecto directo de ejecutar las acciones e intervenciones diseñadas para las audiencias:</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:290px;overflow:auto;padding-right:4px">
        ${sim.levers.actions.length ? sim.levers.actions.map(ac => `
          <label class="dash-card" style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:0;border-color:${simActiveActions[ac.index] ? '#20c5aa' : 'rgba(255,255,255,0.08)'}">
            <input type="checkbox" ${simActiveActions[ac.index] ? 'checked' : ''} onchange="simToggleAction(${ac.index})" style="width:auto;margin-top:3px">
            <div>
              <b style="font-size:13px">${safe(ac.name)}</b>
              <div class="muted" style="font-size:11.5px">Dimensión: ${safe(ac.dimension)} · Estado actual: ${safe(ac.status)}</div>
            </div>
          </label>
        `).join('') : '<p class="muted">Aún no hay acciones registradas en Implementación.</p>'}
      </div>
    </section>
  </div>

  <div class="grid" style="grid-template-columns:1.15fr 1fr;gap:14px;margin-top:16px">
    <section class="panel">
      <h3 style="margin-top:0">Mapa de audiencias y propagación simulada</h3>
      <p class="muted" style="font-size:12.5px">Evolución en la escalera de adopción (Comprende → Prueba → Realiza → Sostiene) en ${simWeeks} semanas:</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${sim.audiences.map(aud => `
          <div class="dash-card" style="padding:14px">
            <div class="flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <strong style="font-size:16px">${safe(aud.name)}</strong>
                <div class="muted" style="font-size:12px">
                  ${aud.population} personas · Impacto: ${safe(aud.impact)} · Posición: ${safe(aud.position)} ${aud.quadrant ? `· ${aud.quadrant}` : ''}
                </div>
              </div>
              <div style="text-align:right">
                <span style="font-size:13px" class="muted">Sostiene:</span>
                <b style="font-size:18px;margin-left:4px">${aud.baseSustainPct}% → <span style="color:#20c5aa">${aud.intSustainPct}%</span></b>
                ${aud.deltaPct > 0 ? `<span style="color:#6ee3a7;font-size:12px;margin-left:4px">(+${aud.deltaPct}%)</span>` : ''}
              </div>
            </div>

            <div style="margin:10px 0">
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px" class="muted">
                <span>Tracción Base (${aud.baseSustainPct}%)</span>
                <span>Tracción Simulada (${aud.intSustainPct}%)</span>
              </div>
              <div style="height:10px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;position:relative">
                <div style="height:100%;width:${aud.intSustainPct}%;background:linear-gradient(90deg,#20c5aa,#6ee3a7);border-radius:6px"></div>
                <div style="position:absolute;top:0;left:${aud.baseSustainPct}%;bottom:0;width:2px;background:#efb957" title="Techo Base"></div>
              </div>
            </div>

            <div class="grid" style="grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px;text-align:center;font-size:11.5px">
              <div style="background:rgba(255,255,255,0.04);padding:6px;border-radius:6px">
                <div class="muted">Comprende</div>
                <b>${aud.baseStages.understands} → ${aud.intStages.understands}</b>
              </div>
              <div style="background:rgba(255,255,255,0.04);padding:6px;border-radius:6px">
                <div class="muted">Prueba</div>
                <b>${aud.baseStages.tries} → ${aud.intStages.tries}</b>
              </div>
              <div style="background:rgba(255,255,255,0.04);padding:6px;border-radius:6px">
                <div class="muted">Realiza</div>
                <b>${aud.baseStages.performs} → ${aud.intStages.performs}</b>
              </div>
              <div style="background:rgba(32,197,170,0.14);padding:6px;border-radius:6px;border:1px solid rgba(32,197,170,0.35)">
                <div style="color:#6ee3a7">Sostiene</div>
                <b>${aud.baseStages.sustains} → ${aud.intStages.sustains}</b>
              </div>
            </div>

            ${aud.bottleneckWarning ? `<p style="margin:8px 0 0;font-size:11.5px;color:#efb957">⚠️ ${safe(aud.bottleneckWarning)}</p>` : ''}
          </div>
        `).join('')}
      </div>
    </section>

    <section class="panel">
      <h3 style="margin-top:0">Comportamientos por audiencia y curva temporal</h3>
      <p class="muted" style="font-size:12.5px">Comportamientos meta asociados y proyección semana a semana:</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${sim.audiences.map(aud => `
          <div class="dash-card" style="padding:14px">
            <strong style="font-size:15px">${safe(aud.name)}</strong>
            <p class="muted" style="font-size:12.5px;margin:4px 0 10px">${aud.population} personas · Impacto: ${safe(aud.impact)}</p>
            ${aud.behaviors.length ? aud.behaviors.map(b => `
              <div style="margin-bottom:8px;font-size:13px;line-height:1.4">
                ◈ ${safe(b.name || b.behavior || 'Comportamiento')}
              </div>
            `).join('') : '<p class="muted" style="font-size:12px">Sin comportamientos específicos asignados.</p>'}
            <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.07);font-size:11.5px" class="muted">
              Curva (${simWeeks} sem): Sem 1 (${aud.intSeries[0]}%) → Sem ${Math.ceil(simWeeks/2)} (${aud.intSeries[Math.floor(simWeeks/2)-1]}%) → Sem ${simWeeks} (<b>${aud.intSeries.at(-1)}%</b>)
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  </div>
  `;
}
