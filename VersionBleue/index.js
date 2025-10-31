/* === Daily Home Kid Challenge v3.0 ===
   Fichier unique index.js — version intégrale
   - Navigation flèches ← → (Jour, Semaine, Mois)
   - Label du jour courant sous le bouton "Semaine" (vue Jour)
   - Bouton actif reste bleu marine (.tabs button.active)
   - Sidebar + accordéon enfants
   - Vues Jour/Semaine/Mois + Résultats + Historique (Chart.js)
   - Puzzle progressif + upload/suppression image
*/

/* ================= Données & utilitaires ================= */

let children = JSON.parse(localStorage.getItem("children")) || [];
let currentChild = 0;
const days = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function getChild(){ return children[currentChild]; }
function saveChildren(){ localStorage.setItem("children", JSON.stringify(children)); }

/* ------------------- Init enfants ------------------- */
function bootstrapIfEmpty(){
  // 🚫 Ne rien recréer si une purge totale vient d’être faite
  if (localStorage.getItem("purged") === "1") return;
  if(!children.length){
    children=[{
      settings:{
        childName:"Bertrand",
        rewardLow:"Petit cadeau",
        rewardHigh:"Grande sortie",
        thresholdLow:30,
        thresholdHigh:50
      },
      tasks:[
        { name:"Brosser les dents", weights:[1,1,1,1,1,0,0] },
        { name:"Devoirs",           weights:[1,1,1,1,1,0,0] }
      ],
      notes:{},
      history:[],
      rewardsByWeek:{}   // ✅ placé à l’intérieur de l’objet enfant
    }];
    saveChildren();
  }
}
bootstrapIfEmpty();


/* ------------------- Dates ------------------- */
function formatDateFR(d){ return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}); }
function monthLabel(d){ return d.toLocaleDateString('fr-FR',{month:'long', year:'numeric'}); }
function getMonday(d){ d=new Date(d); const day=d.getDay(); const diff=d.getDate()-day+(day==0?-6:1); return new Date(d.setDate(diff)); }
function getWeekNumber(d){ d=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7)); const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1)); return Math.ceil((((d-yearStart)/86400000)+1)/7); }
function getSunday(m){ const s=new Date(m); s.setDate(m.getDate()+6); return s; }

let currentDate=new Date();
function getWeekData(){ const m=getMonday(currentDate),s=getSunday(m); return {num:getWeekNumber(m),annee:m.getFullYear(),lundi:formatDateFR(m),dim:formatDateFR(s), m,s}; }
function getWeekKey(){ const w=getWeekData(); return `${w.num}-${w.annee}`; }
function getCurrentWeekKey(){ const today=new Date(); return `${getWeekNumber(today)}-${today.getFullYear()}`; }

function syncCustomWeekIfVisible(){
  const pane = document.getElementById("vue-recompenses");
  const input = document.getElementById("customWeek");
  if (pane && pane.classList.contains("active") && input) {
    input.value = getWeekKey();
  }
}


function changerSemaine(delta){ currentDate.setDate(currentDate.getDate()+delta*7); majUI(); syncCustomWeekIfVisible(); }

/* ================= Sidebar & Gestion enfants ================= */

function setChildAvatar(){
  document.querySelectorAll(".avatar").forEach(img=>{
    img.onerror = () => { img.onerror = null; img.src = "img/default.png"; };
  });
}

function rebuildSidebar(){
  const container=document.getElementById("childrenList");
  if(!container) return;
  container.innerHTML="";
  children.forEach((ch,idx)=>{
    const active=(idx===currentChild)?" active":"";
    const name = (ch.settings.childName||'Enfant').trim();
    container.insertAdjacentHTML("beforeend",`
      <li class="child-accordion${active}" data-idx="${idx}">
        <h3>
          <span><img src="${ch.settings.avatar || "img/default.png"}" class="avatar" alt=""> ${name}</span>
          <span class="arrow">▼</span>
        </h3>
        <ul class="options">
          <li onclick="openNameAvatar(${idx})">🖼️ Nom et avatar</li>
          <li onclick="openTaskManager(${idx})">📋 Tâches</li>
          <li onclick="openRewardsManager(${idx})">🎁 Récompenses</li>
          <li onclick="exportChild(${idx})">📤 Exporter cet enfant</li>
          <li onclick="deleteChild(${idx})">🗑️ Supprimer cet enfant</li>
          <li onclick="selectChild(${idx}); showView('vue-jour')">📆 Suivi des tâches</li>
          <li onclick="selectChild(${idx}); showView('vue-resultats')">🧩 Résultats</li>
        </ul>
      </li>`);
  });
  setChildAvatar();
}


/* ---- CRUD enfants ---- */
function selectChild(i){ currentChild=i; saveChildren(); majUI(); }

function addChild(){
  // Création rapide d’un enfant vide
  const newChild = {
    settings:{
      childName:"",
      avatar:null,
      age:null,
      gender:"non-defini",
      rewardLow:"",
      rewardHigh:"",
      thresholdLow:30,
      thresholdHigh:50
    },
    tasks:[],
    notes:{},
    history:[],
    rewardsByWeek:{}   // ✅ structure pour récompenses personnalisées
  };

  // Ajout et sélection
  children.push(newChild);
  saveChildren();
  currentChild = children.length - 1;

  // ✅ Redirection immédiate vers la vue Nom & Avatar
  openNameAvatar(currentChild);

  // Ferme la sidebar pour une transition fluide
  closeMenu();
}

function deleteChild(i){
  if(!confirm("Supprimer cet enfant ?")) return;
  children.splice(i,1);
  if(!children.length) bootstrapIfEmpty();
  currentChild = Math.min(currentChild, children.length-1);
  saveChildren(); majUI();
}
function renameChild(i){
  const cur = children[i].settings.childName || "";
  const n = prompt("Nouveau nom :", cur);
  if(!n) return;
  children[i].settings.childName = n.trim();
  saveChildren(); majUI();
}
function exportChild(i){
  const b=new Blob([JSON.stringify(children[i],null,2)],{type:"application/json"});
  const u=URL.createObjectURL(b); const a=document.createElement("a");
  a.href=u; a.download=`${children[i].settings.childName||'enfant'}.json`; a.click();
  URL.revokeObjectURL(u);
}
function handleImportChild(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const obj=JSON.parse(r.result);
      if(!obj?.settings?.childName){ alert("Fichier invalide"); return; }
      children.push(obj); saveChildren(); currentChild=children.length-1; majUI();
    }catch(_e){ alert("JSON invalide"); }
  };
  r.readAsText(f);
  e.target.value = "";
}
function importExample(){
  const demo={
    settings:{ childName:"Exemple", rewardLow:"Choisir un dessin animé", rewardHigh:"Sortie parc", thresholdLow:40, thresholdHigh:70 },
    tasks:[ {name:"Ranger la chambre",weights:[1,1,1,1,1,0,0]}, {name:"Lire 10 min",weights:[1,1,1,1,1,0,0]} ],
    notes:{}, history:[]
  };
  children.push(demo); saveChildren(); currentChild=children.length-1; majUI();
}

function resetAllChildren(){
  if(!confirm("♻️ Réinitialiser TOUTES les données de CHAQUE enfant (nom, avatar, âge, genre, récompenses, seuils, tâches, notes, historique) ?")) return;

  children = children.map(c => ({
    settings: {
      childName: "",             // prénom vidé
      avatar: null,              // retour à l’avatar par défaut
      avatarName: undefined,
      age: null,
      gender: "non-defini",
      rewardLow: "",             // récompenses vidées
      rewardHigh: "",
      thresholdLow: 30,          // seuils par défaut
      thresholdHigh: 50
    },
    tasks: [],                   // aucune tâche
    notes: {},                   // aucune note
    history: []                  // historique vierge
  }));

  saveChildren();
  majUI();
  alert("✅ Tous les enfants ont été entièrement réinitialisés.");
}

function purgeAll(){
  if(!confirm("Tout supprimer ?")) return;

  // Supprimer tout le stockage
  localStorage.clear();
  sessionStorage.clear();

  // Marquer la purge pour bloquer le bootstrap initial
  localStorage.setItem("purged", "1");

  // Réinitialiser les variables en mémoire
  children = [];
  currentChild = 0;

  majUI();
  alert("🗑️ Tous les enfants ont été supprimés !");
}


/* ---- Raccourcis gestion ---- */
function openTaskManager(i){
  selectChild(i);
  const action = prompt("Gestion des tâches\n1 = AJOUTER\n2 = SUPPRIMER");
  const child = children[i];
  if(action==="1"){
    const name = prompt("Nom de la nouvelle tâche :");
    if(name){
      child.tasks.push({ name: name.trim(), weights:[1,1,1,1,1,0,0] });
      saveChildren(); majUI();
    }
  }else if(action==="2"){
    if(!child.tasks.length){ alert("Aucune tâche à supprimer."); return; }
    const list = child.tasks.map((t,idx)=>`${idx+1}. ${t.name}`).join("\n");
    const pick = parseInt(prompt("Supprimer quelle tâche ?\n"+list),10)-1;
    if(!isNaN(pick) && child.tasks[pick]){
      child.tasks.splice(pick,1); saveChildren(); majUI();
    }
  }
}

/* ================= En-têtes, titres & labels ================= */

function setWeekTitle(){
  const {m,s}=getWeekData();
  const fmt=d=>d.toLocaleDateString('fr-FR',{day:'2-digit',month:'long'});
  const weekTitle=document.getElementById("weekTitle");
  if(weekTitle) weekTitle.textContent=`${fmt(m)} – ${fmt(s)}`;
  const monthTitle=document.getElementById("monthTitle");
  if(monthTitle) monthTitle.textContent=monthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth(),1));
}

function setChildHeaders(){
  const n = getChild().settings.childName || "Mon enfant";
  const day    = document.getElementById("currentChild_day");
  const month  = document.getElementById("currentChild_month");
  const task   = document.getElementById("currentChild_tasks");
  const reward = document.getElementById("currentChild_rewards"); // 🔹 nouveau
  if(day) day.textContent = n;
  if(month) month.textContent = n;
  if(task) task.textContent = n;
  if(reward) reward.textContent = n; // 🔹 nouveau
  const title = document.getElementById("childTitle");
  if(title) title.textContent = "Résultats - " + n;
}


/* ---- Label du jour courant (affiché sous le bouton Semaine en vue Jour) ---- */
function setCurrentDayLabel(){
  const d = new Date(currentDate);
  const options = { weekday: 'long' };
  const jour = d.toLocaleDateString('fr-FR', options);
  const lbl = document.getElementById("currentDayLabel");
  if(lbl) lbl.textContent = jour.charAt(0).toUpperCase() + jour.slice(1);
}

/* ================= Vues Jour / Semaine / Mois ================= */

function ensureNotesForWeek(child,key){
  if(!child.notes) child.notes={};
  if(!Array.isArray(child.notes[key])||child.notes[key].length!==(child.tasks?.length||0)){
    child.notes[key]=(child.tasks||[]).map(()=>[0,0,0,0,0,0,0]);
  }
}

function majVueJour(){
  const tbody=document.querySelector("#vue-jour table tbody"); 
  if(!tbody) return;
  tbody.innerHTML="";
  const child=getChild(); 
  const key=getWeekKey(); 
  ensureNotesForWeek(child,key);

  const d=new Date(currentDate); 
  const dayIdx=(d.getDay()===0)?6:(d.getDay()-1);

  if(!child.tasks.length){
    tbody.innerHTML=`<tr><td colspan="2">⚠️ Aucune tâche définie</td></tr>`; 
    return;
  }

  child.tasks.forEach((t,i)=>{
    const val = child.notes[key]?.[i]?.[dayIdx] ?? 0;
    const disable=(key!==getCurrentWeekKey())?"disabled":"";

    const name = `t${i}d${dayIdx}`;
    tbody.insertAdjacentHTML("beforeend",`
      <tr>
        <td>${t.name}</td>
        <td class="rating-cell">
          <input type="radio" id="${name}v0" name="${name}" data-task="${i}" data-day="${dayIdx}" value="0" ${val==0?'checked':''} ${disable}>
          <label for="${name}v0">🔴</label>
          <input type="radio" id="${name}v05" name="${name}" data-task="${i}" data-day="${dayIdx}" value="0.5" ${val==0.5?'checked':''} ${disable}>
          <label for="${name}v05">️🟡</label>
          <input type="radio" id="${name}v1" name="${name}" data-task="${i}" data-day="${dayIdx}" value="1" ${val==1?'checked':''} ${disable}>
          <label for="${name}v1">🟢</label>
        </td>
      </tr>`);
  });

  // Écouteurs
  tbody.querySelectorAll("input[type=radio]").forEach(r=>{
    r.addEventListener("change",()=>{
      sauverNotes(); 
      calculer();
      appliquerStyleRadio(r);   // applique style au clic
    });
    appliquerStyleRadio(r);     // applique style dès le rendu
  });
}




/* Petite fonction utilitaire pour mettre à jour l'opacité des labels */
function majLabelGroup(groupName){
  document.querySelectorAll(`input[name='${groupName}'] + label`).forEach(lbl=>{
    lbl.style.opacity = "0.15"; // par défaut pâle
  });
  const checked = document.querySelector(`input[name='${groupName}']:checked`);
  if(checked) checked.nextElementSibling.style.opacity = "1"; // le choix actif est bien visible
}


function majLabelGroup(groupName){
  document.querySelectorAll(`input[name='${groupName}'] + label`).forEach(lbl=>{
    lbl.style.opacity = "0.15"; // par défaut tous pâles
  });
  const checked = document.querySelector(`input[name='${groupName}']:checked`);
  if(checked) checked.nextElementSibling.style.opacity = "1"; // celui choisi est bien visible
}

function majVueMois(){
  const cal=document.querySelector("#vue-mois .calendar-month"); 
  if(!cal) return;
  cal.innerHTML="";
  const child=getChild(); 
  const key=getWeekKey(); 
  ensureNotesForWeek(child,key);

  const year=currentDate.getFullYear(), 
        month=currentDate.getMonth(), 
        lastDay=new Date(year,month+1,0).getDate();
  
  const today=new Date();
  today.setHours(0,0,0,0);

  for(let d=1; d<=lastDay; d++){
    const cell=document.createElement("div");
    cell.className="calendar-cell";

    const thisDate=new Date(year, month, d);
    thisDate.setHours(0,0,0,0);

    // Ajouter numéro du jour
    cell.innerHTML=`<span class="date">${d}</span>`;

    // Récupérer la semaine/notes correspondant à ce jour
    const weekKey = `${getWeekNumber(thisDate)}-${thisDate.getFullYear()}`;
    ensureNotesForWeek(child, weekKey);

    const dayIdx=(thisDate.getDay()===0)?6:(thisDate.getDay()-1);

    let total=0, done=0;
    (child.tasks||[]).forEach((t,i)=>{
      const val = child.notes[weekKey]?.[i]?.[dayIdx] ?? 0;
      total += 1;
      done  += parseFloat(val)||0;
    });

    // Calcul du % réalisé
    const pct = total ? (done/total*100) : 0;

    // Coloration selon résultat
    if(pct === 100){
      cell.style.background = "#e8f5e9"; // vert clair
      cell.style.border = "2px solid #aaa";
    } else if(pct > 0){
      cell.style.background = "#fff4e5"; // orange clair
      cell.style.border = "2px solid #aaa";
    } else {
      cell.style.background = "#fdecea"; // rouge clair
      cell.style.border = "2px solid #aaa";
    }

    // Statut jour courant / passé
    if(thisDate.getTime() === today.getTime()){
      cell.classList.add("today");
    } else if(thisDate < today){
      cell.classList.add("past");
    }

    // Ajouter le % au centre
    if(total>0){
      const span=document.createElement("div");
      span.className="percent";
      span.textContent=`${pct.toFixed(0)}%`;
      cell.appendChild(span);
    }

    cal.appendChild(cell);
  }
}


function sauverNotes(){
  const key=getWeekKey(), child=getChild(); 
  ensureNotesForWeek(child,key);

  // Sauvegarde toutes les radios cochées
  document.querySelectorAll("#vue-jour input[type=radio]:checked").forEach(r=>{
    const i=r.dataset.task, d=r.dataset.day;
    if(i!==undefined && d!==undefined){
      child.notes[key][i][d]=parseFloat(r.value);
    }
  });

  saveChildren();
  majVueMois();
  // 🔹 Réafficher la vue jour immédiatement
  majVueJour();
  majAvancementJournee();
  renderRadials();
  calculer();
}

/* ================= Calcul, Résultats & Historique ================= */

let historyChart=null;

/**
 * Renvoie les seuils (globaux) et les récompenses (overridables par semaine)
 * pour la SEMAINE courante.
 */
function getWeeklyPaliersConfig(child, weekKey){
  const t1 = Number(child?.settings?.thresholdLow  ?? 30);
  const t2 = Number(child?.settings?.thresholdHigh ?? 50);

  // Par défaut : récompenses globales
  let r1 = child?.settings?.rewardLow  || "";
  let r2 = child?.settings?.rewardHigh || "";

  // Normalisation libellé palier
  const tag = (s) => String(s ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g,""); // "Palier 1" -> "palier1"

  // Overrides semaine (prioritaires)
  const arr = child?.rewardsByWeek?.[weekKey];
  if (Array.isArray(arr) && arr.length){
    for (const r of arr){
      const p = tag(r.palier);
      if ((p === "1" || p === "p1" || p === "palier1") && r?.reward) r1 = r.reward;
      if ((p === "2" || p === "p2" || p === "palier2") && r?.reward) r2 = r.reward;
    }
  }
  return { t1, r1, t2, r2 };
}





/**
 * Met à jour l’affichage des 2 bandeaux “semaine”.
 * - Affiche Palier 1 si pctWeek ≥ t1 ET r1 non vide
 * - Affiche Palier 2 si pctWeek ≥ t2 ET r2 non vide
 */
function updateWeeklyRewardBanners(pctWeek, cfg){
  const b1 = document.getElementById('rewardBannerW1');
  const b2 = document.getElementById('rewardBannerW2');

  if (b1){ b1.className = 'reward-banner hidden'; b1.innerHTML = ''; }
  if (b2){ b2.className = 'reward-banner hidden'; b2.innerHTML = ''; }

  const show1 = (pctWeek >= cfg.t1) && !!cfg.r1?.trim();
  const show2 = (pctWeek >= cfg.t2) && !!cfg.r2?.trim();

  if (show1 && b1){
    b1.innerHTML = `🎉 <span class="badge">Palier 1</span> ${cfg.r1} <span style="opacity:.6;font-weight:600">(${pctWeek.toFixed(1)}%)</span>`;
    b1.classList.remove('hidden'); b1.classList.add('palier-1','pop');
    setTimeout(()=> b1.classList.remove('pop'), 300);
  }
  if (show2 && b2){
    b2.innerHTML = `🏆 <span class="badge">Palier 2</span> ${cfg.r2} <span style="opacity:.6;font-weight:600">(${pctWeek.toFixed(1)}%)</span>`;
    b2.classList.remove('hidden'); b2.classList.add('palier-2','pop');
    setTimeout(()=> b2.classList.remove('pop'), 300);
  }
}


function calculer(){
  const child = getChild(); 
  const key = getWeekKey(); 
  ensureNotesForWeek(child,key);
  const notes = child.notes[key] || []; 
  let total = 0, done = 0;

  (child.tasks || []).forEach((t,i)=>{
    (notes[i] || []).forEach((val=0)=>{ 
      total += 1;         
      done += parseFloat(val) || 0; 
    });
  });

  const pct = total ? (done/total*100) : 0;

  const res = document.getElementById("resultat"); 
  if(res) res.textContent = `✅ ${done.toFixed(1)}/${total} pts (${pct.toFixed(1)}%)`;
  const pb = document.getElementById("progressBar"); 
  if(pb) pb.style.width = Math.min(100,Math.max(0,pct)) + "%";
  
  // ✅ Répéter l’affichage pour la vue Jour si présente
const resJour = document.getElementById("resultatJour");
if (resJour) resJour.textContent = `✅ ${done.toFixed(1)}/${total} pts (${pct.toFixed(1)}%)`;
const pbJour = document.getElementById("progressBarJour");
if (pbJour) pbJour.style.width = Math.min(100, Math.max(0, pct)) + "%";


// ✅ Support multi-paliers par semaine
const week = getWeekKey();
let reward = "❌ Aucune récompense", palier = "-";
const customRewards = child.rewardsByWeek?.[week];

if (Array.isArray(customRewards) && customRewards.length > 0) {
  // concatène tous les paliers en texte
  reward = customRewards.map(r => r.reward).join(" + ");
  palier = customRewards.map(r => r.palier).join(", ");
} else {
  if (pct >= (child.settings.thresholdHigh || 50) && child.settings.rewardHigh) {
    reward = `🏆 ${child.settings.rewardHigh}`;
    palier = "Palier 2";
  } else if (pct >= (child.settings.thresholdLow || 30) && child.settings.rewardLow) {
    reward = `🎁 ${child.settings.rewardLow}`;
    palier = "Palier 1";
  }
}


  // ⚙️ suite inchangée
  child.history = child.history || [];
  const existing = child.history.find(h => h.week === week);
  if(existing){
    existing.pct = pct.toFixed(1); 
    existing.reward = reward; 
    existing.palier = palier;
  } else {
    child.history.push({ week, pct:pct.toFixed(1), reward, palier });
  }
  saveChildren();
  
// ➕ MAJ bandeaux RECOMPENSE (SEMAINE) — basé sur % de la SEMAINE
const weekKey = getWeekKey();
const cfg = getWeeklyPaliersConfig(child, weekKey);
updateWeeklyRewardBanners(pct, cfg);

  majPuzzle(total,done);
  afficherHistorique();
  setChildHeaders();
}


function majAvancementJournee() {
  const pct = computeDailyProgressFromData();
  const bar = document.getElementById('progressBarJournee');
  const label = document.getElementById('resultatJournee');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

// Calcule l'avancement du jour en lisant les données (0/1/2) pour le dayIdx courant.
// Hypothèse: notes[weekKey][taskIdx][dayIdx][childIdx] ∈ {0,1,2}
function computeDailyProgressFromData() {
  try {
    const child = getChild();
    const weekKey = getWeekKey();
    ensureNotesForWeek(child, weekKey);

    const d = new Date(currentDate);
    const dayIdx = (d.getDay() === 0) ? 6 : (d.getDay() - 1);

    let total = 0, sum = 0;
    (child.tasks || []).forEach((t, i) => {
      const val = child.notes[weekKey]?.[i]?.[dayIdx];
      if (val !== undefined && val !== null) {
        total += 1;
        sum += parseFloat(val) || 0;
      }
    });

    if (total === 0) return 0;
    return Math.round((sum / total) * 100);
  } catch {
    return 0;
  }
}


function initDailyProgressListeners() {
  const container = document.getElementById('vue-jour');
  if (!container) return;
  container.addEventListener('change', (e) => {
    if (e.target && e.target.matches('input[type="radio"]')) {
      // Laisse d'abord ton handler existant sauvegarder la valeur, puis recalcule
      setTimeout(majAvancementJournee, 0);
    }
  });
}

/* ====== Radials (SVG segmentés) ====== */
function polarToCartesian(cx, cy, r, angleDeg){
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

/* Retourne le % semaine (sans effets de bord) */
function computeWeekProgress(){
  const child = getChild();
  const key = getWeekKey();
  ensureNotesForWeek(child, key);
  let total = 0, done = 0;
  (child.tasks || []).forEach((t,i)=>{
    (child.notes[key]?.[i] || []).forEach(v => { total += 1; done += parseFloat(v)||0; });
  });
  return total ? Math.round(done/total*100) : 0;
}

/* Retourne le % mois courant */
function computeMonthProgress(){
  const child = getChild();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const last = new Date(year, month+1, 0).getDate();
  let total = 0, done = 0;

  for(let d=1; d<=last; d++){
    const date = new Date(year, month, d);
    const dayIdx = (date.getDay() === 0) ? 6 : (date.getDay() - 1);
    const weekKey = `${getWeekNumber(date)}-${date.getFullYear()}`;
    ensureNotesForWeek(child, weekKey);
    (child.tasks || []).forEach((t,i)=>{
      const v = child.notes[weekKey]?.[i]?.[dayIdx];
      if(v !== undefined){
        total += 1;
        done += parseFloat(v)||0;
      }
    });
  }
  return total ? Math.round(done/total*100) : 0;
}

function ensureNotesForWeekChild(child, weekKey){
  if(!child.notes) child.notes = {};
  if(!Array.isArray(child.notes[weekKey]) || child.notes[weekKey].length !== (child.tasks?.length || 0)){
    child.notes[weekKey] = (child.tasks || []).map(()=>[0,0,0,0,0,0,0]);
  }
}

function computeDailyForChildIdx(idx){
  const child = children[idx]; if(!child) return 0;
  const weekKey = getWeekKey();
  ensureNotesForWeekChild(child, weekKey);
  const d = new Date(currentDate);
  const dayIdx = (d.getDay()===0)?6:(d.getDay()-1);
  let total=0, sum=0;
  (child.tasks || []).forEach((t,i)=>{
    const v = child.notes[weekKey]?.[i]?.[dayIdx];
    if(v !== undefined){ total+=1; sum += parseFloat(v)||0; }
  });
  return total? Math.round(sum/total*100) : 0;
}

function computeWeekForChildIdx(idx){
  const child = children[idx]; if(!child) return 0;
  const key = getWeekKey();
  ensureNotesForWeekChild(child, key);
  let total=0, sum=0;
  (child.tasks || []).forEach((t,i)=>{
    (child.notes[key]?.[i] || []).forEach(v=>{ total+=1; sum += parseFloat(v)||0; });
  });
  return total? Math.round(sum/total*100) : 0;
}

function computeMonthForChildIdx(idx){
  const child = children[idx]; if(!child) return 0;
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const last = new Date(year, month+1, 0).getDate();
  let total=0, sum=0;

  for(let d=1; d<=last; d++){
    const date = new Date(year, month, d);
    const dayIdx = (date.getDay()===0)?6:(date.getDay()-1);
    const weekKey = `${getWeekNumber(date)}-${date.getFullYear()}`;
    ensureNotesForWeekChild(child, weekKey);
    (child.tasks || []).forEach((t,i)=>{
      const v = child.notes[weekKey]?.[i]?.[dayIdx];
      if(v !== undefined){ total+=1; sum += parseFloat(v)||0; }
    });
  }
  return total? Math.round(sum/total*100) : 0;
}


/* Dessine une jauge segmentée type "donut" avec 12 segments */
function drawRadial(containerId, percent, strokeColor, label){
  const host = document.getElementById(containerId);
  if(!host) return;
  host.innerHTML = "";

  const size = 140;
  const cx = size/2, cy = size/2;
  const outerR = 64;     // anneau externe gris
  const r = 56;          // rayon des segments
  const segments = 12;   // nbre de “parts”
  const gapDeg = 6;      // écart visuel entre parts
  const partDeg = 360/segments;
  const fillParts = Math.floor((percent/100) * segments);

  // SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // anneau gris externe
  const outer = document.createElementNS(svg.namespaceURI, "circle");
  outer.setAttribute("class", "outer-ring");
  outer.setAttribute("cx", cx);
  outer.setAttribute("cy", cy);
  outer.setAttribute("r", outerR);
  svg.appendChild(outer);

  // segments de fond (gris)
  for(let i=0;i<segments;i++){
    const start = i*partDeg + gapDeg/2;
    const end   = (i+1)*partDeg - gapDeg/2;
    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", describeArc(cx, cy, r, start, end));
    p.setAttribute("class", "seg-bg");
    svg.appendChild(p);
  }

  // segments colorés (jusqu’au floor du %)
  for(let i=0;i<fillParts;i++){
    const start = i*partDeg + gapDeg/2;
    const end   = (i+1)*partDeg - gapDeg/2;
    const p = document.createElementNS(svg.namespaceURI, "path");
    p.setAttribute("d", describeArc(cx, cy, r, start, end));
    p.setAttribute("class", "seg-fill");
    p.setAttribute("stroke", strokeColor);
    svg.appendChild(p);
  }

  host.appendChild(svg);

  // pastille centrale (valeur + libellé)
  const center = document.createElement("div");
  center.className = "center";
  center.innerHTML = `
    <div class="badge">
      <div class="pct">${percent}%</div>
      <div class="lbl">${label}</div>
    </div>`;
  host.appendChild(center);
}

/* Met à jour les 3 jauges */
function renderRadials(){
  const pctDay  = computeDailyProgressFromData();
  const pctWeek = computeWeekProgress();
  const pctMonth= computeMonthProgress();

  const css = getComputedStyle(document.documentElement);

  drawRadial("radial-jour",    pctDay,  css.getPropertyValue("--color-jour").trim()    || "#1e63d1", "jour");
  drawRadial("radial-semaine", pctWeek, css.getPropertyValue("--color-semaine").trim() || "#2ecc71", "semaine");
  drawRadial("radial-mois",    pctMonth,css.getPropertyValue("--color-mois").trim()    || "#8e44ad", "mois");
}

function renderHome(){
  const hero = document.getElementById('homeHero');
  const title = document.getElementById('homeTitle');
  const subtitle = document.getElementById('homeSubtitle');
  const illustration = document.getElementById('homeIllustration');
  const list = document.getElementById('homeChildren');

  if(!hero || !title || !list) return;

  const hasChildren = (children && children.length > 0);

  if(!hasChildren){
    // Mode "Bienvenue"
    title.textContent = "Bienvenue dans le Daily Home Kid Challenge 🎉";
    if(subtitle) subtitle.style.display = "";
    if(illustration) illustration.style.display = "";
    list.style.display = "none";
    hero.style.display = "";
    return;
  }

  // Mode "Récapitulatif"
  title.textContent = "Récapitulatif par enfant";
  if(subtitle) subtitle.style.display = "none";
  if(illustration) illustration.style.display = "none";
  hero.style.display = "";         // on garde le titre
  list.style.display = "";         // on montre la grille

  list.innerHTML = ""; // reset
  children.forEach((ch, idx)=>{
    const name = (ch?.settings?.childName || "Mon enfant").trim();
    const avatar = ch?.settings?.avatar || "img/default.png";

    const pctDay   = computeDailyForChildIdx(idx);
    const pctWeek  = computeWeekForChildIdx(idx);
    const pctMonth = computeMonthForChildIdx(idx);

    const card = document.createElement('article');
    card.className = "child-card";
    card.innerHTML = `
      <img class="card-avatar" src="${avatar}" alt="${name}">
      <div>
        <div class="card-title">${name}</div>
        <div class="hc-bars">
          <div class="hc-row">
            <div class="hc-label">Jour</div>
            <div class="hc-bar"><div class="hc-fill day"   style="width:${pctDay}%"></div></div>
            <div class="hc-pct">${pctDay}%</div>
          </div>
          <div class="hc-row">
            <div class="hc-label">Semaine</div>
            <div class="hc-bar"><div class="hc-fill week"  style="width:${pctWeek}%"></div></div>
            <div class="hc-pct">${pctWeek}%</div>
          </div>
          <div class="hc-row">
            <div class="hc-label">Mois</div>
            <div class="hc-bar"><div class="hc-fill month" style="width:${pctMonth}%"></div></div>
            <div class="hc-pct">${pctMonth}%</div>
          </div>
        </div>
      </div>
    `;
	// Rendre la carte cliquable → ouvrir la vue Jour de l’enfant
card.setAttribute('role', 'button');
card.setAttribute('tabindex', '0');
card.setAttribute('title', `Ouvrir le suivi de ${name}`);

card.addEventListener('click', () => {
  selectChild(idx);
  showView('vue-jour');
});

card.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectChild(idx);
    showView('vue-jour');
  }
});

    list.appendChild(card);
  });
}


function afficherHistorique(){
  const body=document.getElementById("historiqueBody"); if(!body) return;
  body.innerHTML="";
  const hist=getChild().history||[]; let totalPct=0;
  hist.forEach(h=>{
    body.insertAdjacentHTML("beforeend",`<tr><td>${h.week}</td><td>${h.pct}%</td><td>${h.reward}</td><td>${h.palier}</td></tr>`);
    totalPct += parseFloat(h.pct)||0;
  });
  if(hist.length){
    const avg=(totalPct/hist.length).toFixed(1);
    body.insertAdjacentHTML("beforeend",`<tr class="row-average"><td>Moyenne</td><td>${avg}%</td><td colspan="2"></td></tr>`);
  }

  const ctx=document.getElementById("historyChart")?.getContext("2d"); if(!ctx) return;
  if(historyChart) historyChart.destroy();

  const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim();
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

  historyChart=new Chart(ctx,{
    type:"line",
    data:{
      labels: hist.map(h=>h.week),
      datasets:[{
        label:"% réussi",
        data: hist.map(h=>+h.pct||0),
        borderColor: secondary,
        backgroundColor:"transparent",
        fill:false,
        tension:.25
      }]
    },
    options:{
      scales:{
        y:{ beginAtZero:true, max:100, ticks:{ color:textColor } },
        x:{ ticks:{ color:textColor } }
      },
      plugins:{
        legend:{ labels:{ color:textColor } }
      }
    }
  });
}

/* ================= Puzzle & Image ================= */

function majPuzzle(total=0,done=0){
  const mask=document.getElementById("puzzleMask"); if(!mask) return;
  mask.innerHTML="";
  if(total===0){ mask.innerHTML="<p style='color:#666;'>⚠️ Pas de tâches définies</p>"; return; }

  const cols=Math.ceil(Math.sqrt(total)), totalCells=cols*cols;
  mask.style.display="grid";
  mask.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  mask.style.gap="0";

  for(let i=0;i<totalCells;i++){
    const p=document.createElement("div"); p.className="puzzle-piece"; mask.appendChild(p);
  }
  const pieces=mask.querySelectorAll(".puzzle-piece");
  const order=[...Array(totalCells).keys()];
  if(done>0){
    setTimeout(()=>{ order.forEach((pos,i)=>{ if(i<done) setTimeout(()=>pieces[pos].classList.add("revealed"),120*i); }); },200);
  }
}

/* Upload / Delete puzzle image */
function uploadImage(){ document.getElementById("imageInput")?.click(); }
function handleImageUpload(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=x=>{ const img=document.querySelector(".puzzle-image"); if(img) img.src=x.target.result; };
  r.readAsDataURL(f);
}
function deleteImage(){
  const img=document.querySelector(".puzzle-image");
  if(img) img.src="img/puzzle.png";
  const input=document.getElementById("imageInput");
  if(input) input.value="";
}

/* ================= Sidebar open/close + Accordéon ================= */

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.querySelector(".menu-btn");

function openMenu(){ sidebar?.classList.add("show"); overlay?.classList.add("show"); }
function closeMenu(){ sidebar?.classList.remove("show"); overlay?.classList.remove("show"); }

menuBtn?.addEventListener("click", ()=>{ sidebar?.classList.contains("show") ? closeMenu() : openMenu(); });
overlay?.addEventListener("click", closeMenu);
document.querySelector(".nav-list li:first-child")?.addEventListener("click", closeMenu);


/* Accordéon enfants */
document.addEventListener("click",(e)=>{
  const h3 = e.target.closest(".child-accordion > h3");
  if(!h3) return;
  h3.parentElement.classList.toggle("open");
});

/* ================= Gestion des vues ================= */

function showView(id){
  // Masquer toutes les vues
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  // Afficher la vue demandée
  document.getElementById(id)?.classList.add("active");

  // Mettre à jour l’état actif des onglets
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  if(id === "vue-jour") {
    document.querySelectorAll('.tabs button').forEach(btn=>{
      if(btn.textContent.trim() === "Jour") btn.classList.add("active");
    });
  } else if(id === "vue-mois") {
    document.querySelectorAll('.tabs button').forEach(btn=>{
      if(btn.textContent.trim() === "Mois") btn.classList.add("active");
    });
  }

  // Toujours fermer le menu quand on change de vue
  closeMenu();
}




function switchTab(btn,id){
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  showView(id);
}
window.showView = showView;
window.switchTab = switchTab;

/* ================= Initialisation ================= */

function majUI(){
  rebuildSidebar();
  setWeekTitle();
  setChildHeaders();
  setCurrentDayLabel();     // 🔹 Affiche le jour courant sous "Semaine" (vue Jour)
  majVueJour();
  majAvancementJournee();
  majVueMois();
  calculer();
  renderRadials();
  syncCustomWeekIfVisible();

  // 🔹 NOUVEAU : rafraîchir la page d’accueil selon présence d’enfants
  renderHome();
  // ✅ Réattacher les boutons de maintenance à chaque reconstruction
  document.getElementById("btnResetChildren")?.addEventListener("click", resetAllChildren);
  document.getElementById("btnPurgeAll")?.addEventListener("click", purgeAll);
  // Si aucune vue active, afficher la page d’accueil par défaut
if (!document.querySelector(".view.active")) {
  showView("vue-accueil");
}

}

/* ===== Nom & Avatar ===== */
function openNameAvatar(i){
  selectChild(i);
  showView("vue-nom-avatar");
  const child = getChild();

  // Nom existant
  const nameInput = document.getElementById("inputChildName");
  if(nameInput){
    nameInput.value = child.settings.childName || "";
    nameInput.oninput = () => {
      child.settings.childName = nameInput.value.trim() || "Mon enfant";
      saveChildren();
      majUI();
    };
  }


// Avatar existant
const avatarPreview = document.getElementById("avatarPreview");
const avatarFileName = document.getElementById("avatarFileName");

console.log("avatarPreview trouvé ?", avatarPreview);

if (child.settings.avatar) {
  console.log("Avatar trouvé dans localStorage :", child.settings.avatar.substring(0, 50));
  avatarPreview.src = child.settings.avatar;
  avatarFileName.textContent = child.settings.avatarName || "Image importée";
} else {
  console.log("Pas d’avatar → utilisation du défaut");
  avatarPreview.src = "img/default.png";
  avatarFileName.textContent = "Avatar par défaut";
}

  // Âge
  const ageInput = document.getElementById("inputChildAge");
  if(ageInput){
    ageInput.value = child.settings.age || "";
    ageInput.oninput = () => {
      child.settings.age = parseInt(ageInput.value) || null;  // <= sauvegarde dans settings
      saveChildren();   // <= écrit dans localStorage
    };
  }

  // Genre
  document.querySelectorAll("input[name='childGender']").forEach(radio=>{
    radio.checked = (child.settings.gender || "non-defini") === radio.value;
    radio.onchange = () => {
      if(radio.checked){
        child.settings.gender = radio.value;  // <= sauvegarde dans settings
        saveChildren();                       // <= écrit dans localStorage
      }
    };
  });



  // Upload avatar
  const inputAvatar = document.getElementById("inputAvatar");
  if(inputAvatar){
    inputAvatar.value = "";
inputAvatar.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ Refus si trop gros (>5 Mo)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("⚠️ L’image est trop lourde (max 5 Mo). Choisis une image plus légère.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      // ✅ Redimensionnement automatique à 200x200 px max
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const size = 200;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      // ✅ Export compressé en PNG base64 (qualité 80%)
      const dataUrl = canvas.toDataURL("image/png", 0.8);

      // ✅ Mise à jour UI + stockage
      avatarPreview.src = dataUrl;
      children[currentChild].settings.avatar = dataUrl;
      children[currentChild].settings.avatarName = file.name;
      avatarFileName.textContent = file.name;
      saveChildren();
      majUI(); // ✅ met à jour la sidebar immédiatement
      console.log("✅ Avatar compressé et sauvegardé", dataUrl.substring(0, 50));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};


  }

  showView("vue-nom-avatar");
}




function deleteAvatar(){
  const child = getChild();
  child.settings.avatar = null;
  delete child.settings.avatarName;
  saveChildren();

  const avatarPreview = document.getElementById("avatarPreview");
  if(avatarPreview) avatarPreview.src = "img/default.png";

  const avatarFileName = document.getElementById("avatarFileName");
  if(avatarFileName) avatarFileName.textContent = "Avatar par défaut";

  const inputAvatar = document.getElementById("inputAvatar");
  if(inputAvatar) inputAvatar.value = "";

  majUI();
  alert("✅ Avatar réinitialisé à l’image par défaut");
}




/* ===== Gestion des tâches ===== */
function openTaskManager(i){
  selectChild(i);
  renderTaskList();
  showView("vue-taches");
}

function renderTaskList(){
  const ul = document.getElementById("taskList");
  const child = getChild();
  if(!ul) return;
  ul.innerHTML = "";
  child.tasks.forEach((t, idx)=>{
    ul.insertAdjacentHTML("beforeend",`
      <li>
        ${t.name}
        <span>
          <button onclick="moveTask(${idx},-1)">⬆️</button>
          <button onclick="moveTask(${idx},1)">⬇️</button>
          <button onclick="removeTask(${idx})">🗑️</button>
        </span>
      </li>`);
  });
}

function addTask(){
  const input = document.getElementById("newTaskName");
  if(!input) return;
  const name = input.value.trim();
  if(!name) return;
  getChild().tasks.push({ name, weights:[1,1,1,1,1,0,0] });
  saveChildren();
  renderTaskList();
  input.value = "";
}

function removeTask(i){
  getChild().tasks.splice(i,1);
  saveChildren();
  renderTaskList();
}

function moveTask(i,dir){
  const child = getChild();
  const tasks = child.tasks;
  const j = i+dir;
  if(j<0 || j>=tasks.length) return;
  [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
  saveChildren();
  renderTaskList();
}

/* Le bouton manuel n’est plus nécessaire, mais tu peux le garder sans effet */
function saveRewards(){
  alert("💾 Sauvegarde automatique déjà activée !");
}


function saveRewards(){
  alert("💾 Sauvegarde automatique déjà activée !");
}

function appliquerStyleRadio(r){
  const label = r.nextElementSibling;
  if(!label) return;

  // Reset par défaut
  label.style.opacity = "0.4";
  label.style.background = "transparent";
  label.style.border = "2px solid transparent";

  if(r.checked){
    label.style.opacity = "1";
    label.style.border = "2px solid #aaa";
    if(r.value === "0") label.style.background = "#fdecea";   // rouge clair
    if(r.value === "0.5") label.style.background = "#fff4e5"; // orange clair
    if(r.value === "1") label.style.background = "#e8f5e9";   // vert clair
  }
}

function goBackToSidebar(){
  // 🔄 Sauvegarde au cas où des changements n’ont pas encore été persistés
  saveChildren();

  // ✅ Rafraîchir l’interface pour mettre à jour l’avatar dans la sidebar
  majUI();

  // ✅ Réouvrir la sidebar (comme avant)
  openMenu();
}

/* ===== Récompenses personnalisées par semaine ===== */
/* ================= Récompenses personnalisées ================= */

function addWeeklyReward() {
  const child = getChild();
  const week = document.getElementById("customWeek")?.value.trim();
  const reward = document.getElementById("customReward")?.value.trim();
  const palier = document.getElementById("customPalier")?.value;

  if (!week || !reward) {
    alert("Veuillez saisir la semaine et la récompense.");
    return;
  }

  // 🔁 Toujours enregistrer sur la semaine affichée (pas sur la saisie)
  const weekKey = getWeekKey();

  // Palier normalisé (tolère 1 / p1 / palier1 / Palier 1)
  const normPalier = (p) => {
    const x = String(p || "").toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "");
    if (x === "1" || x === "p1" || x === "palier1") return "Palier 1";
    if (x === "2" || x === "p2" || x === "palier2") return "Palier 2";
    return "Palier 1";
  };
  const palNorm = normPalier(palier);

  if (!child.rewardsByWeek) child.rewardsByWeek = {};
  if (!Array.isArray(child.rewardsByWeek[weekKey])) {
    child.rewardsByWeek[weekKey] = [];
  }

  // Empêche doublon exact pour cette semaine/palier
  const exists = child.rewardsByWeek[weekKey].some(
    r => r.palier === palNorm && r.reward === reward
  );
  if (exists) {
    alert("Cette récompense existe déjà pour cette semaine et ce palier.");
    return;
  }

  child.rewardsByWeek[weekKey].push({ reward, palier: palNorm });
  saveChildren();
  majTableCustomRewards();

  // ➜ rafraîchir immédiatement la vue Jour (bandeaux)
  calculer();

  const input = document.getElementById("customReward");
  if (input) input.value = "";



  saveChildren();
  majTableCustomRewards();

  // 🟢 Recalcule tout de suite pour mettre à jour les bandeaux en vue Jour
  calculer();

  document.getElementById("customReward").value = "";


  saveChildren();
  majTableCustomRewards();
  document.getElementById("customReward").value = "";
}

/* === Affichage du tableau de récompenses personnalisées === */
function majTableCustomRewards() {
  const child = getChild();
  const tbody = document.querySelector("#customRewardsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const [week, rewards] of Object.entries(child.rewardsByWeek || {})) {
    rewards.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${week}</td>
        <td>${r.reward}</td>
        <td>${r.palier || "-"}</td>
        <td><button onclick="deleteWeeklyReward('${week}', ${idx})">❌</button></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

/* === Suppression === */
function deleteWeeklyReward(week, idx) {
  const child = getChild();
  if (!child.rewardsByWeek?.[week]) return;
  child.rewardsByWeek[week].splice(idx, 1);
  if (child.rewardsByWeek[week].length === 0) delete child.rewardsByWeek[week];
  saveChildren();
  majTableCustomRewards();
  calculer(); // met à jour les bandeaux tout de suite
}

/* === Sauvegarde / affichage au chargement === */
function openRewardsManager(i) {
  selectChild(i);
  showView("vue-recompenses");
  
// 🔒 Le champ "Semaine" est toujours la semaine affichée
const weekInput = document.getElementById("customWeek");
if (weekInput) {
  const wk = getWeekKey();          // ex. "44-2025"
  weekInput.value = wk;
  weekInput.placeholder = wk;       // visible même si disabled
  weekInput.readOnly = true;
  weekInput.disabled = true;
}

  majTableCustomRewards();
    // 🔹 Rattacher la sauvegarde automatique des seuils et récompenses de base
  const c = getChild();

  const inputRewardLow  = document.getElementById("inputRewardLow");
  const inputRewardHigh = document.getElementById("inputRewardHigh");
  const inputThresholdLow  = document.getElementById("inputThresholdLow");
  const inputThresholdHigh = document.getElementById("inputThresholdHigh");

  if (inputRewardLow) {
    inputRewardLow.value = c.settings.rewardLow || "";
    inputRewardLow.oninput = () => {
      c.settings.rewardLow = inputRewardLow.value.trim();
      saveChildren();
    };
  }

  if (inputRewardHigh) {
    inputRewardHigh.value = c.settings.rewardHigh || "";
    inputRewardHigh.oninput = () => {
      c.settings.rewardHigh = inputRewardHigh.value.trim();
      saveChildren();
    };
  }

  if (inputThresholdLow) {
    inputThresholdLow.value = c.settings.thresholdLow || 30;
    inputThresholdLow.oninput = () => {
      c.settings.thresholdLow = parseFloat(inputThresholdLow.value) || 0;
      saveChildren();
    };
  }

  if (inputThresholdHigh) {
    inputThresholdHigh.value = c.settings.thresholdHigh || 50;
    inputThresholdHigh.oninput = () => {
      c.settings.thresholdHigh = parseFloat(inputThresholdHigh.value) || 0;
      saveChildren();
    };
  }
updateRewardSummary();
}

function updateRewardSummary() {
  const c = getChild();

  const input1 = document.getElementById("summaryThreshold1");
  const input2 = document.getElementById("summaryThreshold2");
  const reward1 = document.getElementById("summaryReward1");
  const reward2 = document.getElementById("summaryReward2");

  // Initialisation des valeurs
  input1.value = c.settings.thresholdLow || 0;
  input2.value = c.settings.thresholdHigh || 0;
  reward1.value = c.settings.rewardLow || "";
  reward2.value = c.settings.rewardHigh || "";

  // Sauvegarde automatique à la saisie
  input1.oninput = () => { c.settings.thresholdLow = parseFloat(input1.value) || 0; saveChildren(); };
  input2.oninput = () => { c.settings.thresholdHigh = parseFloat(input2.value) || 0; saveChildren(); };
  reward1.oninput = () => { c.settings.rewardLow = reward1.value.trim(); saveChildren(); };
  reward2.oninput = () => { c.settings.rewardHigh = reward2.value.trim(); saveChildren(); };
}


function renderCustomRewards() {
  const c = getChild();
  const tbody = document.querySelector("#customRewardsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const rewards = c.rewardsByWeek || {};
  for (const [week, data] of Object.entries(rewards)) {
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${week}</td>
        <td>${data.reward}</td>
        <td>${data.palier}</td>
        <td><button onclick="deleteWeeklyReward('${week}')">🗑️</button></td>
      </tr>
    `);
  }
}

function showToast(message, color = "var(--primary)") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

/* === Vue-jour : sélection du jour === */

/** Retourne le dayIdx (0=Lundi..6=Dimanche) pour la currentDate dans SA semaine. */
function getDayIdxInWeek(date) {
  const monday = getMonday(date);                  // util déjà présent chez toi
  const diffDays = Math.round((date - monday) / (24 * 3600 * 1000));
  return Math.max(0, Math.min(6, diffDays));
}

/** Définit currentDate sur le jour d’index dayIdx dans la semaine ACTUELLEMENT affichée. */
function setDayIdxInCurrentWeek(dayIdx) {
  const monday = getMonday(currentDate);           // on ne change pas de semaine, on bouge juste le jour
  const newDate = new Date(monday);
  newDate.setDate(monday.getDate() + dayIdx);
  currentDate = newDate;

  // Rendu de la vue-jour (garde le verrouillage : radios disabled si semaine != courante)
  majVueJour();
  // <-- AJOUTER ICI :
  majAvancementJournee();
  renderRadials();

  if (typeof updateJourSelectorUI === "function") updateJourSelectorUI();
   
}

/** Met à jour la classe .active sur la bonne puce selon currentDate. */
function updateJourSelectorUI() {
  const container = document.getElementById('jour-selector');
  if (!container) return;

  const idx = getDayIdxInWeek(currentDate);
  container.querySelectorAll('.jour-btn').forEach((btn) => {
    const bIdx = parseInt(btn.getAttribute('data-day-idx'), 10);
    if (bIdx === idx) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

/** Branche les listeners sur la barre 7 jours. À appeler une fois au chargement. */
function initJourSelector() {
  const container = document.getElementById('jour-selector');
  if (!container) return;

  // Clic sur une puce
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.jour-btn');
    if (!btn) return;
    const idx = parseInt(btn.getAttribute('data-day-idx'), 10);
    if (Number.isNaN(idx)) return;

    // On autorise toujours la navigation jour, même si la semaine est verrouillée
    // (le verrouillage s'applique à la SAISIE via les radios déjà disabled hors semaine courante)
    setDayIdxInCurrentWeek(idx);
  });

  // Initialisation de l'état visuel
  updateJourSelectorUI();
}

/* --- IMPORTANT : appeler initJourSelector au démarrage --- */
// Exemple : dans ton init global existant
document.addEventListener('DOMContentLoaded', () => {
  // ... ton init existant ...
  initJourSelector();

  // Assure que la barre se met à jour quand la vue-jour se rafraîchit ou si la semaine change
  // => si tu as déjà un hook après majVueJour() globale, sinon :
  const _majVueJour = majVueJour;
  window.majVueJour = function () {
    _majVueJour.apply(this, arguments);
    updateJourSelectorUI();
  };
});


document.addEventListener("DOMContentLoaded",()=>{
  bootstrapIfEmpty();
  majUI();
  initJourSelector();
  updateJourSelectorUI(); // synchronise la puce bleue au premier rendu

  showView("vue-accueil"); // ✅ vue par défaut au lancement

  document.getElementById("btnPrev")?.addEventListener("click",()=>{
    changerSemaine(-1);
    renderRadials();
  });
  document.getElementById("btnNext")?.addEventListener("click",()=>{
    changerSemaine(1);
    renderRadials();
  });

  document.getElementById("btnPrevMonth")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()-1);
    majUI();
    renderRadials();
  });
  document.getElementById("btnNextMonth")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()+1);
    majUI();
    renderRadials();
  });


  // Résultats (upload / delete image)
  document.getElementById("btnUploadImage")?.addEventListener("click",uploadImage);
  document.getElementById("btnDeleteImage")?.addEventListener("click",deleteImage);

  // 🔹 Ajout à faire ici :
  initDailyProgressListeners();
  majAvancementJournee();
    // === Hook : après chaque rafraîchissement de la vue-jour, on met à jour la barre ===
  const _majVueJour = majVueJour;
  window.majVueJour = function () {
    _majVueJour.apply(this, arguments);
  // --> AJOUTS pour corriger le bug :
  majAvancementJournee();  // recalcule le % jour pour le jour affiché
  renderRadials();         // redessine les cercles (jour/semaine/mois)
  // (si tu as la barre 7 jours) :
  if (typeof updateJourSelectorUI === "function") updateJourSelectorUI();  
  };

});



/* ================= Exposition des handlers (globaux) ================= */

window.selectChild = selectChild;
window.openNameAvatar = openNameAvatar;
window.openTaskManager = openTaskManager;
window.openRewardsManager = openRewardsManager;
window.exportChild = exportChild;
window.deleteChild = deleteChild;
window.handleImportChild = handleImportChild;
window.importExample = importExample;
window.addChild = addChild;
window.resetAllChildren = resetAllChildren;
window.purgeAll = purgeAll;
window.addWeeklyReward = addWeeklyReward;
window.renderCustomRewards = renderCustomRewards;
window.deleteWeeklyReward = deleteWeeklyReward;
