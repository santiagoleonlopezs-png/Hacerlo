const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/core/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function element(){return {textContent:'',value:'',style:{},disabled:false,attributes:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},focus(){this.focused=true},addEventListener(k,fn){this[k]=fn}}}
const elements=Object.fromEntries(['login-form','login-msg','login-email','login-password','recovery-form','recovery-msg','new-password','confirm-password','auth-gate','nav','nav-toggle'].map(id=>[id,element()]));
for(const id of ['login-form','recovery-form']){
 const markup=html.match(new RegExp('<form id="'+id+'"[\\s\\S]*?</form>'))[0];
 const buttons=[...markup.matchAll(/<button([^>]*)>/g)].map(match=>Object.assign(element(),{submit:/type="submit"/.test(match[1])}));
 const heading=element(),paragraph=element();
 elements[id].querySelector=selector=>selector==='h2'?heading:selector==='p'?paragraph:buttons.find(button=>button.submit)||null;
 elements[id].querySelectorAll=()=>buttons;
 elements[id].buttons=buttons;
}
let ready,loginCalls=0,settleLogin;
const context={console,URL,URLSearchParams,location:{href:'https://example.test/',hash:'',search:''},
 document:{addEventListener(name,fn){if(name==='DOMContentLoaded')ready=fn}},
 $:id=>elements[id],HACERLO_INITIAL_AUTH_FLOW:'',setCloudStatus(){},loadCloud:async()=>{},
 sb:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){},
 signInWithPassword(){loginCalls++;return new Promise(resolve=>settleLogin=resolve)}}}};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('let recoveryMode='),source.indexOf('async function logoutHacerlo')),context);
context.showRecoveryForm('recovery');
assert.equal(elements['recovery-form'].buttons[0].textContent,'Guardar nueva contraseña');
context.showRecoveryForm('invite');
assert.equal(elements['recovery-form'].buttons[0].textContent,'Crear contraseña y activar acceso');
ready();
const navStart=source.indexOf('const HACERLO_NAV_GROUPS='),navEnd=source.indexOf('function choose(id)',navStart);
Object.assign(context,{phase:0,page:'Inicio',phases:[['R','Resultados'],['D','Diseño'],['A','Análisis'],['I','Implementación'],['M','Medición']],render(){},safe:String});
vm.runInContext(source.slice(navStart,navEnd),context);
context.toggleNavStep(0);
assert.equal(vm.runInContext('expandedNavStep',context),0);
context.toggleNavStep(0);
assert.equal(vm.runInContext('expandedNavStep',context),null);
context.toggleNavStep(0);context.toggleNavStep(1);
assert.equal(vm.runInContext('expandedNavStep',context),1);
const sidebar={classList:{toggle(name,open){this.open=open}}};
elements.nav.closest=()=>sidebar;
context.toggleMobileNav();assert.equal(elements['nav-toggle'].getAttribute('aria-expanded'),'true');
context.go('Inicio');assert.equal(elements['nav-toggle'].getAttribute('aria-expanded'),'false');
assert.equal(sidebar.classList.open,false);assert.equal(elements['nav-toggle'].focused,true);
(async()=>{
 const event={preventDefault(){},target:elements['login-form']};
 const pending=elements['login-form'].submit(event);
 await elements['login-form'].submit(event);
 assert.equal(loginCalls,1,'Ignora un segundo envío mientras el primero está pendiente');
 assert.ok(elements['login-form'].buttons.every(b=>b.disabled));
 settleLogin({error:{message:'Credenciales no válidas'}});await pending;
 assert.equal(elements['login-msg'].textContent,'Credenciales no válidas');
 assert.ok(elements['login-form'].buttons.every(b=>!b.disabled));
 context.sb.auth.signInWithPassword=async()=>{throw Error('network')};
 await elements['login-form'].submit(event);
 assert.match(elements['login-msg'].textContent,/Revisa tu conexión/);
 assert.equal(elements['login-form'].attributes['aria-busy'],'false');
 assert.ok(elements['login-form'].buttons.every(b=>!b.disabled));
 context.sb.auth.signInWithPassword=async()=>({error:null});
 await elements['login-form'].submit(event);
 assert.equal(elements['auth-gate'].style.display,'none');
 console.log('Acceso y navegación OK: recuperación, invitación, envíos simultáneos, errores y menú.');
})().catch(error=>{console.error(error);process.exitCode=1});
