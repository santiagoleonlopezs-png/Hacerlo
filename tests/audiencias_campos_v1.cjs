/* Datos ficticios: importación, persistencia, filtros y estados por alcance. */
const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const dom=new JSDOM('<!doctype html><main id="app"></main>',{runScripts:'dangerously',url:'https://fixture.invalid'});
const w=dom.window,d=w.document,errors=[],alerts=[],snapshots=[];
w.addEventListener('error',e=>errors.push(e.error));
w.safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.crypto.randomUUID=randomUUID;w.scrollTo=()=>{};w.alert=m=>alerts.push(m);w.confirm=()=>true;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};
let project={id:'initiative-a',audiences:[{id:'a',name:'Equipo A'},{id:'b',name:'Equipo B'}],
 audiencePersonFields:[{id:'legacy-specific',label:'Estado específico',scope:'behavior',behaviorId:'b1'}],
 behaviors:[{id:'b1',name:'Registrar seguimiento',scope:'specific',audienceIds:['a']},{id:'b2',name:'Consultar novedades',scope:'all'}],
 audiencePeople:[{id:'old-person',code:'001',audienceId:'a',name:'Ana',adoptionHistory:[{id:'obs',behaviorId:'b1',stage:'performs',observedOn:'2026-11-01',recordedAt:'2026-11-01T12:00:00Z'}]}]};
w.current=()=>project;w.save=()=>snapshots.push(JSON.stringify(project));
for(const path of ['src/modules/encuestas/motor.js','src/modules/diseno/audiencias.js']){
 const script=d.createElement('script');script.textContent=fs.readFileSync(path,'utf8');d.body.append(script);
}
w.render=()=>{d.getElementById('app').innerHTML=w.audienceRegistration(project);};
const change=(el,value)=>{assert.ok(el,'Control disponible');el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));};
const submit=form=>{assert.ok(form,'Formulario disponible');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
const run=code=>w.eval(code);
const key=f=>'custom:'+f.id,token=value=>JSON.stringify(['value',value]);
const field=label=>project.audiencePersonFields.find(f=>f.label===label);
const people=()=>Array.from(w.audPersonRows(project),p=>p.code);

async function exercise(){
 w.audInitPeopleUI(project);w.render();
 const history=JSON.stringify(project.audiencePeople[0].adoptionHistory),audiences=JSON.stringify(project.audiences);
 const csv='codigo,nombre,audiencia,cargo,vicepresidencia,Estado general,Estado específico,Cupo,__proto__,<img src=x onerror=alert(1)>\n'+
 '001,Ana,Equipo A,Analista,VP Uno,Activo,Pendiente,0,valor seguro,<script>ejemplo</script>\n'+
 '002,Bea,Equipo A,Líder,VP Dos,Sin dato,Completado,2,otro,Texto\n'+
 '003,Camilo,Equipo B,Analista,VP Uno,Activo,,3,otro,Texto\n'+
 '004,Diana,Equipo A,Analista,VP Dos,,,4,otro,Texto';
 const input={files:[{name:'personas.csv',size:csv.length,text:async()=>csv}]};
 await w.previewAudienceCSVV22(input);
 assert.equal(d.querySelector('[data-aud-map="5"]').value,'custom:5','Columnas desconocidas se conservan por defecto');
 assert.equal(d.querySelectorAll('#aud-v22-import img').length,0,'Encabezados tratados como texto');
 const extra=d.querySelector('[data-aud-column="6"]');
 assert.equal(extra.querySelector('[data-aud-scope]').type,'hidden','El alcance no se ofrece en columnas del Excel');
 assert.equal(extra.querySelector('[data-aud-behavior]').value,'b1','Se conserva la vinculación de campos existentes');
 submit(d.querySelector('#aud-v22-import form'));
 assert.match(d.getElementById('aud-mapped-preview').textContent,/4 filas válidas/);
 assert.match(d.getElementById('aud-mapped-preview').textContent,/Estado específico.*Pendiente.*Por comportamiento/s);
 assert.equal(project.audiencePersonFields.length,1,'La vista previa no agrega campos');
 change(d.getElementById('aud-v22-mode'),'update');
 w.commitAudienceCSVV22();
 assert.equal(project.audiencePeople.length,4);
 assert.equal(project.audiencePersonFields.length,5);
 assert.equal(project.audiencePeople[0].id,'old-person');
 assert.equal(JSON.stringify(project.audiencePeople[0].adoptionHistory),history,'Actualizar Excel conserva valoraciones');
 assert.equal(JSON.stringify(project.audiences),audiences,'La importación conserva las audiencias');
 assert.equal(field('Estado general').scope,'general');
 assert.equal(field('Estado específico').behaviorId,'b1');
 assert.equal(project.audiencePeople[0].customFields[field('Cupo').id],'0','Cero es un dato');
 assert.equal(project.audiencePeople[0].customFields[field('__proto__').id],'valor seguro');
 assert.equal({}.polluted,undefined);
 const listFilters=d.querySelector('.aud-list-data-filters');
 assert.ok(listFilters,'Los filtros de la lista aparecen directamente');
 assert.equal(listFilters.querySelectorAll('.aud-simple-filter-row').length,1,'Una sola fila de filtro al entrar');
 assert.equal(d.querySelector('.aud-view-options').open,false,'Las opciones de vista comienzan plegadas');
 const firstField=listFilters.querySelector('[aria-label="Campo del filtro 1"]');
 assert.ok(Array.from(firstField.options).some(o=>o.value==='person:job'),'Todas las columnas siguen disponibles en Campo');
 assert.equal(listFilters.closest('.aud-more-filters'),null,'Los datos de la lista no quedan dentro de Más filtros');
 const vpFilter=listFilters.querySelector('select[data-aud-filter-key="person:vicepresidency"]');
 assert.ok(vpFilter,'El primer campo queda listo para elegir un valor');
 assert.deepEqual(Array.from(vpFilter.options,o=>o.textContent),['Todos','VP Dos','VP Uno','Sin dato']);
 assert.equal(firstField.selectedOptions[0].textContent,'vicepresidencia','Se conserva el encabezado original');
 assert.equal(listFilters.querySelectorAll('select[data-aud-filter-key]').length,1,'No se despliega un control por cada columna');
 assert.equal(listFilters.querySelector('select[data-aud-filter-key="person:team"]'),null,'No se muestran campos que no llegaron ni tienen datos');
 assert.ok(project.audiencePersonImportColumns.some(c=>c.key==='person:job'&&c.sourceHeader==='cargo'));
 const sourceHeader=project.audiencePersonImportColumns.find(c=>c.key===key(field('<img src=x onerror=alert(1)>')));
 assert.equal(sourceHeader.sourceHeader,'<img src=x onerror=alert(1)>');
 assert.equal(listFilters.querySelector('img'),null,'Los encabezados originales se escapan en los filtros');
 change(vpFilter,token('VP Uno'));assert.deepEqual(people(),['001','003']);
 w.audAddFilterRow();assert.equal(d.querySelectorAll('.aud-simple-filter-row').length,2);
 change(d.querySelector('[aria-label="Campo del filtro 2"]'),'person:job');
 const jobFilter=d.querySelector('.aud-list-data-filters select[data-aud-filter-key="person:job"]');
 change(jobFilter,token('Analista'));assert.deepEqual(people(),['001','003']);
 w.audPersonToggle('old-person',true);
 change(d.querySelector('[aria-label="Campo del filtro 2"]'),key(field('Estado específico')));
 assert.equal(run('audPersonFilters["person:job"]'),undefined,'Cambiar de campo quita la condición anterior');
 assert.equal(run('audPersonSelection.size'),0,'Cambiar un filtro limpia la selección de personas');
 assert.equal(Array.from(d.querySelector('[aria-label="Campo del filtro 2"]').options).some(o=>o.value==='person:vicepresidency'),false,'No se ofrecen campos duplicados en otra fila');
 change(d.querySelector('.aud-list-data-filters select[data-aud-filter-key="'+key(field('Estado específico'))+'"]'),token('Pendiente'));
 assert.deepEqual(people(),['001'],'Los filtros originales y las columnas propias se combinan');
 d.querySelector('button[aria-label="Quitar filtro 2"]').click();
 assert.deepEqual(people(),['001','003'],'Quitar una fila elimina solo esa condición');
 assert.equal(d.querySelectorAll('.aud-simple-filter-row').length,1);
 w.audClearPeopleFilters();assert.equal(people().length,4);
 assert.equal(d.querySelectorAll('.aud-simple-filter-row').length,1,'Limpiar vuelve a una sola fila');
 w.audAddFilterRow();assert.ok(d.querySelectorAll('.aud-simple-filter-row')[1].querySelector('select[disabled]'),'Una fila vacía espera a que se elija Campo');
 assert.equal(people().length,4,'Agregar una fila vacía no cambia los resultados');w.audRemoveFilterRow(1);
 assert.ok(d.querySelector('.aud-list-data-filters select[data-aud-filter-key="person:vicepresidency"]'),'Limpiar conserva los campos y restablece sus valores');
 d.querySelector('.aud-view-options summary').click();
 assert.equal(d.querySelector('.aud-view-options').open,true);
 change(d.querySelector('.aud-viewbar select'),'data');
 assert.equal(d.querySelector('.aud-view-options').open,true,'La vista sigue abierta para poder escoger la columna después');
 change(d.querySelector('.aud-viewbar select'),'adoption');
 d.querySelector('.aud-view-options summary').click();
 assert.equal(d.querySelector('.aud-view-options').open,false,'Las opciones se pueden plegar al terminar');

 // Los nuevos datos sobreviven el mismo JSON usado por la sincronización.
 project=JSON.parse(snapshots.at(-1));w.render();
 w.audChangePeopleView('data');
 change(d.getElementById('aud-data-view-field'),key(field('Estado general')));
 assert.match(d.querySelector('.aud-compact-table').textContent,/Activo/);
 change(d.getElementById('aud-data-view-field'),key(field('<img src=x onerror=alert(1)>')));
 assert.equal(d.querySelector('.aud-compact-table img'),null,'El título de columna también se escapa');
 assert.equal(d.querySelector('.aud-compact-table script'),null,'Los valores son texto');

 w.audAddDataFilter(key(field('Estado general')));
 let filter=d.querySelector('.aud-list-data-filters select[data-aud-filter-key="'+key(field('Estado general'))+'"]');
 change(filter,token('Activo'));
 assert.deepEqual(people(),['001','003']);
 w.audPersonFilter('audienceId','a');
 assert.deepEqual(people(),['001'],'Filtros estándar y propios se combinan');
 w.audSelectFiltered();assert.equal(run('audPersonSelection.size'),1);
 w.audPersonFilter('audienceId','');assert.equal(run('audPersonSelection.size'),0,'Cambiar filtros limpia la selección');
 w.audPersonFilter(key(field('Estado general')),token('Sin dato'));
 assert.deepEqual(people(),['002'],'Valor literal Sin dato se distingue de una celda vacía');
 w.audPersonFilter(key(field('Estado general')),JSON.stringify(['missing']));
 assert.deepEqual(people(),['004']);
 w.audClearPeopleFilters();
 w.audPersonFilter(key(field('Estado específico')),JSON.stringify(['notApplicable']));
 assert.deepEqual(people(),['003'],'No aplica es distinto de Sin dato');
 w.audPersonFilter(key(field('Estado específico')),JSON.stringify(['missing']));
 assert.deepEqual(people(),['004']);
 w.audPersonFilter(key(field('Estado específico')),token('Completado'));
 assert.deepEqual(people(),['002']);
 w.audClearPeopleFilters();w.audPersonFilter('person:vicepresidency',token('VP Uno'));
 assert.deepEqual(people(),['001','003'],'Cualquier campo estándar importado es filtrable');
 w.audClearPeopleFilters();w.audPersonFilter('adoptionState','performs');
 assert.deepEqual(people(),['001'],'Adopción también filtra en la vista de todos los comportamientos');
 w.audClearPeopleFilters();w.audChangePeopleView('adoption');w.audPersonEdit('old-person');
 assert.ok(d.querySelector('#aud-person-drawer').open);

 // Los campos del Excel conservan su nombre, sin el calificativo Transversal.
 assert.doesNotMatch(w.audDataFieldOptions(project),/Transversal/);
 // Edición individual y creación de campos de datos.
 let edit=d.querySelector('form[onsubmit^="audSavePersonData"]');
 edit.elements.namedItem(field('Estado general').id).value='Inactivo';submit(edit);
 assert.equal(project.audiencePeople[0].customFields[field('Estado general').id],'Inactivo');
 let create=d.querySelector('form[onsubmit^="audCreatePersonData"]');
 create.elements.label.value='Seguimiento adicional';create.elements.value.value='En revisión';
 assert.equal(create.elements.scope,undefined,'Crear un campo no ofrece alcance de adopción');submit(create);
 assert.equal(field('Seguimiento adicional').scope,'general');
 assert.equal(project.audiencePeople[0].customFields[field('Estado general').id],'Inactivo');
 assert.equal(JSON.stringify(project.audiencePeople[0].adoptionHistory),history,'Un estado libre no modifica la adopción documentada');
 w.audCloseDrawer();

 // Modificación masiva aplica los campos específicos solo a personas elegibles.
 w.audSelectFiltered();w.audOpenBulk();
 edit=d.querySelector('form[onsubmit^="audSavePersonData"]');
 edit.elements.namedItem(field('Estado específico').id).value='Revisado';submit(edit);
 assert.equal(project.audiencePeople[0].customFields[field('Estado específico').id],'Revisado');
 assert.equal(project.audiencePeople[1].customFields[field('Estado específico').id],'Revisado');
 assert.equal(project.audiencePeople[2].customFields[field('Estado específico').id],'','Fuera de alcance no se modifica');
 assert.equal(project.audiencePeople[0].customFields[field('Estado general').id],'Inactivo','Vacío en edición masiva conserva el valor');
 w.audCloseDrawer();

 // Reimportar reutiliza definiciones y conserva otros campos y valores de adopción.
 const count=project.audiencePersonFields.length;
 await w.previewAudienceCSVV22(input);
 const specific=d.querySelector('[data-aud-column="6"]');
 assert.equal(specific.querySelector('[data-aud-scope]').value,'behavior','Reimportar conserva campos anteriores');
 submit(d.querySelector('#aud-v22-import form'));change(d.getElementById('aud-v22-mode'),'update');w.commitAudienceCSVV22();
 assert.equal(project.audiencePersonFields.length,count);
 assert.equal(JSON.stringify(project.audiencePeople[0].adoptionHistory),history);
 const other=field('Seguimiento adicional');
 assert.equal(project.audiencePeople[0].customFields[other.id],'En revisión');

 // Invalidar la vista previa al cambiar configuración impide confirmar datos viejos.
 await w.previewAudienceCSVV22(input);submit(d.querySelector('#aud-v22-import form'));
 assert.ok(d.getElementById('aud-mapped-preview').textContent.length);
 const own=d.querySelector('[data-aud-column="5"] [data-aud-label]');change(own,'Otro estado');
 assert.equal(d.getElementById('aud-mapped-preview').textContent,'');assert.equal(run('audV22Rows.length'),0);
 const rows=w.audBuildPeopleImport({headers:['c','a','s'],rows:[{c:'x',a:'Equipo B',s:'Completado'}]},['codigo','audiencia',{key:'custom:2',label:'Prueba',scope:'behavior',behaviorId:'b1'}],{},project);
 assert.match(rows[0].errors.join(' '),/no aplica/,'Importación valida alcance por audiencia');
 assert.throws(()=>w.audBuildPeopleImport({headers:['c'],rows:[{c:'x'}]},['nombre'],{},project),/Código de persona/);
 assert.throws(()=>w.audValidatePersonField(project,{label:'X',scope:'behavior',behaviorId:'missing'}),/vigente/);
 const definition=w.audEnsurePersonField(project,{label:'Estado general',scope:'general'});
 assert.equal(definition.id,field('Estado general').id);

 // Transversal pertenece a los estados de adopción, con historial independiente.
 w.audClearPeopleFilters();w.audChangePeopleView('adoption');w.audChangeBehavior('');w.audPersonEdit('old-person');
 const general=run('AUD_GENERAL_ADOPTION'),person=project.audiencePeople[0];
 assert.equal(d.getElementById('aud-adoption-target').value,general,'La ficha permite valorar de forma transversal');
 let adoption=d.querySelector('#aud-adoption-fields form');
 assert.equal(adoption.elements.scope.value,'general');assert.equal(adoption.elements.behaviorId.value,'');
 change(adoption.elements.stage,'understands');adoption.elements.source.value='Entrevista';
 adoption.elements.evidence.value='Explica el propósito del cambio.';submit(adoption);
 assert.equal(w.audGeneralAdoptionState(person),'understands');
 assert.equal(w.audAdoptionState(person,project.behaviors[0]),'performs','El estado transversal conserva la valoración específica');
 assert.equal(w.audAssignedSummary(project,person).assessed,1,'La valoración general no se cuenta como ejecución de cada comportamiento');
 adoption=d.querySelector('#aud-adoption-fields form');assert.equal(adoption.elements.stage.value,'understands','Muestra el estado general actual al editar');
 const generalRecord=w.audLatestAdoption(person,general);
 assert.equal(generalRecord.scope,'general');assert.equal(generalRecord.behaviorId,'');
 assert.match(w.audAdoptionHistoryHTML(person,general),/Explica el propósito/);
 assert.doesNotMatch(w.audAdoptionHistoryHTML(person,'b1'),/Explica el propósito/);
 change(d.getElementById('aud-adoption-target'),'b1');
 adoption=d.querySelector('#aud-adoption-fields form');assert.equal(adoption.elements.stage.value,'performs');
 change(adoption.elements.stage,'tries');adoption.elements.source.value='Práctica';
 adoption.elements.evidence.value='Prueba el registro con orientación.';submit(adoption);
 assert.equal(w.audAdoptionState(person,project.behaviors[0]),'tries');
 assert.equal(w.audGeneralAdoptionState(person),'understands','Valorar un comportamiento conserva el estado transversal');
 change(d.getElementById('aud-adoption-target'),general);
 const observation={scope:'general',behaviorId:'',stage:'understands',observedOn:w.audLocalDate(),source:'Entrevista',evidence:'Reconoce las prácticas del cambio.',context:'observed'};
 assert.throws(()=>w.audRecordAdoption(project,new Set([person.id]),{...observation,source:''}),/fuente/);
 assert.throws(()=>w.audRecordAdoption(project,new Set([person.id]),{...observation,scope:'other'}),/alcance/);
 assert.throws(()=>w.audRecordAdoption(project,new Set([person.id]),{...observation,behaviorId:'b1'}),/alcance general/);
 assert.throws(()=>w.audRecordAdoption(project,new Set([person.id]),{...observation,stage:'sustains',autonomy:'independent'}),/criterio.*transversal/);
 const criterion=d.querySelector('form[onsubmit^="audSaveAdoptionCriteria"]');
 criterion.elements.criteria.value='Mantiene las prácticas clave durante cuatro semanas.';submit(criterion);
 assert.match(project.audienceGeneralAdoptionCriteria,/cuatro semanas/);
 assert.equal(project.behaviors[0].adoptionCriteria,undefined,'Criterio general y específico son independientes');
 w.audRecordAdoption(project,new Set([person.id]),{...observation,stage:'sustains',autonomy:'independent',opportunities:'4',executions:'4'});
 assert.equal(w.audGeneralAdoptionState(person),'sustains');
 assert.equal(w.audAdoptionConsolidated(project).counts.sustains,0,'Los informes por comportamiento no mezclan valoraciones generales');
 assert.throws(()=>w.audRecordAdoption(project,new Set([person.id]),observation,true),/Confirma/);
 w.audCloseDrawer();w.audChangeBehavior(general);w.audInitPeopleUI(project);
 assert.equal(d.getElementById('aud-behavior-picker').value,general,'La opción transversal permanece al renderizar');
 w.audPersonFilter('adoptionState','sustains');assert.deepEqual(people(),['001']);
 assert.match(w.audAdoptionDistribution(project),/Adopción transversal/);
 assert.equal(w.audAdoptionSummary(project,general).counts.sustains,1);
 w.audClearPeopleFilters();w.audSelectFiltered();w.audOpenBulk();
 adoption=d.querySelector('#aud-adoption-fields form');assert.equal(adoption.elements.scope.value,'general');
 change(adoption.elements.stage,'understands');adoption.elements.source.value='Sesión de equipo';
 adoption.elements.evidence.value='Cada persona explica el propósito del cambio.';adoption.elements.bulkEvidence.checked=true;submit(adoption);
 assert.equal(project.audiencePeople.every(p=>w.audGeneralAdoptionState(p)==='understands'),true,'El estado transversal masivo incluye todas las audiencias seleccionadas');
 assert.equal(w.audAdoptionState(person,project.behaviors[0]),'tries');
 project=JSON.parse(snapshots.at(-1));assert.equal(w.audGeneralAdoptionState(project.audiencePeople[0]),'understands','El estado transversal persiste en JSON');
 w.audCloseDrawer();
 w.audChangeBehavior('');w.audPersonFilter('adoptionState','understands');
 assert.equal(people().length,4,'El filtro del resumen incluye los estados transversales que se muestran en la tabla');
 w.audPersonFilter('adoptionState','tries');assert.deepEqual(people(),['001'],'El resumen también permite encontrar estados por comportamiento');
 w.audClearPeopleFilters();
 const old=project;project={id:'initiative-b',audiences:[],behaviors:[],audiencePeople:[]};w.audInitPeopleUI(project);w.render();
 assert.equal(w.audPersonDataFields(project).some(f=>f.key===key(fieldForOld(old))),false,'Campos aislados por iniciativa');
 assert.equal(run('audPersonSelection.size'),0);
 assert.equal(Object.keys(run('audPersonFilters')).some(k=>k.startsWith('custom:')),false);
 const legacy={id:'legacy',audiences:[],behaviors:[],audiencePeople:[{id:'legacy-1',code:'1',name:'Persona',job:'Analista',vicepresidency:'Operaciones',team:'Norte'}]};
 run('audFilterRows=[]');const legacyHTML=w.audDataFiltersHTML(legacy);
 assert.match(legacyHTML,/Vicepresidencia/);assert.match(legacyHTML,/Operaciones/);assert.match(legacyHTML,/person:team/,'Listas ya guardadas tienen todos sus campos disponibles sin reimportar');
 assert.equal(legacy.audiencePersonImportColumns,undefined,'Mostrar filtros no cambia los datos guardados');
 project.audiencePeople.push({id:'p-new',code:'nuevo'});w.audPersonEdit('p-new');
 assert.equal(d.querySelector('#aud-adoption-fields form').elements.scope.value,'general','La valoración transversal funciona sin comportamientos creados');
 w.audRecordAdoption(project,new Set(['p-new']),observation);
 assert.equal(w.audGeneralAdoptionState(project.audiencePeople[0]),'understands');
 assert.equal(errors.length,0,errors.map(e=>e?.message).join('\n'));
 assert.ok(snapshots.length>0);assert.ok(alerts.some(m=>/Personas importadas/.test(m)));
 dom.window.close();console.log('OK · Importación, alcance, filtros, edición individual/masiva, persistencia y aislamiento');
}
function fieldForOld(x){return x.audiencePersonFields[0];}
exercise().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
