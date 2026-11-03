/* HACERLO · Dinámica de sistemas · Modelo_Medición_Madurez_Cambio2.alp
   AnyLogic 8.9.9 · unidad: semana · ecuaciones: Euler · paso fijo: 0.001.
   Cálculo determinista en navegador, no ejecuta AnyLogic ni ajusta sus coeficientes. */
const CA_DYN=(()=>{
 const names=['energia','preparacion','apertura','memoria'];
 const defaults={energia:15.75,preparacion:43.18,apertura:38.36,memoria:30.30};
 const rates={
  tasaRecuperacionEnergia:0.05,
  tasaDesgasteEnergia:0.06,
  tasaDesarrolloPreparacion:0.35,
  tasaPerdidaPreparacion:0.45,
  tasaDesarrolloApertura:0.02,
  tasaResistenciaCambio:0.45,
  tasaAprendizajeOrganizacional:0.05,
  tasaPerdidaMemoria:0.40
 };
 const controls=[
  {id:'cambio',label:'Intensidad del cambio'},
  {id:'cargaOperativa',label:'Carga operativa'},
  {id:'liderazgo',label:'Liderazgo'},
  {id:'claridadCambio',label:'Claridad del cambio'},
  {id:'aprendizaje',label:'Aprendizaje'},
  {id:'acompanamiento',label:'Acompañamiento'}
 ];
 const clampInput=(v)=>{v=Number(v);return Number.isFinite(v)?Math.min(100,Math.max(-100,v)):0};
 function state(initial){
  return names.map(k=>Number.isFinite(Number(initial?.[k]))?Number(initial[k]):defaults[k]);
 }
 function inputs(value){
  return Object.fromEntries(controls.map(c=>[c.id,clampInput(value?.[c.id])]));
 }
 function summaries(v){
  const [energia,preparacion,apertura,memoria]=v;
  return {energia,preparacion,apertura,memoria,
   madurez:0.35*energia+0.30*preparacion+0.20*apertura+0.15*memoria,
   brecha:Math.max(energia,preparacion,apertura,memoria)-Math.min(energia,preparacion,apertura,memoria)};
 }
 function derivative(v,input){
  const [energiaAdaptativa,preparacionCambio,aperturaAdaptativa,memoriaAdaptativa]=v;
  const efectoCambio=input.cambio/100.0,efectoCargaOperativa=input.cargaOperativa/100.0;
  const efectoLiderazgo=input.liderazgo/100.0,efectoClaridad=input.claridadCambio/100.0;
  const efectoAprendizaje=input.aprendizaje/100.0,efectoAcompanamiento=input.acompanamiento/100.0;
  const recuperacionEnergia=rates.tasaRecuperacionEnergia*
    (Math.max(0,efectoAcompanamiento)+15.0*Math.max(0,-efectoCargaOperativa))*
    (100-energiaAdaptativa)/200.0;
  const desgasteEnergia=rates.tasaDesgasteEnergia*
    (10.0*Math.max(0,efectoCambio)+25.0*Math.max(0,efectoCargaOperativa)+2.0*Math.max(0,efectoAprendizaje))*
    (energiaAdaptativa+100)/200.0;
  const desarrolloPreparacion=rates.tasaDesarrolloPreparacion*
    (0.30*Math.max(0,efectoLiderazgo)+0.25*Math.max(0,efectoClaridad)+0.30*Math.max(0,efectoAprendizaje)+0.15*Math.max(0,memoriaAdaptativa))*
    Math.max(0.25,(energiaAdaptativa+100)/200.0)*
    (100-preparacionCambio)/200.0;
  const perdidaPreparacion=rates.tasaPerdidaPreparacion*
    ((100-energiaAdaptativa)/100.0)*
    (energiaAdaptativa>=0?1.0:1.5)*
    (preparacionCambio+100)/200.0;
  const desarrolloApertura=rates.tasaDesarrolloApertura*
    Math.max(0,memoriaAdaptativa)*
    (100-aperturaAdaptativa)/200.0;
  const resistenciaCambio=rates.tasaResistenciaCambio*
    ((100-preparacionCambio)/100.0)*
    (aperturaAdaptativa+100)/200.0;
  const aprendizajeOrganizacional=rates.tasaAprendizajeOrganizacional*
    Math.max(0,aperturaAdaptativa)*
    (100-memoriaAdaptativa)/200.0;
  const perdidaMemoria=rates.tasaPerdidaMemoria*
    (memoriaAdaptativa+100)/200.0;
  return [
   recuperacionEnergia-desgasteEnergia,
   desarrolloPreparacion-perdidaPreparacion,
   desarrolloApertura-resistenciaCambio,
   aprendizajeOrganizacional-perdidaMemoria
  ];
 }
 function run(options={}){
  const start=state(options.initial),forcing=inputs(options.inputs);
  const weeks=Math.max(1,Math.min(104,Math.round(Number(options.weeks)||52)));
  const dt=0.001,substeps=1000,v=start.slice(),series=[];
  series.push({week:0,...summaries(v)});
  for(let week=1;week<=weeks;week++){
   for(let i=0;i<substeps;i++){
    const dy=derivative(v,forcing);
    for(let k=0;k<4;k++)v[k]+=dt*dy[k];
    if(!v.every(Number.isFinite))throw Error('El modelo produjo valores no finitos.');
   }
   series.push({week,...summaries(v)});
  }
  return {series,initial:summaries(start),final:summaries(v),controls:forcing,weeks,
   model:'Modelo_Medición_Madurez_Cambio2.alp',anyLogicVersion:'8.9.9',
   integration:'Euler',stepWeeks:dt,assumptions:'Entradas constantes durante toda la simulación.'};
 }
 return Object.freeze({defaults:Object.freeze(defaults),rates:Object.freeze(rates),controls:Object.freeze(controls),names:Object.freeze(names),inputs,summaries,derivative,run});
})();
