/* ===========/* ===================== Daily Home Kid Challenge — index.js (full) ===================== */

/* ------------------- Données enfants ------------------- */
let children = JSON.parse(localStorage.getItem("children")) || [];
let currentChild = 0;
const days = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

/* ------------------- Gestion image ------------------- */
function getImageKey() {
  const c = getChild();
  const w = getWeekData();
  const childName = (c.settings.childName || "MonEnfant").trim().replace(/\s+/g,"_");
  return `img:${childName}.${w.num}.${w.annee}`;
}

function uploadImage() {
  const fi = document.getElementById("imageInput");
  if (fi) fi.click();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const maxSize = 800; // px
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const base64 = canvas.toDataURL("image/jpeg", 0.7); // compression
        localStorage.setItem(getImageKey(), base64);

        // rafraîchir l’image affichée
        const imgEl = document.querySelector(".puzzle-image");
        if (imgEl) imgEl.src = base64;

        majPuzzle(); // rafraîchir puzzle
      } catch (err) {
        console.error("Erreur stockage image:", err);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getStoredImage() {
  const base64 = localStorage.getItem(getImageKey());
  return base64 || null;
}

function deleteImage() {
  try {
    localStorage.removeItem(getImageKey());
    const img = document.querySelector(".puzzle-image");
    if (img) img.src = "img/puzzle.png";
    const fi = document.getElementById("imageInput");
    if (fi) fi.value = "";
    majPuzzle();
  } catch(err) {
    console.error("Erreur suppression image:", err);
  }
}


function getChild(){ return children[currentChild]; }
function saveChildren(){ localStorage.setItem("children", JSON.stringify(children)); }
/* ------------------- Gestion image ------------------- */
function uploadImage() {
  const fi = document.getElementById("imageInput");
  if (fi) fi.click();
}


function bootstrapIfEmpty(){
  if(!Array.isArray(children) || children.length === 0){
    children = [{
      settings: {
        childName: "Mon enfant",
        rewardLow: "",
        rewardHigh: "",
        thresholdLow: 30,
        thresholdHigh: 50,
        rewards: {}
      },
      tasks: [],           // [{name:"", weights:[...]}]
      notes: {},           // { "39-2025": [[0..6], ...] }
      history: []          // [{week:"39-2025", pct:"65.0", reward:"...", palier:"Palier 1"}]
    }];
    saveChildren();
  }
}
bootstrapIfEmpty();

function prevChild(){ if(currentChild > 0){ currentChild--; majUI(); } }
function nextChild(){ if(currentChild < children.length-1){ currentChild++; majUI(); } }


/* ------------------- Dates & semaines ------------------- */
function formatDateFR(d){ return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}); }
function getMonday(d){ d=new Date(d); const day=d.getDay(); const diff=d.getDate()-day+(day==0?-6:1); return new Date(d.setDate(diff)); }
function getSunday(m){ const s=new Date(m); s.setDate(m.getDate()+6); return s; }
function getWeekNumber(d){ d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7)); const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil((((d-yearStart)/86400000)+1)/7); }

let currentDate = new Date();
function getWeekData(){ const m=getMonday(currentDate),s=getSunday(m); return {num:getWeekNumber(m),annee:m.getFullYear(),lundi:formatDateFR(m),dim:formatDateFR(s)}; }
function getWeekKey(){ const w=getWeekData(); return `${w.num}-${w.annee}`; }
function getCurrentWeekKey(){ const today=new Date(); return `${getWeekNumber(today)}-${today.getFullYear()}`; }
function changerSemaine(delta){ currentDate.setDate(currentDate.getDate()+delta*7); majUI(); }
function retourAujourdHui(){ currentDate=new Date(); majUI(); }

function afficherCalendrier(){
  const w = getWeekData();
  const el = document.getElementById("calendar");
  if (el) {
    const isCurrent = (getWeekKey() === getCurrentWeekKey());
    const cls = isCurrent ? "week-info week-current" : "week-info";
    el.innerHTML = `<div class="${cls}">Sem ${w.num} ${w.annee} — ${w.lundi} → ${w.dim}</div>`;
  }
  const lockMsg = document.getElementById("lockMessage");
  if (lockMsg) {
    lockMsg.textContent = (getWeekKey() !== getCurrentWeekKey())
      ? "🔒 Semaine verrouillée (lecture seule)"
      : "";
  }
}


/* ------------------- Vue ------------------- */
let modeSaisie = 'semaine'; // 'semaine' | 'globale' | 'jour' | 'avancee'

function setVue(mode) {
  modeSaisie = mode;
  majTableau();
  calculer();

  // Active bouton
  document.querySelectorAll(".btn-row button").forEach(btn => btn.classList.remove("active"));
  const btn = document.querySelector(`.btn-row button[data-mode="${mode}"]`);
  if (btn) btn.classList.add("active");

  // Label
  const labels = {semaine:"Semaine", globale:"Globale", jour:"Jour", avancee:"Résultat"};
  const lbl = document.getElementById("modeLabel");
  if (lbl) lbl.textContent = labels[mode] || "";
}

/* ------------------- Récompenses ------------------- */
function afficherRecompensesSemaine(){
  const key=getWeekKey();
  const c=getChild();
  const weekRewards=c.settings.rewards?.[key]||{};
  const low=(weekRewards.low&&weekRewards.low.trim()!=="")?weekRewards.low:(c.settings.rewardLow||"❌ Aucune");
  const high=(weekRewards.high&&weekRewards.high.trim()!=="")?weekRewards.high:(c.settings.rewardHigh||"❌ Aucune");
  const el = document.getElementById("weekRewards");
  if (el) {
    el.innerHTML = `🎁 <b>Récompenses semaine ${key}</b><br>
    Palier 1 (≥ ${c.settings.thresholdLow||30}%) : <span>${low}</span><br>
    Palier 2 (≥ ${c.settings.thresholdHigh||50}%) : <span>${high}</span>`;
  }
}

function toggleRecompenses(){
  const el=document.getElementById("weekRewards");
  if(!el) return;
  const newState = (el.style.display==="none")?"block":"none";
  el.style.display = newState;
  localStorage.setItem('showRewards', newState === 'block' ? '1' : '0');
}
/* ------------------- Puzzle ------------------- */

function majPuzzle(){
  const c = getChild();
  const key = getWeekKey();

  if(!c.notes) c.notes = {};
  if(!c.notes[key]){
    c.notes[key] = (c.tasks || []).map(() => [0,0,0,0,0,0,0]);
  }

  const notes = c.notes[key];
  let total=0, done=0;

  (c.tasks||[]).forEach((t,i)=>{
    (t.weights||[]).forEach((w=0,d)=>{
      total += Number(w)||0;
      const val = (notes?.[i]?.[d]) || 0;
      done += (val ? Number(w)||0 : 0);
    });
  });

  const bm=getBonusMalus();
  done += (bm?.bonus||0);
  done -= (bm?.malus||0);
  if(done<0) done=0;
  if(done>total) done=total;

  const mask=document.querySelector(".puzzle-mask");
  if(!mask) return;

  mask.innerHTML = "";
  if(total === 0){
    mask.innerHTML = "<p style='color:#666;'>⚠️ Pas de tâches définies</p>";
    return;
  }

  // Carré parfait
  const cols = Math.ceil(Math.sqrt(total));
  const totalCells = cols * cols;
  mask.style.gridTemplateColumns = `repeat(${cols},1fr)`;

  // Crée toutes les cases
  for(let i=0;i<totalCells;i++){
    const piece = document.createElement("div");
    piece.className = "puzzle-piece"; // opaques au départ
    mask.appendChild(piece);
  }

  const pieces = mask.querySelectorAll(".puzzle-piece");

  // Cas particulier : toutes les tâches réussies → dévoile tout en ordre aléatoire
  if(done === total){
    const indices = [...Array(totalCells).keys()];
    // mélange aléatoire
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    setTimeout(() => {
      indices.forEach((idx, i) => {
        setTimeout(() => {
          pieces[idx].classList.add("revealed");
        }, 100 * i);
      });
    }, 200);
    return;
  }

  // Cas normal → révèle seulement "done" cases selon ordre stable
  const childKey = (c.settings.childName || c.name || c.id || "child") + "|" + key + "|flip3d";
  const order = (typeof seededShuffle === "function") ? seededShuffle(totalCells, childKey) : [...Array(totalCells).keys()];

  if(done > 0){
    setTimeout(() => {
      order.forEach((pos, i) => {
        if (i < done) {
          setTimeout(() => {
            pieces[pos].classList.add("revealed");
          }, 150 * i);
        }
      });
    }, 200);
  }
}


/* ------------------- Récompenses ------------------- */
function majTableau(){
  const tasksHeader = document.getElementById("tasksHeader");
  const tasksBody   = document.getElementById("tasks");
  if(!tasksHeader || !tasksBody) return;
  tasksHeader.innerHTML="";
  tasksBody.innerHTML="";
  const vueEnfant = document.getElementById("vueEnfant");
  if (vueEnfant) vueEnfant.style.display = "none";

  if(modeSaisie === "semaine"){
    let headerRow = `<tr><th>Tâche</th>`;
    days.forEach(d=>headerRow+=`<th>${d}</th>`);
    headerRow+=`</tr>`;
    tasksHeader.innerHTML = headerRow;

  } else if(modeSaisie === "globale"){
    tasksHeader.innerHTML = `<tr><th>Tâche</th><th>Semaine</th></tr>`;

  } else if(modeSaisie === "jour"){
    const d = new Date(currentDate);
    const jours = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
    tasksHeader.innerHTML = `<tr><th>Tâche</th><th>${jours[d.getDay()]}</th></tr>`;

  } else if(modeSaisie === "avancee"){
    if (vueEnfant) vueEnfant.style.display = "block";
    const title = document.getElementById("vueEnfantTitle");
    if (title) title.textContent = getChild().settings.childName || "Mon enfant";

    const childName = (getChild().settings.childName || "MonEnfant").trim();
    const safeName = childName.replace(/\s+/g,"_");
    const img = document.querySelector("#vueEnfant .puzzle-image");
    if (img){
      img.src = getStoredImage() || `img/${safeName}.png`;
      img.onerror = () => { img.src = "img/puzzle.png"; };
    }
    majPuzzle();
    const lbl = document.getElementById("modeLabel");
    if (lbl) lbl.textContent = "Résultat";
    return;
  }

  // Lignes de tâches
  const notes = getChild().notes?.[getWeekKey()] || {};
  const disable = (getWeekKey() !== getCurrentWeekKey()) ? "disabled" : "";

  if(!getChild().tasks || getChild().tasks.length===0){
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="2">⚠️ Aucune tâche définie</td>`;
    tasksBody.appendChild(tr);
  } else {
    getChild().tasks.forEach((t,i)=>{
      const tr=document.createElement("tr");
      let row = `<td>${t.name}</td>`;

      if(modeSaisie === "semaine"){
        days.forEach((_d,dayIdx)=>{
          const checked = notes[i]?.[dayIdx] ? "checked" : "";
          row+=`<td><input type="checkbox" data-task="${i}" data-day="${dayIdx}" ${checked} ${disable}></td>`;
        });

      } else if(modeSaisie === "globale"){
        const checked = notes[i]?.some(v=>v===1) ? "checked" : "";
        row+=`<td><input type="checkbox" data-task="${i}" data-week="1" ${checked} ${disable}></td>`;

      } else if(modeSaisie === "jour"){
        const d = new Date(currentDate);
        const dayIdx = (d.getDay()===0)?6:(d.getDay()-1);
        const checked = notes[i]?.[dayIdx] ? "checked" : "";
        // ✅ Correction : pas de guillemet en trop !
        row+=`<td><input type="checkbox" data-task="${i}" data-day="${dayIdx}" ${checked} ${disable}></td>`;
      }

      tr.innerHTML = row;
      tasksBody.appendChild(tr);
    });
  }

  // Sauvegarde et recalcul au clic
  document.querySelectorAll("#tasks input[type=checkbox]").forEach(cb=>{
    cb.addEventListener("change",()=>{sauverNotes();calculer();});
  });
}


function sauverNotes(){
  const key = getWeekKey();
  const child = getChild();

  // Assure la structure notes
  if (!child.notes) child.notes = {};
  if (!Array.isArray(child.notes[key]) || child.notes[key].length !== (child.tasks?.length||0)) {
    child.notes[key] = (child.tasks || []).map(() => [0,0,0,0,0,0,0]);
  }

  if (modeSaisie === "semaine") {
    // Lit toutes les cases (7 jours) pour chaque tâche
    (child.tasks || []).forEach((t, i) => {
      for (let d = 0; d < 7; d++) {
        const el = document.querySelector(`#tasks input[data-task='${i}'][data-day='${d}']`);
        child.notes[key][i][d] = el && el.checked ? 1 : 0;
      }
    });

  } else if (modeSaisie === "globale") {
    // Une case par tâche → recopie sur 7 jours
    (child.tasks || []).forEach((t, i) => {
      const el = document.querySelector(`#tasks input[data-task='${i}'][data-week='1']`);
      const val = (el && el.checked) ? 1 : 0;
      for (let d = 0; d < 7; d++) child.notes[key][i][d] = val;
    });

  } else if (modeSaisie === "jour") {
    // Un seul jour (basé sur la semaine affichée)
    const d = new Date(currentDate);
    const dayIdx = (d.getDay()===0) ? 6 : (d.getDay()-1);
    (child.tasks || []).forEach((t, i) => {
      const el = document.querySelector(`#tasks input[data-task='${i}'][data-day='${dayIdx}']`);
      child.notes[key][i][dayIdx] = el && el.checked ? 1 : 0;
    });
  }

  saveChildren();
}


/* ------------------- Bonus/Malus ------------------- */
function bmKey(){ return `bm:${currentChild}:${getWeekKey()}`; }

function loadBonusMalus(){
  const raw = localStorage.getItem(bmKey());
  let b=0,m=0;
  if(raw){ 
    try{ 
      const o=JSON.parse(raw); 
      b=Number(o.bonus)||0; 
      m=Number(o.malus)||0; 
    }catch{} 
  }
  const bi = document.getElementById("bonusInput");
  const mi = document.getElementById("malusInput");
  if (bi) bi.value = b;
  if (mi) mi.value = m;
  return {bonus:b, malus:m};
}

function getBonusMalus(){
  const bi = document.getElementById("bonusInput");
  const mi = document.getElementById("malusInput");
  const bonus = bi ? parseInt(bi.value)||0 : 0;
  const malus = mi ? parseInt(mi.value)||0 : 0;
  return {bonus, malus};
}

function saveBonusMalus(){
  const bm = getBonusMalus();
  localStorage.setItem(bmKey(), JSON.stringify(bm));
}


/* ------------------- Calcul ------------------- */
function calculer(){
  const notes=getChild().notes?.[getWeekKey()]||[];
  let total=0,done=0;
  (getChild().tasks||[]).forEach((t,i)=>{
    (t.weights||[]).forEach((w=0,d)=>{
      total+=Number(w)||0;
      if(notes[i]?.[d]) done+=Number(w)||0;
    });
  });
  const bm=getBonusMalus();
  done += bm.bonus; 
  done -= bm.malus;
  if(done<0) done=0;
  const pct=total?(done/total*100):0;

  // Affichage résultats
  const c=getChild();
  const weekRewards=c.settings.rewards?.[getWeekKey()]||{};
  const low=weekRewards.low||c.settings.rewardLow||"";
  const high=weekRewards.high||c.settings.rewardHigh||"";
  let reward="❌ Aucune récompense", palier="-";
  if(pct >= (c.settings.thresholdLow||30) && pct < (c.settings.thresholdHigh||50) && low){
    reward=`🎁 ${low}`; palier="Palier 1";
  } else if(pct >= (c.settings.thresholdHigh||50) && high){
    reward=`🏆 ${high}`; palier="Palier 2";
  }
  const res = document.getElementById("resultat");
  if (res) res.innerHTML=`✅ ${done}/${total} pts (${pct.toFixed(1)}%)<br>${reward}`;
  const pb = document.getElementById("progressBar");
  if (pb) pb.style.width=Math.min(100,Math.max(0,pct))+"%";

  // Historique
  const week=getWeekKey();
  c.history=c.history||[];
  const existing=c.history.find(h=>h.week===week);
  if(existing){ existing.pct=pct.toFixed(1); existing.reward=reward; existing.palier=palier; }
  else{ c.history.push({week, pct:pct.toFixed(1), reward, palier}); }
  saveChildren();

  if(modeSaisie==="avancee"){ majPuzzle(); }
}


/* ------------------- Historique ------------------- */
let historyChart = null;

function toggleHistorique(){
  const el = document.getElementById("historique");
  if (!el) return;
  const isHidden = (el.style.display === "" || el.style.display === "none");
  if (isHidden) {
    el.style.display = "block";
    changerVue('semaine');
  } else {
    el.style.display = "none";
  }
}

function changerVue(mode){
  const ts = document.getElementById("tabSemaine");
  const tg = document.getElementById("tabGlobale");
  if (ts) ts.classList.remove("active");
  if (tg) tg.classList.remove("active");

  if(mode === "semaine"){
    if (ts) ts.classList.add("active");
    afficherHistoriqueSemaine();
  } else {
    if (tg) tg.classList.add("active");
    afficherHistoriqueGlobale();
  }
}

function afficherHistoriqueSemaine(){
  const histBody = document.getElementById("historiqueBody");
  if (!histBody) return;
  histBody.innerHTML = "";

  (getChild().history || []).forEach(h => {
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${h.week}</td><td>${h.pct}%</td><td>${h.reward}</td><td>${h.palier}</td>`;
    histBody.appendChild(tr);
  });

  const cc = document.getElementById("chartContainer");
  if (cc) cc.style.display = "none";

  if(historyChart && typeof historyChart.destroy === "function"){
    historyChart.destroy();
  }
  historyChart = null;
}

function afficherHistoriqueGlobale(){
  const histBody = document.getElementById("historiqueBody");
  if (histBody) histBody.innerHTML = "";
  const hist = (getChild().history || []);

  const cc = document.getElementById("chartContainer");
  if(hist.length === 0){
    if (cc) cc.style.display = "none";
    if(historyChart && typeof historyChart.destroy === "function"){
      historyChart.destroy();
    }
    historyChart = null;
    return;
  }

  const labels = hist.map(h => h.week);
  const data = hist.map(h => Number(h.pct || 0));

  if (cc) cc.style.display = "block";
  const canvas = document.getElementById("historyChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if(historyChart && typeof historyChart.destroy === "function"){
    historyChart.destroy();
  }

  historyChart = new Chart(ctx, {
    type:"line",
    data:{
      labels,
      datasets:[{
        label:"% réussi",
        data,
        borderColor:"blue",
        fill:false,
        tension:0.25
      }]
    },
    options:{
      scales:{ y:{ beginAtZero:true, max:100 } },
      plugins:{ legend:{display:true} }
    }
  });
}

function resetHistorique(){
  if(confirm("⚠️ Supprimer l’historique ?")){
    getChild().history = [];
    saveChildren();
    afficherHistoriqueSemaine();
  }
}


/* ------------------- Utilitaires divers ------------------- */
function resetSemaine(){
  const key = getWeekKey();
  if(!confirm(`Réinitialiser la semaine ${key} pour ${getChild().settings.childName || "cet enfant"} ?`)) return;
  if(getChild().notes && getChild().notes[key]){
    getChild().notes[key] = getChild().tasks.map(() => [0,0,0,0,0,0,0]);
  }
  saveChildren();
  majUI();
}


/* ------------------- majUI ------------------- */
function majUI(){
  const title = document.getElementById("childTitle");
  if (title) title.textContent = getChild().settings.childName || "Mon enfant";

  afficherCalendrier();
  afficherRecompensesSemaine();
  majTableau();

  const showRewards = localStorage.getItem('showRewards') !== '0';
  const wr = document.getElementById("weekRewards");
  if (wr) wr.style.display = showRewards ? 'block' : 'none';

  loadBonusMalus();
  const b=document.getElementById("bonusInput"), m=document.getElementById("malusInput");
  if(b) b.oninput = ()=>{ saveBonusMalus(); calculer(); };
  if(m) m.oninput = ()=>{ saveBonusMalus(); calculer(); };

  calculer();
}


/* ------------------- Init ------------------- */
document.addEventListener('DOMContentLoaded', () => {
  bootstrapIfEmpty();
  setVue('jour');
  majUI();
  afficherCalendrier();

  const delBtn = document.getElementById('btnDeleteImage');
  if (delBtn) delBtn.addEventListener('click', deleteImage);

  const fi = document.getElementById("imageInput");
  if (fi) fi.addEventListener('change', handleImageUpload);
  
    // Navigation calendrier
  document.getElementById('btnPrev')?.addEventListener('click', () => changerSemaine(-1));
  document.getElementById('btnNext')?.addEventListener('click', () => changerSemaine(1));

  // Vue
  document.getElementById('btnVueSemaine')?.addEventListener('click', () => setVue('semaine'));
  document.getElementById('btnVueGlobale')?.addEventListener('click', () => setVue('globale'));
  document.getElementById('btnVueJour')?.addEventListener('click', () => setVue('jour'));
  document.getElementById('btnVueAvancee')?.addEventListener('click', () => setVue('avancee'));

  // Navigation enfant
  document.getElementById('btnPrevChild')?.addEventListener('click', prevChild);
  document.getElementById('btnNextChild')?.addEventListener('click', nextChild);
  document.getElementById('btnToggleRecompenses')?.addEventListener('click', toggleRecompenses);

  // Historique + reset semaine
  document.getElementById('btnHistorique')?.addEventListener('click', toggleHistorique);
  document.getElementById('btnResetSemaine')?.addEventListener('click', resetSemaine);
  document.getElementById('btnResetHistorique')?.addEventListener('click', resetHistorique);
  
  // uploadImage 
  document.getElementById('btnUploadImage')?.addEventListener('click', uploadImage);


  // Tabs historique
  document.getElementById('tabSemaine')?.addEventListener('click', () => changerVue('semaine'));
  document.getElementById('tabGlobale')?.addEventListener('click', () => changerVue('globale'));
});


/* ------------------- Exposer globalement (pour onclick HTML) ------------------- */
window.changerSemaine = changerSemaine;
window.setVue = setVue;
window.prevChild = prevChild;
window.nextChild = nextChild;
window.toggleRecompenses = toggleRecompenses;
window.uploadImage = uploadImage;
window.resetSemaine = resetSemaine;
window.toggleHistorique = toggleHistorique;
window.changerVue = changerVue;
window.resetHistorique = resetHistorique;
