// js/storage.js
// Note: RELAY_URL_PLACEHOLDER is dynamically injected during deployment.

const STORAGE_KEY = 'thoughtstream_db';

const defaultDB = {
    thoughts: [],
    currentUser: {
        id: 'user_1',
        username: 'Sirius',
        pin: '1234',
        isLoggedIn: true
    },
    preferences: {
        theme: 'no-style',
        github_auth: {
            token: '',
            owner: 'jay-sharan',
            repo: 'this-site-is-not-broken',
            relay_url: 'RELAY_URL_PLACEHOLDER'
        }
    }
};

/**
 * Initializes and retrieves the local database.
 */
function getDB() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        saveDB(defaultDB);
        return defaultDB;
    }
    try {
        const db = JSON.parse(data);
        // Migration/Ensurance
        if (!db.currentUser || typeof db.currentUser === 'string') {
            db.currentUser = defaultDB.currentUser;
        }
        if (!db.thoughts) db.thoughts = defaultDB.thoughts;
        if (!db.preferences) db.preferences = defaultDB.preferences;
        return db;
    } catch (e) {
        console.error("Error parsing storage:", e);
        return defaultDB;
    }
}

/**
 * Persists the database to local storage.
 */
function saveDB(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/**
 * Saves a new thought for later.
 */
function saveThoughtLocally(text) {
    const db = getDB();
    const newThought = {
        thought: text,
        id: Date.now()
    };
    db.thoughts.unshift(newThought); // Newest first
    saveDB(db);
    return newThought;
}

/**
 * Updates a preference.
 */
function updatePreference(key, value) {
    const db = getDB();
    db.preferences[key] = value;
    saveDB(db);
}

/**
 * Retrieves a preference.
 */
function getPreference(key, defaultValue) {
    const db = getDB();
    return db.preferences[key] !== undefined ? db.preferences[key] : defaultValue;
}

/**
 * Retrieves the current user ID if logged in.
 */
function getCurrentUser() {
    const user = getDB().currentUser;
    return (user && user.isLoggedIn) ? user.id : null;
}

/**
 * Logs out the current user.
 */
function logout() {
    const db = getDB();
    if (db.currentUser) {
        db.currentUser.isLoggedIn = false;
        saveDB(db);
    }
    location.reload();
}

/**
 * Retrieves all locally saved thoughts.
 */
function getLocalThoughts() {
    return getDB().thoughts;
}

/**
 * Retrieves the GitHub configuration.
 */
function getGitConfig() {
    return getPreference('github_auth', defaultDB.preferences.github_auth);
}

/**
 * Updates the GitHub configuration.
 */
function updateGitConfig(newConfig) {
    const config = getGitConfig();
    updatePreference('github_auth', { ...config, ...newConfig });
}

/**
 * Saves a registered user locally after they've been synced to GitHub.
 */
function registerUserSync(userId, username, pin) {
    const db = getDB();
    db.currentUser = {
        id: userId,
        username: username,
        pin: pin,
        isLoggedIn: true
    };
    saveDB(db);
}

/**
 * Logins a user by checking simplified credentials.
 */
function loginUser(usernameOrId, pin) {
    const db = getDB();
    const u = db.currentUser;
    if (!u) return false;
    
    const lowerInput = usernameOrId.toLowerCase();
    const matchUsername = u.username && u.username.toLowerCase() === lowerInput;
    const matchId = u.id && u.id.toLowerCase() === lowerInput;
    
    if ((matchUsername || matchId) && u.pin === pin) {
        u.isLoggedIn = true;
        saveDB(db);
        return true;
    }
    return false;
}

