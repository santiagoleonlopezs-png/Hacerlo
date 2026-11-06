/* Integración por acceso: el Laboratorio conserva dominio, sesiones y datos propios. */
const HACERLO_LABORATORIO_URL='https://laboratorio.hacerlofc.com/';
function renderLearningLabTile(){
 return `<section class="panel hcx-lab-tile" aria-labelledby="hcx-lab-tile-title">
  <div class="hcx-lab-tile-mark" aria-hidden="true">◇</div>
  <div class="hcx-lab-tile-copy"><span class="hcx-lab-kicker">IMPLEMENTACIÓN · APRENDER HACIENDO</span>
  <h2 id="hcx-lab-tile-title">Laboratorio de Aprendizaje y Decisión</h2>
  <p>Simuladores, juegos y experiencias para ensayar decisiones y explorar sus consecuencias.</p></div>
  <button class="secondary" type="button" onclick="go('Laboratorio')" aria-label="Explorar el acceso al Laboratorio de Aprendizaje y Decisión">Explorar laboratorio ↗</button>
 </section>`;
}
function renderLearningLabPage(){
 return `<section class="hcx-hero hcx-lab-hero" aria-labelledby="hcx-lab-title">
 <div class="hcx-hero-copy"><span class="hcx-eyebrow">RDAIM · IMPLEMENTACIÓN · ECOSISTEMA HACERLO</span>
  <h1 id="hcx-lab-title">Laboratorio de Aprendizaje y Decisión</h1>
  <p>Un espacio para experimentar, tomar decisiones y comprender cómo nuestras acciones transforman los resultados.</p>
  <div class="hcx-lab-actions">
   <a class="hcx-lab-open" href="${HACERLO_LABORATORIO_URL}" target="_blank" rel="noopener noreferrer" aria-label="Abrir Laboratorio de Aprendizaje y Decisión en una nueva pestaña">Abrir laboratorio <span aria-hidden="true">↗</span></a>
   <span class="hcx-lab-hint">Se abre en una nueva pestaña</span>
  </div>
 </div>
 <div class="hcx-hero-orbit" aria-hidden="true"><span>◇</span><i></i><i></i><i></i></div>
 </section><div class="hcx-lab-note"><strong>Dos plataformas, un ecosistema.</strong> El Laboratorio funciona de forma independiente de HACERLO. Sus salas, experiencias y resultados permanecen en su propia plataforma; esta entrada no transfiere datos ni inicia sesiones automáticamente.</div>`;
}
