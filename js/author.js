// js/author.js

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    const nameEl = document.getElementById('author-name');
    const whoAmIEl = document.getElementById('author-who-am-i');
    const slownessEl = document.getElementById('author-slowness');
    const thoughtsContainer = document.getElementById('author-thoughts-container');
    
    // Sidebar elements
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarWhoAmI = document.getElementById('sidebar-who-am-i');
    const sidebarSlowness = document.getElementById('sidebar-slowness');

    // Thought Capture elements
    const thoughtInput = document.getElementById('new-thought-text');
    const addBtn = document.getElementById('add-thought-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveLaterBtn = document.getElementById('save-later-btn');

    // Fetch authors map for sidebar
    const authorsMap = await fetchAuthors();
    
    // Populate Sidebar with a mock "current user"
    const currentUserId = getCurrentUser();
    const currentUser = authorsMap[currentUserId] || { name: 'Anonymous', whoAmI: 'Not logged in', meaningOfSlowness: '' };
    if (sidebarName) sidebarName.innerHTML = `<b>${currentUser.name}</b>`;
    if (sidebarWhoAmI) sidebarWhoAmI.innerHTML = `<i>${currentUser.whoAmI}</i>`;
    if (sidebarSlowness) sidebarSlowness.textContent = currentUser.meaningOfSlowness;

    // Interactivity for Thought Capture
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const val = thoughtInput.value.trim();
            if (val) {
                const originalText = addBtn.textContent;
                addBtn.disabled = true;
                addBtn.textContent = 'Sending...';

                try {
                    await commitThoughtToGit(val);
                    alert(`Successfully shared: ${val}`);
                    thoughtInput.value = '';
                } catch (err) {
                    alert(`Sync failed: ${err.message}`);
                    console.error(err);
                } finally {
                    addBtn.disabled = false;
                    addBtn.textContent = originalText;
                }
            } else {
                alert("Please write something before sending your thought.");
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            thoughtInput.value = '';
        });
    }

    if (saveLaterBtn) {
        saveLaterBtn.addEventListener('click', () => {
            const val = thoughtInput.value.trim();
            if (val) {
                saveThoughtLocally(val);
                alert(`Saved for later: ${val}`);
                thoughtInput.value = '';
            } else {
                alert("Please write something before saving for later.");
            }
        });
    }

    if (!userId) {
        if (nameEl) nameEl.innerHTML = 'Author Not Found';
        if (thoughtsContainer) thoughtsContainer.innerHTML = '<p class="no-data">No ID provided.</p>';
        return;
    }
    
    // Fetch the author's root file
    const user = await fetchUser(userId);
    
    if (!user) {
        if (nameEl) nameEl.innerHTML = 'Author Not Found';
        if (thoughtsContainer) thoughtsContainer.innerHTML = '<p class="no-data">User profile could not be loaded.</p>';
        return;
    }
    
    const authorDetailsInfo = document.getElementById('author-details-info');
    
    if (userId === getCurrentUser()) {
        if (authorDetailsInfo) authorDetailsInfo.style.display = 'none';
    } else {
        if (nameEl) nameEl.textContent = user.name;
        if (whoAmIEl) whoAmIEl.innerHTML = `<i>"${user.whoAmI}"</i>`;
        if (slownessEl) slownessEl.innerHTML = `Slow down: ${user.meaningOfSlowness}`;
    }
    
    if (thoughtsContainer) {
        thoughtsContainer.innerHTML = '';

        // Added: My Drafts section for the logged-in user
        if (userId === getCurrentUser()) {
            const drafts = getLocalThoughts();
            if (drafts.length > 0) {
                const draftsHeader = document.createElement('h2');
                draftsHeader.textContent = 'My Drafts (Saved for Later)';
                thoughtsContainer.appendChild(draftsHeader);

                drafts.forEach(draft => {
                    const card = document.createElement('div');
                    card.className = 'thought-card';
                    card.style.borderLeft = '4px solid #ccc';
                    card.style.paddingLeft = '15px';
                    card.style.marginBottom = '20px';
                    card.innerHTML = `
                        <p>${draft.thought}</p>
                        <div class="meta">
                            Saved locally on ${new Date(draft.id).toLocaleString()}
                        </div>
                        <hr>
                    `;
                    thoughtsContainer.appendChild(card);
                });

                const historyHeader = document.createElement('h2');
                historyHeader.textContent = 'Thought History';
                thoughtsContainer.appendChild(historyHeader);
            }
        }
        
        if (!user.thoughts || user.thoughts.length === 0) {
            thoughtsContainer.innerHTML = '<p class="no-data">No thoughts recorded yet.</p>';
            return;
        }
        
        // Render the history by asynchronously fetching each day's log
        for (const record of user.thoughts) {
            const card = document.createElement('div');
            card.className = 'thought-card';
            card.innerHTML = `<p class="meta">Loading thought ${record.id} from ${record.date}...</p>`;
            thoughtsContainer.appendChild(card);
            
            // Fetch the global thought file for that date
            const dayThoughts = await fetchThoughts(record.date);
            const specificThought = dayThoughts.find(t => t.id === record.id);
            
            if (specificThought) {
                card.innerHTML = `
                    <p>${specificThought.thought}</p>
                    <div class="meta">
                        Posted on ${record.date} at ${specificThought.time || 'unknown'}
                    </div>
                    <hr>
                `;
            } else {
                card.innerHTML = `
                    <div class="meta">
                        <b>${record.date}</b>
                    </div>
                    <p class="no-data">Thought content not found.</p>
                `;
            }
        }
    }
});
