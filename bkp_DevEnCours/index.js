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
      history:[]
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
function changerSemaine(delta){ currentDate.setDate(currentDate.getDate()+delta*7); majUI(); }

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
          <span><img src="${ch.settings.avatar || "img/"+name+".png"}" class="avatar" alt=""> ${name}</span>
          <span class="arrow">▼</span>
        </h3>
        <ul class="options">
          <li onclick="openNameAvatar(${idx})">🖼️ Nom et avatar</li>
          <li onclick="openTaskManager(${idx})">📋 Gestion des tâches</li>
          <li onclick="openRewardsManager(${idx})">🎁 Gestion des récompenses</li>
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
  const n=prompt("Nom de l'enfant :");
  if(!n) return;
  children.push({
    settings:{ childName:n.trim(), rewardLow:"", rewardHigh:"", thresholdLow:30, thresholdHigh:50 },
    tasks:[], notes:{}, history:[]
  });
  saveChildren(); currentChild=children.length-1; majUI();
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
  if(!confirm("Réinitialiser toutes les données (tâches/notes/historique) ?")) return;
  children.forEach(c=>{ c.tasks=[]; c.notes={}; c.history=[]; });
  saveChildren(); majUI();
}
function purgeAll(){
  if(!confirm("Tout supprimer ?")) return;
  children=[]; saveChildren(); bootstrapIfEmpty(); currentChild=0; majUI();
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
function openRewardsManager(i){
  selectChild(i);
  const c=children[i];
  const low = prompt("Récompense palier 1 :", c.settings.rewardLow||"");
  if(low!==null) c.settings.rewardLow=low;
  const high = prompt("Récompense palier 2 :", c.settings.rewardHigh||"");
  if(high!==null) c.settings.rewardHigh=high;
  const tLow = prompt("Seuil palier 1 (%) :", c.settings.thresholdLow||30);
  if(tLow!==null) c.settings.thresholdLow = Number(tLow)||30;
  const tHigh = prompt("Seuil palier 2 (%) :", c.settings.thresholdHigh||50);
  if(tHigh!==null) c.settings.thresholdHigh = Number(tHigh)||50;
  saveChildren(); majUI();
}

/* ================= En-têtes, titres & labels ================= */

function setWeekTitle(){
  const {m,s}=getWeekData();
  const fmt=d=>d.toLocaleDateString('fr-FR',{day:'2-digit',month:'long'});
  const weekTitle=document.getElementById("weekTitle");
  if(weekTitle) weekTitle.textContent=`${fmt(m)} – ${fmt(s)}`;
  const weekTitleWeek=document.getElementById("weekTitle_week");
  if(weekTitleWeek) weekTitleWeek.textContent=`Semaine ${getWeekNumber(m)} • ${m.getFullYear()}`;
  const monthTitle=document.getElementById("monthTitle");
  if(monthTitle) monthTitle.textContent=monthLabel(new Date(currentDate.getFullYear(), currentDate.getMonth(),1));
}

function setChildHeaders(){
  const n=getChild().settings.childName||"Mon enfant";
  const day=document.getElementById("currentChild_day");
  const week=document.getElementById("currentChild_week");
  const month=document.getElementById("currentChild_month");
  if(day) day.textContent=n;
  if(week) week.textContent=n;
  if(month) month.textContent=n;
  const title=document.getElementById("childTitle");
  if(title) title.textContent="Résultats - "+n;
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
  const tbody=document.querySelector("#vue-jour table tbody"); if(!tbody) return;
  tbody.innerHTML="";
  const child=getChild(); const key=getWeekKey(); ensureNotesForWeek(child,key);
  const d=new Date(currentDate); const dayIdx=(d.getDay()===0)?6:(d.getDay()-1);

  if(!child.tasks.length){
    tbody.innerHTML=`<tr><td colspan="2">⚠️ Aucune tâche définie</td></tr>`; return;
  }
  child.tasks.forEach((t,i)=>{
    const checked=child.notes[key]?.[i]?.[dayIdx]?"checked":"";
    const disable=(key!==getCurrentWeekKey())?"disabled":"";
    tbody.insertAdjacentHTML("beforeend",`
      <tr>
        <td>${t.name}</td>
        <td><input type="checkbox" data-task="${i}" data-day="${dayIdx}" ${checked} ${disable}></td>
      </tr>`);
  });
  tbody.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.addEventListener("change",()=>{sauverNotes(); calculer();}));
}

function majVueSemaine(){
  const tbody=document.querySelector("#vue-semaine table tbody"); if(!tbody) return;
  tbody.innerHTML="";
  const child=getChild(); const key=getWeekKey(); ensureNotesForWeek(child,key);

  if(!child.tasks.length){
    tbody.innerHTML=`<tr><td colspan="8">⚠️ Aucune tâche définie</td></tr>`; return;
  }
  child.tasks.forEach((t,i)=>{
    let row=`<tr><td>${t.name}</td>`;
    days.forEach((_,d)=>{
      const checked=child.notes[key]?.[i]?.[d]?"checked":"";
      const disable=(key!==getCurrentWeekKey())?"disabled":"";
      row+=`<td><input type="checkbox" data-task="${i}" data-day="${d}" ${checked} ${disable}></td>`;
    });
    row+="</tr>";
    tbody.insertAdjacentHTML("beforeend",row);
  });
  tbody.querySelectorAll("input[type=checkbox]").forEach(cb=>cb.addEventListener("change",()=>{sauverNotes(); calculer();}));
}

function majVueMois(){
  const cal=document.querySelector("#vue-mois .calendar-month"); 
  if(!cal) return;
  cal.innerHTML="";
  const child=getChild(); const key=getWeekKey(); ensureNotesForWeek(child,key);

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

    if(thisDate.getTime() === today.getTime()){
      cell.classList.add("today");     // jour en cours
    } else if(thisDate < today){
      cell.classList.add("past");      // jours passés
    }
    
    cell.innerHTML=`<span class="date">${d}</span>`;
    cal.appendChild(cell);
  }
}

function sauverNotes(){
  const key=getWeekKey(), child=getChild(); 
  ensureNotesForWeek(child,key);

  document.querySelectorAll("input[type=checkbox]").forEach(cb=>{
    const i=cb.dataset.task, d=cb.dataset.day;
    if(i!==undefined && d!==undefined){
      child.notes[key][i][d]=cb.checked?1:0;
    }
  });

  saveChildren();
+
+  // 🔹 Forcer la mise à jour des deux vues pour synchroniser
+  majVueJour();
+  majVueSemaine();
}





/* ================= Calcul, Résultats & Historique ================= */

let historyChart=null;

function calculer(){
  const child=getChild(); const key=getWeekKey(); ensureNotesForWeek(child,key);
  const notes=child.notes[key]||[]; let total=0,done=0;
  (child.tasks||[]).forEach((t,i)=>{
    (t.weights||[]).forEach((w=0,d)=>{ total+=+w||0; if(notes[i]?.[d]) done+=+w||0; });
  });
  const pct=total?(done/total*100):0;

  const res=document.getElementById("resultat"); if(res) res.textContent=`✅ ${done}/${total} pts (${pct.toFixed(1)}%)`;
  const pb=document.getElementById("progressBar"); if(pb) pb.style.width=Math.min(100,Math.max(0,pct))+"%";

  const week=getWeekKey(); child.history=child.history||[];
  let reward="❌ Aucune récompense", palier="-";
  if(pct >= (child.settings.thresholdHigh||50) && child.settings.rewardHigh){
    reward=`🏆 ${child.settings.rewardHigh}`; palier="Palier 2";
  }else if(pct >= (child.settings.thresholdLow||30) && child.settings.rewardLow){
    reward=`🎁 ${child.settings.rewardLow}`; palier="Palier 1";
  }
  const existing=child.history.find(h=>h.week===week);
  if(existing){ existing.pct=pct.toFixed(1); existing.reward=reward; existing.palier=palier; }
  else{ child.history.push({week, pct:pct.toFixed(1), reward, palier}); }
  saveChildren();

  majPuzzle(total,done);
  afficherHistorique();
  setChildHeaders();
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
  } else if(id === "vue-semaine") {
    document.querySelectorAll('.tabs button').forEach(btn=>{
      if(btn.textContent.trim() === "Semaine") btn.classList.add("active");
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
  majVueSemaine();
  majVueMois();
  calculer();
}

/* ===== Nom & Avatar ===== */
function openNameAvatar(i){
  selectChild(i);
  const child = getChild();

  // Charger nom existant
  const nameInput = document.getElementById("inputChildName");
  if(nameInput) nameInput.value = child.settings.childName || "";

  // Charger avatar existant
  const avatarPreview = document.getElementById("avatarPreview");
  if(avatarPreview) avatarPreview.src = child.settings.avatar || "img/default.png";

  showView("vue-nom-avatar");
}

function saveNameAvatar(){
  const child = getChild();
  const nameInput = document.getElementById("inputChildName");
  if(nameInput) child.settings.childName = nameInput.value.trim() || "Mon enfant";

  const inputAvatar = document.getElementById("inputAvatar");
  if(inputAvatar && inputAvatar.files && inputAvatar.files[0]){
    const reader = new FileReader();
    reader.onload = (e)=>{ 
      child.settings.avatar = e.target.result; 
      saveChildren(); 
      majUI(); 
    };
    reader.readAsDataURL(inputAvatar.files[0]);
  } else {
    saveChildren(); 
    majUI();
  }
  alert("✅ Nom & avatar enregistrés");
}


/* ===== Gestion des tâches ===== */
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




/* ===== Gestion des récompenses ===== */
function openRewardsManager(i){
  selectChild(i);
  const c = getChild();

  const rLow = document.getElementById("inputRewardLow");
  const rHigh = document.getElementById("inputRewardHigh");
  const tLow = document.getElementById("inputThresholdLow");
  const tHigh = document.getElementById("inputThresholdHigh");

  if(rLow) rLow.value = c.settings.rewardLow || "";
  if(rHigh) rHigh.value = c.settings.rewardHigh || "";
  if(tLow) tLow.value = c.settings.thresholdLow || 30;
  if(tHigh) tHigh.value = c.settings.thresholdHigh || 50;

  showView("vue-recompenses");
}

function saveRewards(){
  const c = getChild();

  const rLow = document.getElementById("inputRewardLow");
  const rHigh = document.getElementById("inputRewardHigh");
  const tLow = document.getElementById("inputThresholdLow");
  const tHigh = document.getElementById("inputThresholdHigh");

  if(rLow) c.settings.rewardLow = rLow.value.trim();
  if(rHigh) c.settings.rewardHigh = rHigh.value.trim();
  if(tLow) c.settings.thresholdLow = Number(tLow.value) || 30;
  if(tHigh) c.settings.thresholdHigh = Number(tHigh.value) || 50;

  saveChildren(); 
  majUI();
  alert("✅ Récompenses enregistrées");
}



document.addEventListener("DOMContentLoaded",()=>{
  bootstrapIfEmpty();
  majUI();

  // Vue Jour : semaine précédente/suivante
  document.getElementById("btnPrev")?.addEventListener("click",()=>changerSemaine(-1));
  document.getElementById("btnNext")?.addEventListener("click",()=>changerSemaine(1));

  // Vue Semaine : semaine précédente/suivante
  document.getElementById("btnPrevWeek")?.addEventListener("click",()=>changerSemaine(-1));
  document.getElementById("btnNextWeek")?.addEventListener("click",()=>changerSemaine(1));

  // Vue Mois : mois précédent/suivant
  document.getElementById("btnPrevMonth")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()-1);
    majUI();
  });
  document.getElementById("btnNextMonth")?.addEventListener("click",()=>{
    currentDate.setMonth(currentDate.getMonth()+1);
    majUI();
  });

  // Résultats (upload / delete image)
  document.getElementById("btnUploadImage")?.addEventListener("click",uploadImage);
  document.getElementById("btnDeleteImage")?.addEventListener("click",deleteImage);
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
