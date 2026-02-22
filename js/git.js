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
    const filePath = `db/thoughts_${dateStr}.md`;
    
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
    
    // Check if we have a Relay configured or use the local Netlify path
    const relayUrl = config.relay_url || "/.netlify/functions/relay";

    // If we have a local token, we *could* use direct API, 
    // but the Relay is safer for the "Anyone can post" goal.
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
async function commitUserToGit(username) {
    const config = getGitConfig();
    const authorsPath = 'db/authors.md';

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
    updatedLines.push(`  - ${newUserId} | ${username} | New member | To slow down is to live.`);

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
    const userProfile = `- name: ${username}\n- who_am_i: New member\n- meaning_of_slowness: To slow down is to live.\n- thoughts: []`;
    
    await performGitCommit({
        path: userFilePath,
        content: btoa(unescape(encodeURIComponent(userProfile))),
        message: `Created profile for ${newUserId}`,
        owner: config.owner,
        repo: config.repo
    });

    return newUserId;
}
