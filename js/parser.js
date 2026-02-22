// js/parser.js

// Fetch and parse db/authors.md
async function fetchAuthors() {
    try {
        const response = await fetch('db/authors.md');
        if (!response.ok) return {};
        const text = await response.text();
        
        const authors = {};
        let inUsers = false;

        text.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('users:')) {
                inUsers = true;
                return;
            }
            if (inUsers && trimmed.startsWith('-')) {
                const content = trimmed.substring(1).trim();
                const parts = content.split('|');
                if (parts.length >= 2) {
                    authors[parts[0].trim()] = {
                        name: parts[1].trim(),
                        whoAmI: parts.length >= 3 ? parts[2].trim() : '',
                        meaningOfSlowness: parts.length >= 4 ? parts[3].trim() : ''
                    };
                }
            }
        });
        return authors;
    } catch(e) {
        console.error("Error fetching authors:", e);
        return {};
    }
}

// Fetch and parse db/thoughts_<date>.md
async function fetchThoughts(dateStr) {
    try {
        const response = await fetch(`db/thoughts_${dateStr}.md`);
        if (!response.ok) return [];
        const text = await response.text();
        
        const thoughts = [];
        let currentThought = null;
        
        text.split('\n').forEach(line => {
             const trimmedLine = line.trim();
             if (trimmedLine.startsWith('- thought:')) {
                 if (currentThought) thoughts.push(currentThought);
                 currentThought = { thought: trimmedLine.substring(10).trim() };
             } else if (trimmedLine.startsWith('- thought_id:') && currentThought) {
                 currentThought.id = trimmedLine.substring(13).trim();
             } else if (trimmedLine.startsWith('- author_id:') && currentThought) {
                 currentThought.author_id = trimmedLine.substring(12).trim();
             } else if (trimmedLine.startsWith('- time:') && currentThought) {
                 currentThought.time = trimmedLine.substring(7).trim();
             }
        });
        
        if (currentThought) {
            thoughts.push(currentThought);
        }
        
        return thoughts;
    } catch(e) {
         console.error("Error fetching thoughts:", e);
         return [];
    }
}

// Fetch and parse db/user_<id>.md
async function fetchUser(userId) {
    try {
        const response = await fetch(`db/${userId}.md`);
        if (!response.ok) return null;
        const text = await response.text();
        
        const lines = text.split('\n');
        const user = { id: userId, name: '', whoAmI: '', meaningOfSlowness: '', thoughts: [] };
        
        let inThoughts = false;
        
        for (const line of lines) {
             const trimmedLine = line.trim();
             if (trimmedLine.startsWith('- name:')) {
                 user.name = trimmedLine.substring(7).trim();
             } else if (trimmedLine.startsWith('- who_am_i:')) {
                 user.whoAmI = trimmedLine.substring(11).trim();
             } else if (trimmedLine.startsWith('- meaning_of_slowness:')) {
                 user.meaningOfSlowness = trimmedLine.substring(22).trim();
             } else if (trimmedLine.startsWith('- thoughts:')) {
                 inThoughts = true;
             } else if (inThoughts && trimmedLine.startsWith('-')) {
                 const content = trimmedLine.substring(1).trim();
                 if (!content) continue;
                const parts = content.split(',');
                if (parts.length === 2) {
                      user.thoughts.push({
                           id: parts[0].trim(),
                           date: parts[1].trim()
                      });
                 }
             }
        }
        
        return user;
    } catch(e) {
        console.error("Error fetching user:", e);
        return null;
    }
}

/**
 * Extracts the user count from authors.md.
 */
async function fetchPublicUserCount() {
    try {
        const response = await fetch('db/authors.md');
        if (!response.ok) return 0;
        const text = await response.text();
        const line = text.split('\n').find(l => l.trim().startsWith('count:'));
        if (line && line.includes(':')) {
            const countPart = line.split(':')[1];
            return countPart ? parseInt(countPart.trim(), 10) || 0 : 0;
        }
        return 0;
    } catch(e) {
        console.error("fetchPublicUserCount Error:", e);
        return 0;
    }
}
