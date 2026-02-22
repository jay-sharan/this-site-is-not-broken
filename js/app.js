// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    const feedContainer = document.getElementById('feed-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const dateDisplay = document.getElementById('current-date-display');
    
    // Sidebar elements
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarWhoAmI = document.getElementById('sidebar-who-am-i');
    const sidebarSlowness = document.getElementById('sidebar-slowness');

    // Thought Capture elements
    const thoughtInput = document.getElementById('new-thought-text');
    const addBtn = document.getElementById('add-thought-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveLaterBtn = document.getElementById('save-later-btn');

    // Mock available dates for testing
    const availableDates = ['2026-02-19', '2026-02-20', '2026-02-21'];
    let currentDateIndex = availableDates.length - 1; // Default to latest

    // Fetch authors map once
    const authorsMap = await fetchAuthors();

    // Populate Sidebar with a mock "current user"
    const currentUserId = getCurrentUser();
    const currentUser = authorsMap[currentUserId] || { name: 'Anonymous', whoAmI: 'Not logged in', meaningOfSlowness: '' };
    if (sidebarName) sidebarName.innerHTML = `<b>${currentUser.name}</b>`;
    if (sidebarWhoAmI) sidebarWhoAmI.innerHTML = `<i>${currentUser.whoAmI}</i>`;
    if (sidebarSlowness) sidebarSlowness.textContent = currentUser.meaningOfSlowness;

    function getFriendlyDate(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffTime = today - targetDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 1) return `${dateStr} (${diffDays} days ago)`;
        return dateStr; // Future dates?
    }

    async function renderFeed(index) {
        const dateStr = availableDates[index];
        const friendlyDate = getFriendlyDate(dateStr);
        dateDisplay.innerHTML = `<b>${friendlyDate}</b>`;
        feedContainer.innerHTML = '<p>Loading thoughts...</p>';
        
        const thoughts = await fetchThoughts(dateStr);
        feedContainer.innerHTML = ''; // Clear loading
        
        if (thoughts.length === 0) {
            feedContainer.innerHTML = `<p class="no-data">No thoughts for ${dateStr} yet...</p>`;
            return;
        }
        
        thoughts.forEach(t => {
            const authorInfo = authorsMap[t.author_id] || { name: 'Anonymous', whoAmI: '' };
            const card = document.createElement('div');
            card.className = 'thought-card';
            card.innerHTML = `
                <p>${t.thought}</p>
                <div class="meta">
                    <b><a href="/author.html?id=${t.author_id}">${authorInfo.name}</a></b>, <i>${authorInfo.whoAmI}</i>
                </div>
                <div class="meta">
                    Posted on ${dateStr} at ${t.time || 'unknown'}
                </div>
                <hr>
            `;
            feedContainer.appendChild(card);
        });

        // Update button states
        if (prevBtn && nextBtn) {
            prevBtn.disabled = index === 0;
            nextBtn.disabled = index === availableDates.length - 1;
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        }
    }

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
                alert("Can not send empty field.");
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
                alert("Can not save empty field.");
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentDateIndex > 0) {
                currentDateIndex--;
                renderFeed(currentDateIndex);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentDateIndex < availableDates.length - 1) {
                currentDateIndex++;
                renderFeed(currentDateIndex);
            }
        });
    }

    // Initial render
    renderFeed(currentDateIndex);
});
