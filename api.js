let parseInitialized = false;

function initParse() {
    if (typeof Parse === "undefined") {
        throw new Error("Parse SDK n'est pas chargé. Vérifie le script Parse dans index.html.");
    }

    if (typeof CONFIG === "undefined") {
        throw new Error("CONFIG n'est pas chargé. Vérifie ton fichier config.js.");
    }

    const APP_ID = String(CONFIG.APP_ID || "").trim();
    const JS_KEY = String(CONFIG.JAVASCRIPT_KEY || "").trim();
    const API_URL = String(CONFIG.API_URL || "https://parseapi.back4app.com")
        .trim()
        .replace(/\/+$/, "");

    if (!APP_ID) {
        throw new Error("CONFIG.APP_ID est vide ou incorrect.");
    }

    if (!JS_KEY) {
        throw new Error("CONFIG.JAVASCRIPT_KEY est vide ou incorrect.");
    }

    if (
        API_URL.includes("/login") ||
        API_URL.includes("/users") ||
        API_URL.includes("/classes")
    ) {
        throw new Error("CONFIG.API_URL doit être seulement : https://parseapi.back4app.com");
    }

    if (!parseInitialized) {
        Parse.initialize(APP_ID, JS_KEY);
        Parse.serverURL = API_URL;
        parseInitialized = true;
    }
}

function getSessionOptions(sessionToken = null) {
    const token = sessionToken || Parse.User.current()?.getSessionToken();
    return token ? { sessionToken: token } : {};
}

function showParseError(action, e) {
    let message = "Erreur inconnue.";

    if (e?.code === 101) {
        message = "Nom d'utilisateur ou mot de passe incorrect.";
    } else if (e?.code === 202) {
        message = "Ce nom d'utilisateur est déjà pris.";
    } else if (
        e?.code === 119 ||
        e?.status === 403 ||
        String(e?.message || "").toLowerCase().includes("forbidden")
    ) {
        message = "Erreur 403 : accès refusé par Back4App. Vérifie APP_ID, JAVASCRIPT_KEY et les permissions de la classe _User.";
    } else if (e?.message) {
        message = e.message;
    }

    window.LAST_API_ERROR = {
        action,
        code: e?.code,
        status: e?.status,
        message: e?.message,
        userMessage: message,
    };

    console.error(`${action} error:`, window.LAST_API_ERROR, e);
    return message;
}

function userToObject(user) {
    return {
        objectId:     user.id,
        username:     user.get("username"),
        fullName:     user.get("fullName") || "",
        classe:       user.get("classe")   || "",
        salle:        user.get("salle")    || "",
        horaire:      user.get("horaire")  || "",
        role:         user.get("role")     || "",
        instagram:    user.get("instagram") || "",
        tiktok:       user.get("tiktok")    || "",
        facebook:     user.get("facebook")  || "",
        youtube:      user.get("youtube")   || "",
        sessionToken: user.getSessionToken(),
    };
}

// ── Auth ────────────────────────────────────────────────────

async function login(username, password) {
    try {
        initParse();

        username = String(username || "").trim();
        password = String(password || "");

        if (!username || !password) {
            throw new Error("Nom d'utilisateur ou mot de passe vide.");
        }

        const user = await Parse.User.logIn(username, password);
        return userToObject(user);

    } catch(e) {
        showParseError("Login", e);
        return null;
    }
}

async function register(username, password, fullName, salle, horaire) {
    try {
        initParse();

        username = String(username || "").trim();
        password = String(password || "");
        fullName = String(fullName || "").trim();
        salle    = String(salle || "").trim();
        horaire  = String(horaire || "").trim();

        if (!username) {
            throw new Error("Nom d'utilisateur obligatoire.");
        }

        if (!password || password.length < 6) {
            throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }

        if (!fullName) {
            throw new Error("Nom complet obligatoire.");
        }

        const user = new Parse.User();

        user.set("username", username);
        user.set("password", password);
        user.set("fullName", fullName);
        user.set("classe", `${salle} — ${horaire}`);
        user.set("salle", salle);
        user.set("horaire", horaire);
        user.set("role", "etudiant");

        await user.signUp();
        return true;

    } catch(e) {
        showParseError("Register", e);
        return null;
    }
}

async function changePassword(objectId, newPassword, sessionToken) {
    try {
        initParse();

        newPassword = String(newPassword || "");

        if (!newPassword || newPassword.length < 6) {
            throw new Error("Le nouveau mot de passe doit contenir au moins 6 caractères.");
        }

        const current = await Parse.User.become(sessionToken);
        current.set("password", newPassword);
        await current.save(null, getSessionOptions(current.getSessionToken()));

        return true;

    } catch(e) {
        showParseError("Change password", e);
        return false;
    }
}

// ── Tâches ──────────────────────────────────────────────────

async function getAllTasks() {
    try {
        initParse();

        const Task  = Parse.Object.extend("Task");
        const query = new Parse.Query(Task);

        query.descending("createdAt");
        query.limit(200);

        const results = await query.find(getSessionOptions());

        const tasks = results.map(t => ({
            objectId:      t.id,
            title:         t.get("title") || "",
            description:   t.get("description") || "",
            autoGenerated: t.get("autoGenerated") === true,
        }));

        const prof    = tasks.filter(t => t.autoGenerated !== true);
        const student = tasks.filter(t => t.autoGenerated === true);

        return [...prof, ...student];

    } catch(e) {
        showParseError("Get all tasks", e);
        return [];
    }
}

async function createTask(title, description) {
    try {
        initParse();

        const Task = Parse.Object.extend("Task");
        const t = new Task();

        t.set("title", String(title || "").trim());
        t.set("description", String(description || "").trim());
        t.set("autoGenerated", false);

        await t.save(null, getSessionOptions());

        return true;

    } catch(e) {
        showParseError("Create task", e);
        return false;
    }
}

async function createTaskForPublication(studentName, networkName, link) {
    try {
        initParse();

        const Task = Parse.Object.extend("Task");
        const t = new Task();

        studentName = String(studentName || "").trim();
        networkName = String(networkName || "").trim();
        link        = String(link || "").trim();

        t.set("title", `Liker/commenter le ${networkName} de ${studentName}`);
        t.set("description", link);
        t.set("autoGenerated", true);
        t.set("studentName", studentName);
        t.set("network", networkName);
        t.set("publicationLink", link);

        await t.save(null, getSessionOptions());

        return true;

    } catch(e) {
        showParseError("Create task publication", e);
        return false;
    }
}

async function deleteTask(taskId) {
    try {
        initParse();

        const Task  = Parse.Object.extend("Task");
        const query = new Parse.Query(Task);

        const t = await query.get(taskId, getSessionOptions());
        await t.destroy(getSessionOptions());

        return true;

    } catch(e) {
        showParseError("Delete task", e);
        return false;
    }
}

// ── Soumissions ──────────────────────────────────────────────

async function getAllSubmissions() {
    try {
        initParse();

        const Sub   = Parse.Object.extend("Submission");
        const query = new Parse.Query(Sub);

        query.include("task");
        query.include("student");
        query.limit(500);

        const results = await query.find(getSessionOptions());

        return results.map(s => ({
            objectId:    s.id,
            proofLink:   s.get("proofLink")   || "",
            commentUsed: s.get("commentUsed") || "",
            student: {
                objectId: s.get("student")?.id || "",
                fullName: s.get("student")?.get("fullName") || "",
                username: s.get("student")?.get("username") || "",
            },
            task: {
                objectId: s.get("task")?.id || "",
                title:    s.get("task")?.get("title") || "",
            },
        }));

    } catch(e) {
        showParseError("Get all submissions", e);
        return [];
    }
}

async function getSubmissionsByStudent(studentId) {
    try {
        initParse();

        const Sub     = Parse.Object.extend("Submission");
        const User    = Parse.Object.extend("_User");
        const userPtr = User.createWithoutData(studentId);

        const query = new Parse.Query(Sub);

        query.equalTo("student", userPtr);
        query.include("task");
        query.limit(200);

        const results = await query.find(getSessionOptions());

        return results.map(s => ({
            objectId: s.id,
            task: {
                objectId: s.get("task")?.id || "",
                title:    s.get("task")?.get("title") || "",
            },
        }));

    } catch(e) {
        showParseError("Get submissions by student", e);
        return [];
    }
}

async function submitTask(studentId, taskId, proofLink, commentUsed, sessionToken) {
    try {
        initParse();

        const current = await Parse.User.become(sessionToken);

        const Sub  = Parse.Object.extend("Submission");
        const User = Parse.Object.extend("_User");
        const Task = Parse.Object.extend("Task");

        const s = new Sub();

        s.set("student", User.createWithoutData(studentId));
        s.set("task", Task.createWithoutData(taskId));
        s.set("status", "terminé");
        s.set("proofLink", String(proofLink || "").trim());
        s.set("commentUsed", String(commentUsed || "").trim());

        await s.save(null, getSessionOptions(current.getSessionToken()));

        return true;

    } catch(e) {
        showParseError("Submit task", e);
        return false;
    }
}

// ── Étudiants ────────────────────────────────────────────────

async function getAllStudents() {
    try {
        initParse();

        const query = new Parse.Query(Parse.User);

        query.equalTo("role", "etudiant");
        query.ascending("fullName");
        query.limit(200);

        const results = await query.find(getSessionOptions());

        return results.map(s => ({
            objectId:  s.id,
            username:  s.get("username")  || "",
            fullName:  s.get("fullName")  || "",
            classe:    s.get("classe")    || "",
            salle:     s.get("salle")     || "",
            horaire:   s.get("horaire")   || "",
            instagram: s.get("instagram") || "",
            tiktok:    s.get("tiktok")    || "",
            facebook:  s.get("facebook")  || "",
            youtube:   s.get("youtube")   || "",
        }));

    } catch(e) {
        showParseError("Get all students", e);
        return [];
    }
}

async function updateUser(objectId, data, sessionToken) {
    try {
        initParse();

        const current = await Parse.User.become(sessionToken);

        Object.entries(data || {}).forEach(([k, v]) => {
            current.set(k, v);
        });

        await current.save(null, getSessionOptions(current.getSessionToken()));

        return true;

    } catch(e) {
        showParseError("Update user", e);
        return false;
    }
}

// ── Commentaires ─────────────────────────────────────────────

async function getPresetComments() {
    try {
        initParse();

        const PC = Parse.Object.extend("PresetComment");
        const query = new Parse.Query(PC);

        query.ascending("createdAt");

        const res = await query.find(getSessionOptions());

        return res.map(c => ({
            text: c.get("text") || "",
        }));

    } catch(e) {
        showParseError("Get preset comments", e);
        return [];
    }
}
