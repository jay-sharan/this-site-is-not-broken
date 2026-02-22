// js/git.js

/**
 * Commits a new thought to the GitHub repository.
 * This is "The Site is Not Broken" way - the repo is the database.
 */
/**
 * Commits a new thought to the GitHub repository.
 */
async function commitThoughtToGit(thoughtText) {
    const config = getGitConfig();
    const userId = getCurrentUser();
    
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);
    const filePath = `db/thoughts/thoughts_${dateStr}.md`;
    
    const newEntry = `\n- thought: ${thoughtText}\n- thought_id: t_${Date.now()}\n- author_id: ${userId}\n- time: ${timeStr}\n`;

    // 1. Check for existing file to get SHA
    let existingContent = "";
    let sha = null;
    
    // We always fetch the current file publicly (no token needed for GET on public repo)
    const getUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
    const response = await fetch(getUrl);

    if (response.ok) {
        const data = await response.json();
        existingContent = atob(data.content);
        sha = data.sha;
    }

    const updatedContent = existingContent + newEntry;
    const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

    const payload = {
        path: filePath,
        content: encodedContent,
        message: `New thought from ${userId} at ${timeStr}`,
        sha: sha,
        owner: config.owner,
        repo: config.repo
    };

    return await performGitCommit(payload);
}

/**
 * Executes a commit either via direct API (if token exists) or via Netlify Relay.
 */
async function performGitCommit(payload) {
    const config = getGitConfig();
    
    // Check if we have a Relay configured
    let relayUrl = config.relay_url;
    
    // If it's missing or still the placeholder, we can't sync
    if (!relayUrl || relayUrl === 'RELAY_URL_PLACEHOLDER') {
        throw new Error("Relay URL not configured. Please ensure RELAY_URL secret is set in GitHub Actions.");
    }

    try {
        const response = await fetch(relayUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Failed to commit via Relay.");
        }

        console.log("Persistence successful via Relay.");
        return true;
    } catch (err) {
        console.error("Relay Sync Error:", err);
        
        // Fallback to direct GitHub API if token is present locally
        if (config.token) {
            console.log("Attempting direct GitHub API fallback...");
            const directResponse = await fetch(`https://api.github.com/repos/${payload.owner}/${payload.repo}/contents/${payload.path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: payload.message,
                    content: payload.content,
                    sha: payload.sha
                })
            });
            return directResponse.ok;
        }
        throw err;
    }
}

/**
 * Commits a new user to the global authors.md and creates their profile file.
 */
async function commitUserToGit(username, whoami, slowness) {
    const config = getGitConfig();
    const authorsPath = 'db/authors.md';

    const finalWhoAmI = whoami || "I am a human.";
    const finalSlowness = slowness || "Managing dopamine rush!";

    // 1. Fetch current authors.md publicly
    const getUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${authorsPath}`;
    const response = await fetch(getUrl);

    if (!response.ok) throw new Error("Could not fetch authors list.");
    
    const data = await response.json();
    const content = atob(data.content);
    const sha = data.sha;

    // 1.5 Check for duplicate
    const lowerNewUsername = username.toLowerCase();
    const isDuplicate = content.split('\n').some(line => {
        if (line.trim().startsWith('-')) {
            const parts = line.split('|');
            if (parts.length >= 2 && parts[1].trim().toLowerCase() === lowerNewUsername) return true;
        }
        return false;
    });

    if (isDuplicate) throw new Error(`Username "${username}" is already taken globally.`);

    // 2. Update authors list
    const lines = content.split('\n');
    let newCount = 0;
    const updatedLines = lines.map(line => {
        if (line.trim().startsWith('count:')) {
            newCount = (parseInt(line.split(':')[1].trim(), 10) || 0) + 1;
            return `count: ${newCount}`;
        }
        return line;
    });

    const newUserId = `user_${newCount}`;
    updatedLines.push(`  - ${newUserId} | ${username} | ${finalWhoAmI} | ${finalSlowness}`);

    const encodedAuthors = btoa(unescape(encodeURIComponent(updatedLines.join('\n'))));

    // 3. Commit authors.md via Relay
    await performGitCommit({
        path: authorsPath,
        content: encodedAuthors,
        message: `New user registration: ${username} (${newUserId})`,
        sha: sha,
        owner: config.owner,
        repo: config.repo
    });

    // 4. Create user profile file via Relay
    const userFilePath = `db/${newUserId}.md`;
    const userProfile = `- name: ${username}\n- who_am_i: ${finalWhoAmI}\n- meaning_of_slowness: ${finalSlowness}\n- thoughts: []`;
    
    await performGitCommit({
        path: userFilePath,
        content: btoa(unescape(encodeURIComponent(userProfile))),
        message: `Created profile for ${newUserId}`,
        owner: config.owner,
        repo: config.repo
    });

    return newUserId;
}

/**
 * Saves a thought reference to the current user's profile file.
 */
async function saveThoughtToProfile(thoughtId, dateStr) {
    const config = getGitConfig();
    const userId = getCurrentUser();
    if (!userId) throw new Error("Must be logged in to save thoughts.");

    const userPath = `db/${userId}.md`;

    // 1. Fetch current profile
    const getUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${userPath}`;
    const response = await fetch(getUrl);

    if (!response.ok) throw new Error("Could not fetch user profile.");
    
    const data = await response.json();
    const content = atob(data.content);
    const sha = data.sha;

    // 2. Append thought if not already present
    const thoughtRef = `${thoughtId}, ${dateStr}`;
    if (content.includes(thoughtId)) {
        throw new Error("Thought already saved to your profile.");
    }

    // Very simple append logic - find thoughts: line and append after it
    // or just append to end of file if it's a list.
    let updatedContent = content.trim();
    if (!updatedContent.endsWith('\n')) updatedContent += '\n';
    updatedContent += `- ${thoughtRef}`;

    const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

    // 3. Commit via Relay
    return await performGitCommit({
        path: userPath,
        content: encodedContent,
        message: `Saved thought ${thoughtId} to profile`,
        sha: sha,
        owner: config.owner,
        repo: config.repo
    });
}
