// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let currentUser   = null;
let selectedTask  = null;
let selectedComment = null;
let doneTaskIds   = new Set();

// ═══════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════
function render(html) { document.getElementById("app").innerHTML = html; }

function showLogin()    { renderLogin(); }
function showRegister() { renderRegister(); }
function showDashboard() {
    if (!currentUser) return showLogin();
    if (currentUser.role === "encadrant") renderEncadrant();
    else renderStudent();
}

// ═══════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════
function renderLogin() {
    render(`
    <div class="auth-container">
      <div class="auth-box">
        <h1>🎓 École Influenceur</h1>
        <p class="subtitle">Plateforme de suivi des tâches</p>
        <div class="form-group">
          <label>Nom d'utilisateur</label>
          <input type="text" id="inp-username" placeholder="votre.nom" />
        </div>
        <div class="form-group">
          <label>Mot de passe</label>
          <input type="password" id="inp-password" placeholder="••••••" />
        </div>
        <div class="error-msg" id="login-error"></div>
        <button class="btn btn-primary btn-full" onclick="doLogin()" style="margin-bottom:10px">Se connecter</button>
        <button class="btn btn-ghost btn-full" onclick="showRegister()">Créer un compte</button>
      </div>
    </div>`);
    document.getElementById("inp-password")
        .addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
}

async function doLogin() {
    const username = document.getElementById("inp-username").value.trim();
    const password = document.getElementById("inp-password").value.trim();
    const err      = document.getElementById("login-error");
    if (!username || !password) { err.textContent = "Remplissez les deux champs."; return; }
    err.textContent = "Connexion...";
    const user = await login(username, password);
    if (user) { currentUser = user; showDashboard(); }
    else err.textContent = "❌ Nom d'utilisateur ou mot de passe incorrect.";
}

// ═══════════════════════════════════════════════════════════
//  REGISTER PAGE
// ═══════════════════════════════════════════════════════════
function renderRegister() {
    render(`
    <div class="auth-container">
      <div class="auth-box" style="max-width:480px">
        <h1>✨ Créer mon compte</h1>
        <p class="subtitle">École Influenceur</p>
        <div class="form-group">
          <label>Code d'invitation</label>
          <input type="text" id="reg-code" placeholder="Code secret" />
        </div>
        <div class="form-group">
          <label>Nom complet</label>
          <input type="text" id="reg-fullname" placeholder="Ex: Marie Dupont" />
        </div>
        <div class="form-group">
          <label>Nom d'utilisateur (pour se connecter)</label>
          <input type="text" id="reg-username" placeholder="Ex: marie.dupont" />
        </div>
        <div class="form-group">
          <label>Mot de passe (min. 6 caractères)</label>
          <input type="password" id="reg-password" placeholder="••••••" />
        </div>
        <div class="form-group">
          <label>Salle</label>
          <div class="radio-group">
            <label><input type="radio" name="salle" value="S1" checked> Salle S1</label>
            <label><input type="radio" name="salle" value="S2"> Salle S2</label>
          </div>
        </div>
        <div class="form-group">
          <label>Horaire</label>
          <div class="radio-group">
            <label><input type="radio" name="horaire" value="Matin" checked> Matin</label>
            <label><input type="radio" name="horaire" value="Après-midi"> Après-midi</label>
          </div>
        </div>
        <div class="error-msg" id="reg-error"></div>
        <button class="btn btn-success btn-full" onclick="doRegister()" style="margin-bottom:10px">Créer mon compte</button>
        <button class="btn btn-ghost btn-full" onclick="showLogin()">← Retour à la connexion</button>
      </div>
    </div>`);
}

async function doRegister() {
    const code     = document.getElementById("reg-code").value.trim();
    const fullname = document.getElementById("reg-fullname").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const salle    = document.querySelector("input[name=salle]:checked").value;
    const horaire  = document.querySelector("input[name=horaire]:checked").value;
    const err      = document.getElementById("reg-error");

    if (code !== CONFIG.CODE_INVITATION) { err.textContent = "❌ Code d'invitation incorrect."; return; }
    if (!fullname)  { err.textContent = "❌ Entrez votre nom complet."; return; }
    if (!username)  { err.textContent = "❌ Choisissez un nom d'utilisateur."; return; }
    if (password.length < 6) { err.textContent = "❌ Minimum 6 caractères."; return; }

    err.textContent = "⏳ Création du compte...";
    const result = await register(username, password, fullname, salle, horaire);
    if (result) {
        const user = await login(username, password);
        if (user) { currentUser = user; showDashboard(); }
        else showLogin();
    } else {
        err.textContent = "❌ Ce nom d'utilisateur est déjà pris.";
    }
}

// ═══════════════════════════════════════════════════════════
//  ENCADRANT DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderEncadrant() {
    render(`
    <div>
      <div class="header">
        <div>
          <h2>👨‍🏫 ${currentUser.fullName || currentUser.username}</h2>
          <div class="user-info">Encadrant</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Se déconnecter</button>
      </div>
      <div class="page">
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('tab-tasks', this)">📋 Tâches & Soumissions</button>
          <button class="tab-btn" onclick="switchTab('tab-dashboard', this)">📊 Tableau de bord</button>
          <button class="tab-btn" onclick="switchTab('tab-students', this)">👥 Réseaux étudiants</button>
        </div>

        <!-- Onglet 1 : Tâches -->
        <div id="tab-tasks" class="tab-content active">
          <div class="card" style="margin-bottom:16px">
            <div class="card-title" style="margin-bottom:12px">➕ Créer une nouvelle tâche</div>
            <div class="form-group">
              <input type="text" id="new-task-title" placeholder="Ex: Liker + commenter le post Instagram de Marc" />
            </div>
            <div class="form-group">
              <input type="url" id="new-task-desc" placeholder="Lien de la publication (optionnel)" />
            </div>
            <div id="create-status"></div>
            <button class="btn btn-primary" onclick="doCreateTask()">Créer la tâche</button>
          </div>
          <div class="grid-2">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <strong>Tâches créées</strong>
                <button class="btn btn-ghost btn-sm" onclick="loadEncadrantTasks()">Actualiser</button>
              </div>
              <div class="scroll-list" id="enc-tasks-list"><p style="color:#888">Chargement...</p></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <strong>Soumissions reçues</strong>
                <button class="btn btn-ghost btn-sm" onclick="loadEncadrantSubmissions()">Actualiser</button>
              </div>
              <div class="scroll-list" id="enc-submissions-list"><p style="color:#888">Chargement...</p></div>
            </div>
          </div>
        </div>

        <!-- Onglet 2 : Tableau de bord -->
        <div id="tab-dashboard" class="tab-content">
          <div class="stats-box" id="enc-stats">
            <div class="stat-item"><div class="stat-value">—</div><div class="stat-label">Tâches</div></div>
            <div class="stat-item"><div class="stat-value">—</div><div class="stat-label">Soumissions</div></div>
            <div class="stat-item"><div class="stat-value">—</div><div class="stat-label">Étudiants</div></div>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <button class="btn btn-ghost btn-sm" onclick="loadDashboard()">Actualiser</button>
          </div>
          <div id="dashboard-list"><p style="color:#888">Chargement...</p></div>
        </div>

        <!-- Onglet 3 : Réseaux étudiants -->
        <div id="tab-students" class="tab-content">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <button class="btn btn-ghost btn-sm" onclick="loadStudentsList()">Actualiser</button>
          </div>
          <div id="students-list"><p style="color:#888">Chargement...</p></div>
        </div>
      </div>
    </div>`);

    loadEncadrantTasks();
    loadEncadrantSubmissions();
    loadDashboard();
    loadStudentsList();
}

async function doCreateTask() {
    const title = document.getElementById("new-task-title").value.trim();
    const desc  = document.getElementById("new-task-desc").value.trim();
    const el    = document.getElementById("create-status");
    if (!title) { el.innerHTML = '<div class="status status-error">Le titre est obligatoire.</div>'; return; }
    const ok = await createTask(title, desc);
    if (ok) {
        el.innerHTML = '<div class="status status-success">✅ Tâche créée !</div>';
        document.getElementById("new-task-title").value = "";
        document.getElementById("new-task-desc").value  = "";
        loadEncadrantTasks();
        loadDashboard();
    } else {
        el.innerHTML = '<div class="status status-error">❌ Erreur lors de la création.</div>';
    }
}

async function loadEncadrantTasks() {
    const el    = document.getElementById("enc-tasks-list");
    const tasks = await getAllTasks();
    if (!tasks.length) { el.innerHTML = '<p style="color:#888">Aucune tâche.</p>'; return; }

    const prof    = tasks.filter(t => t.autoGenerated !== true);
    const student = tasks.filter(t => t.autoGenerated === true);
    let html = "";

    if (prof.length) {
        html += `<div class="section-label label-prof">📌 TÂCHES DU PROFESSEUR</div>`;
        prof.forEach(t => {
            const link = t.description?.startsWith("http")
                ? `<a href="${t.description}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:6px">🔗 Ouvrir le lien</a>` : "";
            html += `<div class="card card-prof">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div class="card-title">📌 ${t.title}</div>
                <button class="btn btn-danger btn-sm" onclick="doDeleteTask('${t.objectId}')">🗑</button>
              </div>
              ${link}
            </div>`;
        });
    }
    if (student.length) {
        html += `<div class="section-label label-student" style="margin-top:12px">🔁 PUBLICATIONS DES ÉTUDIANTS</div>`;
        student.forEach(t => {
            const link = t.description
                ? `<a href="${t.description}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:6px">🔗 Ouvrir la publication</a>` : "";
            html += `<div class="card card-student">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div class="card-title">🔁 ${t.title}</div>
                <button class="btn btn-danger btn-sm" onclick="doDeleteTask('${t.objectId}')">🗑</button>
              </div>
              ${link}
            </div>`;
        });
    }
    el.innerHTML = html;
}

async function doDeleteTask(taskId) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await deleteTask(taskId);
    loadEncadrantTasks();
    loadDashboard();
}

async function loadEncadrantSubmissions() {
    const el   = document.getElementById("enc-submissions-list");
    const subs = await getAllSubmissions();
    if (!subs.length) { el.innerHTML = '<p style="color:#888">Aucune soumission.</p>'; return; }
    let html = "";
    subs.forEach(s => {
        const name  = s.student?.fullName || s.student?.username || "?";
        const title = s.task?.title || "?";
        const proof = s.proofLink || "";
        const comment = s.commentUsed || "";
        html += `<div class="card">
          <div style="font-weight:600;color:#4ade80">✅ ${name}</div>
          <div class="card-meta" style="margin-top:4px">Tâche : ${title}</div>
          <div class="card-meta">Commentaire : ${comment}</div>
          ${proof ? `<a href="${proof}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:6px">🔗 Voir la preuve</a>` : ""}
        </div>`;
    });
    el.innerHTML = html;
}

async function loadDashboard() {
    const [tasks, students, subs] = await Promise.all([
        getAllTasks(), getAllStudents(), getAllSubmissions()
    ]);
    const total = tasks.length;

    // Stats globales
    document.getElementById("enc-stats").innerHTML = `
      <div class="stat-item"><div class="stat-value">${total}</div><div class="stat-label">Tâches</div></div>
      <div class="stat-item"><div class="stat-value">${subs.length}</div><div class="stat-label">Soumissions</div></div>
      <div class="stat-item"><div class="stat-value">${students.length}</div><div class="stat-label">Étudiants</div></div>`;

    // Index soumissions par étudiant
    const subsByStudent = {};
    subs.forEach(s => {
        const sid = s.student?.objectId;
        if (sid) { subsByStudent[sid] = subsByStudent[sid] || []; subsByStudent[sid].push(s); }
    });
    const tasksById = {};
    tasks.forEach(t => tasksById[t.objectId] = t);

    const sorted = [...students].sort((a, b) =>
        (subsByStudent[a.objectId]?.length || 0) - (subsByStudent[b.objectId]?.length || 0)
    );

    let html = "";
    sorted.forEach(s => {
        const sid      = s.objectId;
        const done     = subsByStudent[sid]?.length || 0;
        const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
        const color    = pct >= 75 ? "#1a6b3a" : pct >= 40 ? "#7a5c00" : "#8b0000";
        const doneSubs = subsByStudent[sid] || [];

        let detailHtml = "";
        if (doneSubs.length) {
            detailHtml = `<div class="detail-box">
              <div style="color:#4a9eff;font-size:12px;font-weight:700;margin-bottom:6px">Tâches validées :</div>`;
            doneSubs.forEach(sub => {
                const tTitle = sub.task?.title || tasksById[sub.task?.objectId]?.title || "?";
                const proof  = sub.proofLink || "";
                detailHtml += `<div class="detail-row">
                  <span style="font-size:13px">✅ ${tTitle}</span>
                  ${proof ? `<a href="${proof}" target="_blank" class="btn btn-ghost btn-sm">🔗</a>` : ""}
                </div>`;
            });
            detailHtml += `</div>`;
        }

        html += `<div class="card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong>${s.fullName || s.username} — ${s.classe || ""}</strong>
            <span style="color:#4a9eff;font-size:13px">${done}/${total} (${pct}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="card-meta">✅ ${done} faites  |  ⏳ ${total - done} restantes</div>
          ${detailHtml}
        </div>`;
    });
    document.getElementById("dashboard-list").innerHTML = html || '<p style="color:#888">Aucun étudiant.</p>';
}

async function loadStudentsList() {
    const students = await getAllStudents();
    const el = document.getElementById("students-list");
    if (!students.length) { el.innerHTML = '<p style="color:#888">Aucun étudiant.</p>'; return; }
    let html = "";
    students.forEach(s => {
        const ig = s.instagram || "—";
        const tt = s.tiktok    || "—";
        const fb = s.facebook  || "—";
        const yt = s.youtube   || "—";
        html += `<div class="card">
          <div class="card-title">${s.fullName || s.username} — ${s.classe || ""}</div>
          <div class="card-meta" style="margin-top:4px">
            Instagram : ${ig} &nbsp;|&nbsp; TikTok : ${tt} &nbsp;|&nbsp; Facebook : ${fb} &nbsp;|&nbsp; YouTube : ${yt}
          </div>
        </div>`;
    });
    el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════
//  STUDENT DASHBOARD
// ═══════════════════════════════════════════════════════════
function renderStudent() {
    const nom    = currentUser.fullName || currentUser.username || "";
    const classe = currentUser.classe   || "";
    render(`
    <div>
      <div class="header">
        <div>
          <h2>👋 ${nom}</h2>
          <div class="user-info">${classe}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="doLogout()">Se déconnecter</button>
      </div>
      <div class="page">
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('st-tab-submit', this)">✅ Soumettre une tâche</button>
          <button class="tab-btn" onclick="switchTab('st-tab-networks', this)">📱 Mes réseaux</button>
          <button class="tab-btn" onclick="switchTab('st-tab-classmates', this)">👥 Camarades</button>
          <button class="tab-btn" onclick="switchTab('st-tab-account', this)">⚙️ Mon compte</button>
        </div>

        <!-- Onglet 1 : Soumettre -->
        <div id="st-tab-submit" class="tab-content active">
          <div class="status status-info" id="st-progress">Chargement...</div>

          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <strong>Tâches à faire — cliquez pour sélectionner</strong>
              <button class="btn btn-ghost btn-sm" onclick="loadStudentTasks()">Actualiser</button>
            </div>
            <div class="scroll-list" id="st-tasks-list"><p style="color:#888">Chargement...</p></div>
          </div>

          <div class="submit-form">
            <div style="margin-bottom:12px">
              <span style="color:#888;font-size:13px">Tâche sélectionnée :</span>
              <span id="st-selected-task" style="color:#f0a500;margin-left:8px">— cliquez sur une tâche ci-dessus —</span>
            </div>

            <div style="margin-bottom:12px">
              <div style="color:#888;font-size:13px;margin-bottom:8px">Commentaire (cliquez pour copier automatiquement) :</div>
              <div class="comment-chips" id="st-comments"><p style="color:#888">Chargement...</p></div>
              <div id="st-selected-comment" style="color:#888;font-size:13px;margin-top:4px">Aucun commentaire sélectionné</div>
            </div>

            <div class="submit-row">
              <input type="url" id="st-proof-link" placeholder="Lien de preuve (https://...)" style="flex:1;min-width:200px" />
              <button class="btn btn-success" onclick="doSubmitTask()">✅ Soumettre ma tâche</button>
            </div>
            <div id="st-submit-status" style="margin-top:8px"></div>
          </div>
        </div>

        <!-- Onglet 2 : Mes réseaux -->
        <div id="st-tab-networks" class="tab-content">
          <div class="card" style="margin-bottom:16px">
            <div class="card-title" style="margin-bottom:4px">Liens de profil</div>
            <div class="status status-warning" style="margin-bottom:16px">
              ⚠️ Chaque nouveau lien ou modification crée automatiquement une tâche pour vos camarades.
            </div>
            ${["instagram","tiktok","facebook","youtube"].map(n => `
              <div class="form-group">
                <label>${n.charAt(0).toUpperCase()+n.slice(1)}</label>
                <input type="url" id="soc-${n}" placeholder="https://${n}.com/monprofil" value="${currentUser[n]||""}" />
              </div>`).join("")}
            <div id="social-status"></div>
            <button class="btn btn-primary" onclick="doSaveSocial()">Sauvegarder mes liens</button>
          </div>

          <div class="card">
            <div class="card-title" style="margin-bottom:12px">📢 Partager une nouvelle publication</div>
            <div class="form-group">
              <label>Réseau</label>
              <div class="radio-group">
                ${["Instagram","TikTok","Facebook","YouTube"].map((n,i) =>
                  `<label><input type="radio" name="pub-net" value="${n}" ${i===0?"checked":""}> ${n}</label>`
                ).join("")}
              </div>
            </div>
            <div class="form-group">
              <label>Lien de la publication</label>
              <input type="url" id="pub-link" placeholder="https://instagram.com/p/xxxxx" />
            </div>
            <div id="pub-status"></div>
            <button class="btn btn-success" onclick="doPublishPost()">📢 Publier la tâche pour mes camarades</button>
          </div>
        </div>

        <!-- Onglet 3 : Camarades -->
        <div id="st-tab-classmates" class="tab-content">
          <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
            <button class="btn btn-ghost btn-sm" onclick="loadClassmates()">Actualiser</button>
          </div>
          <div id="st-classmates-list"><p style="color:#888">Chargement...</p></div>
        </div>

        <!-- Onglet 4 : Mon compte -->
        <div id="st-tab-account" class="tab-content">
          <div class="card" style="max-width:400px">
            <div class="card-title" style="margin-bottom:16px">🔐 Changer mon mot de passe</div>
            <div class="form-group">
              <label>Nouveau mot de passe</label>
              <input type="password" id="new-pw" placeholder="••••••" />
            </div>
            <div class="form-group">
              <label>Confirmer le mot de passe</label>
              <input type="password" id="confirm-pw" placeholder="••••••" />
            </div>
            <div id="pw-status"></div>
            <button class="btn btn-primary" onclick="doChangePw()">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>`);

    loadDoneTaskIds().then(() => {
        loadStudentTasks();
        loadStudentProgress();
    });
    loadStudentComments();
    loadClassmates();
}

async function loadDoneTaskIds() {
    const subs = await getSubmissionsByStudent(currentUser.objectId);
    doneTaskIds = new Set(subs.map(s => s.task?.objectId).filter(Boolean));
}

async function loadStudentProgress() {
    const tasks = await getAllTasks();
    const total = tasks.length;
    const done  = doneTaskIds.size;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    const el    = document.getElementById("st-progress");
    if (el) el.innerHTML = `📊 Ma progression : <strong>${done}/${total}</strong> tâches (${pct}%) &nbsp;|&nbsp; ⏳ ${total - done} restantes`;
}

async function loadStudentTasks() {
    const el    = document.getElementById("st-tasks-list");
    if (!el) return;
    const tasks = await getAllTasks();
    if (!tasks.length) { el.innerHTML = '<p style="color:#888">Aucune tâche.</p>'; return; }

    const prof    = tasks.filter(t => t.autoGenerated !== true);
    const student = tasks.filter(t => t.autoGenerated === true);
    let html = "";

    if (prof.length) {
        html += `<div class="section-label label-prof">📌 TÂCHES DU PROFESSEUR</div>`;
        prof.forEach(t => {
            const done = doneTaskIds.has(t.objectId);
            const cls  = done ? "card-done" : "card-prof";
            const icon = done ? "✅" : "📌";
            const link = t.description?.startsWith("http")
                ? `<a href="${t.description}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:6px">🔗 Ouvrir le lien</a>` : "";
            html += `<div class="card ${cls}" style="cursor:pointer" onclick="selectTask('${t.objectId}','${escHtml(t.title)}')">
              <div class="card-title">${icon} ${t.title}</div>
              ${link}
            </div>`;
        });
    }
    if (student.length) {
        html += `<div class="section-label label-student" style="margin-top:12px">🔁 PUBLICATIONS DES CAMARADES</div>`;
        student.forEach(t => {
            const done = doneTaskIds.has(t.objectId);
            const cls  = done ? "card-done" : "card-student";
            const icon = done ? "✅" : "🔁";
            const link = t.description
                ? `<a href="${t.description}" target="_blank" class="btn btn-ghost btn-sm" style="margin-top:6px">🔗 Ouvrir la publication</a>` : "";
            html += `<div class="card ${cls}" style="cursor:pointer" onclick="selectTask('${t.objectId}','${escHtml(t.title)}')">
              <div class="card-title">${icon} ${t.title}</div>
              ${link}
            </div>`;
        });
    }
    el.innerHTML = html;
}

function selectTask(id, title) {
    selectedTask = { objectId: id, title };
    const el = document.getElementById("st-selected-task");
    if (el) el.textContent = `→ ${title}`;
    if (el) el.style.color = "white";
}

async function loadStudentComments() {
    const el       = document.getElementById("st-comments");
    if (!el) return;
    const comments = await getPresetComments();
    if (!comments.length) { el.innerHTML = '<p style="color:#888">Aucun commentaire disponible.</p>'; return; }
    el.innerHTML = comments.map(c =>
        `<div class="chip" onclick="selectComment(this,'${escHtml(c.text)}')">${c.text}</div>`
    ).join("");
}

function selectComment(el, text) {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
    el.classList.add("selected");
    selectedComment = text;
    navigator.clipboard.writeText(text).catch(() => {});
    const label = document.getElementById("st-selected-comment");
    if (label) { label.textContent = `✅ Copié : ${text.substring(0,60)}${text.length>60?"...":""}`; label.style.color = "#f0a500"; }
}

async function doSubmitTask() {
    const el = document.getElementById("st-submit-status");
    if (!selectedTask)    { el.innerHTML = '<div class="status status-error">❌ Sélectionnez une tâche.</div>'; return; }
    if (!selectedComment) { el.innerHTML = '<div class="status status-error">❌ Choisissez un commentaire.</div>'; return; }
    const proof = document.getElementById("st-proof-link").value.trim();
    if (!proof) { el.innerHTML = '<div class="status status-error">❌ Collez le lien de preuve.</div>'; return; }

    el.innerHTML = '<div class="status status-info">⏳ Envoi en cours...</div>';
    const ok = await submitTask(
        currentUser.objectId, selectedTask.objectId,
        proof, selectedComment, currentUser.sessionToken
    );
    if (ok) {
        el.innerHTML = '<div class="status status-success">✅ Tâche soumise avec succès !</div>';
        document.getElementById("st-proof-link").value = "";
        selectedTask    = null;
        selectedComment = null;
        const st = document.getElementById("st-selected-task");
        if (st) { st.textContent = "— cliquez sur une tâche ci-dessus —"; st.style.color = "#f0a500"; }
        const sc = document.getElementById("st-selected-comment");
        if (sc) { sc.textContent = "Aucun commentaire sélectionné"; sc.style.color = "#888"; }
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
        await loadDoneTaskIds();
        loadStudentTasks();
        loadStudentProgress();
    } else {
        el.innerHTML = '<div class="status status-error">❌ Erreur lors de la soumission. Vérifiez votre connexion.</div>';
    }
}

async function doSaveSocial() {
    const newLinks = {
        instagram: document.getElementById("soc-instagram").value.trim(),
        tiktok:    document.getElementById("soc-tiktok").value.trim(),
        facebook:  document.getElementById("soc-facebook").value.trim(),
        youtube:   document.getElementById("soc-youtube").value.trim(),
    };
    const labels = { instagram:"Instagram", tiktok:"TikTok", facebook:"Facebook", youtube:"YouTube" };
    const el = document.getElementById("social-status");
    el.innerHTML = '<div class="status status-info">⏳ Sauvegarde...</div>';

    const ok = await updateUser(currentUser.objectId, newLinks, currentUser.sessionToken);
    if (ok) {
        let created = 0;
        const name = currentUser.fullName || currentUser.username || "?";
        for (const [key, val] of Object.entries(newLinks)) {
            if (val && val !== (currentUser[key] || "")) {
                if (await createTaskForPublication(name, labels[key], val)) created++;
            }
        }
        Object.assign(currentUser, newLinks);
        el.innerHTML = `<div class="status status-success">✅ Sauvegardé ! ${created > 0 ? created+" tâche(s) créée(s)." : "(aucun changement)"}</div>`;
    } else {
        el.innerHTML = '<div class="status status-error">❌ Erreur lors de la sauvegarde.</div>';
    }
}

async function doPublishPost() {
    const link    = document.getElementById("pub-link").value.trim();
    const network = document.querySelector("input[name=pub-net]:checked")?.value || "Instagram";
    const el      = document.getElementById("pub-status");
    const name    = currentUser.fullName || currentUser.username || "?";
    if (!link) { el.innerHTML = '<div class="status status-error">❌ Collez le lien de la publication.</div>'; return; }
    const ok = await createTaskForPublication(name, network, link);
    if (ok) {
        el.innerHTML = `<div class="status status-success">✅ Tâche publiée pour ${network} !</div>`;
        document.getElementById("pub-link").value = "";
    } else {
        el.innerHTML = '<div class="status status-error">❌ Erreur.</div>';
    }
}

async function loadClassmates() {
    const el       = document.getElementById("st-classmates-list");
    if (!el) return;
    const students = await getAllStudents();
    const myId     = currentUser.objectId;
    const others   = students.filter(s => s.objectId !== myId && (s.instagram||s.tiktok||s.facebook||s.youtube));
    if (!others.length) { el.innerHTML = '<p style="color:#888">Aucun camarade avec des liens.</p>'; return; }
    let html = "";
    others.forEach(s => {
        const btns = [
            s.instagram ? `<a href="${s.instagram}" target="_blank" class="social-btn btn-instagram">Instagram</a>` : "",
            s.tiktok    ? `<a href="${s.tiktok}"    target="_blank" class="social-btn btn-tiktok">TikTok</a>`       : "",
            s.facebook  ? `<a href="${s.facebook}"  target="_blank" class="social-btn btn-facebook">Facebook</a>`  : "",
            s.youtube   ? `<a href="${s.youtube}"   target="_blank" class="social-btn btn-youtube">YouTube</a>`    : "",
        ].filter(Boolean).join(" ");
        html += `<div class="card">
          <div class="card-title">${s.fullName || s.username} — ${s.classe || ""}</div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">${btns}</div>
        </div>`;
    });
    el.innerHTML = html;
}

async function doChangePw() {
    const pw1 = document.getElementById("new-pw").value.trim();
    const pw2 = document.getElementById("confirm-pw").value.trim();
    const el  = document.getElementById("pw-status");
    if (!pw1 || !pw2)  { el.innerHTML = '<div class="status status-error">❌ Remplissez les deux champs.</div>'; return; }
    if (pw1 !== pw2)   { el.innerHTML = '<div class="status status-error">❌ Les mots de passe ne correspondent pas.</div>'; return; }
    if (pw1.length < 6){ el.innerHTML = '<div class="status status-error">❌ Minimum 6 caractères.</div>'; return; }
    const ok = await changePassword(currentUser.objectId, pw1, currentUser.sessionToken);
    if (ok) {
        el.innerHTML = '<div class="status status-success">✅ Mot de passe changé !</div>';
        document.getElementById("new-pw").value = "";
        document.getElementById("confirm-pw").value = "";
    } else {
        el.innerHTML = '<div class="status status-error">❌ Erreur.</div>';
    }
}

// ═══════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════
function switchTab(id, btn) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    btn.classList.add("active");
}

function doLogout() {
    currentUser = null; selectedTask = null;
    selectedComment = null; doneTaskIds = new Set();
    showLogin();
}

function escHtml(str) {
    return (str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", showLogin);
