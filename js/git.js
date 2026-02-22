// js/git.js

/**
 * Commits a new thought to the GitHub repository.
 * This is "The Site is Not Broken" way - the repo is the database.
 */
async function commitThoughtToGit(thoughtText) {
    const config = getGitConfig();
    const userId = getCurrentUser();
    
    if (!config.token) {
        throw new Error("GitHub Token not found. Please set it in Settings > System.");
    }

    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
    const filePath = `db/thoughts_${dateStr}.md`;
    
    // 1. Prepare the new entry
    const newEntry = `
- thought: ${thoughtText}
- thought_id: t_${Date.now()}
- author_id: ${userId}
- time: ${timeStr}
`;

    try {
        console.log(`Syncing thought to ${filePath}...`);
        
        // 2. Try to get existing file
        let existingContent = "";
        let sha = null;
        
        const getUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
        const response = await fetch(getUrl, {
            headers: { 'Authorization': `token ${config.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            existingContent = atob(data.content);
            sha = data.sha;
        }

        // 3. Append and Encode
        const updatedContent = existingContent + (existingContent ? "\n" : "") + newEntry;
        const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

        // 4. PUT to GitHub
        const putUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}`;
        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `New thought from ${userId} at ${timeStr}`,
                content: encodedContent,
                sha: sha // Required if updating
            })
        });

        if (!putResponse.ok) {
            const errorData = await putResponse.json();
            throw new Error(errorData.message || "Failed to commit to GitHub.");
        }

        console.log("Thought successfully synced to GitHub.");
        return true;
    } catch (err) {
        console.error("Git Sync Error:", err);
        throw err;
    }
}

/**
 * Commits a new user to the global authors.md and creates their profile file.
 */
async function commitUserToGit(username) {
    const config = getGitConfig();
    if (!config.token) throw new Error("GitHub Token not found.");

    const authorsPath = 'db/authors.md';

    try {
        // 1. Fetch current authors.md
        const getUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${authorsPath}`;
        const response = await fetch(getUrl, {
            headers: { 'Authorization': `token ${config.token}` }
        });

        if (!response.ok) throw new Error("Could not fetch authors list from GitHub.");
        
        const data = await response.json();
        const content = atob(data.content);
        const sha = data.sha;

        // 1.5 Check for duplicate username in global DB
        const lowerNewUsername = username.toLowerCase();
        const isDuplicate = content.split('\n').some(line => {
            if (line.trim().startsWith('-')) {
                const parts = line.split('|');
                if (parts.length >= 2 && parts[1].trim().toLowerCase() === lowerNewUsername) {
                    return true;
                }
            }
            return false;
        });

        if (isDuplicate) {
            throw new Error(`Username "${username}" is already taken globally.`);
        }

        // 2. Parse and Update
        const lines = content.split('\n');
        let newCount = 0;
        const updatedLines = lines.map(line => {
            if (line.trim().startsWith('count:')) {
                const currentCount = parseInt(line.split(':')[1].trim(), 10) || 0;
                newCount = currentCount + 1;
                return `count: ${newCount}`;
            }
            return line;
        });

        const newUserId = `user_${newCount}`;
        const newUserEntry = `  - ${newUserId} | ${username} | New member | To slow down is to live.`;
        updatedLines.push(newUserEntry);

        const updatedContent = updatedLines.join('\n');
        const encodedContent = btoa(unescape(encodeURIComponent(updatedContent)));

        // 3. Commit back to authors.md
        await fetch(getUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `New user registration: ${username} (${newUserId})`,
                content: encodedContent,
                sha: sha
            })
        });

        // 4. Create db/user_X.md
        const userFilePath = `db/${newUserId}.md`;
        const userProfileContent = `- name: ${username}\n- who_am_i: New member\n- meaning_of_slowness: To slow down is to live.\n- thoughts: []`;
        const encodedProfile = btoa(unescape(encodeURIComponent(userProfileContent)));

        await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${userFilePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${config.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Created profile for ${newUserId}`,
                content: encodedProfile
            })
        });

        return newUserId;
    } catch (err) {
        console.error("User Git Sync Error:", err);
        throw err;
    }
}
