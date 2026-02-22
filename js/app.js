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

    // Dynamic 7-day window based on "today" (2026-02-22 for testing)
    function generateLast7Days() {
        const days = [];
        const base = new Date('2026-02-22');
        for (let i = 6; i >= 0; i--) {
            const d = new Date(base);
            d.setDate(base.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }
    
    const availableDates = generateLast7Days();
    let currentDateIndex = availableDates.length - 1; // Default to latest (Today)

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
            const isLoggedIn = !!getCurrentUser();
            const card = document.createElement('div');
            card.className = 'thought-card';
            card.innerHTML = `
                <p>${t.thought}</p>
                <div class="meta">
                ${dateStr} at ${t.time || 'unknown'}, 
                    ${isLoggedIn ? `<a href="#" class="save-thought-link" data-id="${t.id}" data-date="${dateStr}">Save</a> · ` : ''}
                </div>
                <br>
                <div class="meta">
                    <a href="/author.html?id=${t.author_id}">${authorInfo.name}</a>, <i>${authorInfo.whoAmI}</i>
                </div>
                <hr>
            `;
            
            // Add click listener for Save if it exists
            const saveLink = card.querySelector('.save-thought-link');
            if (saveLink) {
                saveLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const tid = e.target.getAttribute('data-id');
                    const tdate = e.target.getAttribute('data-date');
                    
                    const originalText = e.target.textContent;
                    e.target.textContent = 'Saving...';
                    e.target.style.pointerEvents = 'none';

                    try {
                        await saveThoughtToProfile(tid, tdate);
                        e.target.textContent = 'Saved';
                        alert("Thought saved to your profile!");
                    } catch (err) {
                        alert(`Save failed: ${err.message}`);
                        e.target.textContent = originalText;
                        e.target.style.pointerEvents = 'auto';
                    }
                });
            }

            feedContainer.appendChild(card);
        });

        // Update button states
        if (prevBtn && nextBtn) {
            // prevBtn is never disabled, we show alert instead for UX reasons
            nextBtn.disabled = index === availableDates.length - 1;
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
            } else {
                alert("if you want to view past data, visit github.com and full path.");
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
