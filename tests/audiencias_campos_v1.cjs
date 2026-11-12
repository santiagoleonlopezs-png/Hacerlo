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
 change(extra.querySelector('[data-aud-scope]'),'behavior');
 assert.equal(extra.querySelector('[data-aud-behavior-label]').hidden,false);
 change(extra.querySelector('[data-aud-behavior]'),'b1');
 submit(d.querySelector('#aud-v22-import form'));
 assert.match(d.getElementById('aud-mapped-preview').textContent,/4 filas válidas/);
 assert.match(d.getElementById('aud-mapped-preview').textContent,/Estado específico.*Pendiente.*Por comportamiento/s);
 assert.equal(project.audiencePersonFields,undefined,'La vista previa no guarda datos');
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

 // Los nuevos datos sobreviven el mismo JSON usado por la sincronización.
 project=JSON.parse(snapshots.at(-1));w.render();
 w.audChangePeopleView('data');
 change(d.getElementById('aud-data-view-field'),key(field('Estado general')));
 assert.match(d.querySelector('.aud-compact-table').textContent,/Activo/);
 change(d.getElementById('aud-data-view-field'),key(field('<img src=x onerror=alert(1)>')));
 assert.equal(d.querySelector('.aud-compact-table img'),null,'El título de columna también se escapa');
 assert.equal(d.querySelector('.aud-compact-table script'),null,'Los valores son texto');

 w.audAddDataFilter(key(field('Estado general')));
 let filter=d.querySelector('.aud-data-filter-row select');
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

 // Edición individual y creación del mismo nombre con alcances independientes.
 let edit=d.querySelector('form[onsubmit^="audSavePersonData"]');
 edit.elements.namedItem(field('Estado general').id).value='Inactivo';submit(edit);
 assert.equal(project.audiencePeople[0].customFields[field('Estado general').id],'Inactivo');
 let create=d.querySelector('form[onsubmit^="audCreatePersonData"]');
 create.elements.label.value='Estado general';change(create.elements.scope,'behavior');
 create.elements.behaviorId.value='b1';create.elements.value.value='En revisión';submit(create);
 assert.equal(project.audiencePersonFields.filter(f=>f.label==='Estado general').length,2,'Un estado general y uno específico no se sobreescriben');
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
 change(specific.querySelector('[data-aud-scope]'),'behavior');change(specific.querySelector('[data-aud-behavior]'),'b1');
 submit(d.querySelector('#aud-v22-import form'));change(d.getElementById('aud-v22-mode'),'update');w.commitAudienceCSVV22();
 assert.equal(project.audiencePersonFields.length,count);
 assert.equal(JSON.stringify(project.audiencePeople[0].adoptionHistory),history);
 const other=project.audiencePersonFields.find(f=>f.label==='Estado general'&&f.scope==='behavior');
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
 const old=project;project={id:'initiative-b',audiences:[],behaviors:[],audiencePeople:[]};w.audInitPeopleUI(project);w.render();
 assert.equal(w.audPersonDataFields(project).some(f=>f.key===key(fieldForOld(old))),false,'Campos aislados por iniciativa');
 assert.equal(run('audPersonSelection.size'),0);
 assert.equal(Object.keys(run('audPersonFilters')).some(k=>k.startsWith('custom:')),false);
 assert.equal(errors.length,0,errors.map(e=>e?.message).join('\n'));
 assert.ok(snapshots.length>0);assert.ok(alerts.some(m=>/Personas importadas/.test(m)));
 dom.window.close();console.log('OK · Importación, alcance, filtros, edición individual/masiva, persistencia y aislamiento');
}
function fieldForOld(x){return x.audiencePersonFields[0];}
exercise().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
