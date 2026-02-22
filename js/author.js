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
    const profileTabs = document.getElementById('profile-tabs');
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentTab = 'thoughts'; // Default

    if (userId === getCurrentUser()) {
        if (profileTabs) profileTabs.style.display = 'block';
        if (authorDetailsInfo) authorDetailsInfo.style.display = 'none';
        currentTab = 'drafts'; // Start with drafts for self
    } else {
        if (nameEl) nameEl.textContent = user.name;
        if (whoAmIEl) whoAmIEl.innerHTML = `<i>"${user.whoAmI}"</i>`;
        if (slownessEl) slownessEl.innerHTML = `Slow down: ${user.meaningOfSlowness}`;
    }

    async function renderProfileContent() {
        if (!thoughtsContainer) return;
        thoughtsContainer.innerHTML = '<p>Loading...</p>';

        if (currentTab === 'drafts') {
            renderDrafts();
        } else if (currentTab === 'saved') {
            await renderHistory(true); // show only others' thoughts I saved
        } else {
            await renderHistory(false); // show only my thoughts
        }
    }

    function renderDrafts() {
        thoughtsContainer.innerHTML = '';
        const drafts = getLocalThoughts();
        if (drafts.length === 0) {
            thoughtsContainer.innerHTML = '<p class="no-data">No drafts saved locally.</p>';
            return;
        }
        drafts.forEach(draft => {
            const card = document.createElement('div');
            card.className = 'thought-card';
            card.style.borderLeft = '4px solid #ccc';
            card.innerHTML = `
                <p>${draft.thought}</p>
                <div class="meta">
                    Saved locally on ${new Date(draft.id).toLocaleString()}
                </div>
                <hr>
            `;
            thoughtsContainer.appendChild(card);
        });
    }

    async function renderHistory(onlySaved) {
        thoughtsContainer.innerHTML = '';
        
        if (!user.thoughts || user.thoughts.length === 0) {
            thoughtsContainer.innerHTML = '<p class="no-data">No history found.</p>';
            return;
        }

        let count = 0;
        for (const record of user.thoughts) {
            const dayThoughts = await fetchThoughts(record.date);
            const specificThought = dayThoughts.find(t => t.id === record.id);
            
            if (specificThought) {
                const isMine = (specificThought.author_id === userId);
                
                // Filtering logic
                if (onlySaved && isMine) continue;
                if (!onlySaved && !isMine && userId === getCurrentUser()) continue;

                count++;
                const loggedInUser = getCurrentUser();
                const showSave = loggedInUser && (loggedInUser !== specificThought.author_id);
                const authorInfo = authorsMap[specificThought.author_id] || { name: user.name, whoAmI: user.whoAmI };

                const card = document.createElement('div');
                card.className = 'thought-card';
                card.innerHTML = `
                    <p>${specificThought.thought}</p>
                    <div class="meta">
                        ${record.date} at ${specificThought.time || 'unknown'}, 
                        ${showSave ? `<a href="#" class="save-thought-link" data-id="${specificThought.id}" data-date="${record.date}">Save</a> · ` : ''}
                    </div>
                    <br>
                    <div class="meta">
                        <a href="/author.html?id=${specificThought.author_id}">${authorInfo.name}</a>, <i>${authorInfo.whoAmI}</i>
                    </div>
                    <hr>
                `;
                thoughtsContainer.appendChild(card);

                const saveLink = card.querySelector('.save-thought-link');
                if (saveLink) {
                    saveLink.addEventListener('click', async (e) => {
                        e.preventDefault();
                        const originalText = e.target.textContent;
                        e.target.textContent = 'Saving...';
                        try {
                            await saveThoughtToProfile(specificThought.id, record.date);
                            e.target.textContent = 'Saved';
                        } catch (err) {
                            alert(err.message);
                            e.target.textContent = originalText;
                        }
                    });
                }
            }
        }

        if (count === 0) {
            thoughtsContainer.innerHTML = `<p class="no-data">Nothing here yet.</p>`;
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.getAttribute('data-tab');
            renderProfileContent();
        });
    });

    renderProfileContent();
});
