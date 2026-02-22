// js/auth.js

/**
 * Initializes the authentication UI and logic.
 */
function initAuthUI() {
    const authContent = document.getElementById('sidebar-auth-content');
    const loginPlaceholder = document.getElementById('sidebar-login-placeholder');
    
    if (!authContent || !loginPlaceholder) return;

    const user = getCurrentUser();

    if (user) {
        authContent.style.display = 'block';
        loginPlaceholder.style.display = 'none';
    } else {
        authContent.style.display = 'none';
        loginPlaceholder.style.display = 'block';
        setupAuthForms();
    }
}

/**
 * Sets up event listeners for the login and registration forms.
 */
function setupAuthForms() {
    const loginContainer = document.getElementById('login-form-container');
    const regContainer = document.getElementById('register-form-container');
    const showRegLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    
    // Toggle forms
    if (showRegLink) {
        showRegLink.addEventListener('click', async (e) => {
            e.preventDefault();
            loginContainer.style.display = 'none';
            regContainer.style.display = 'block';
            
            // Pre-fill user ID from public database
            const regUserIdInput = document.getElementById('reg-userid');
            if (regUserIdInput) {
                regUserIdInput.value = "Loading...";
                
                // Add a timeout fallback and safety check
                if (typeof fetchPublicUserCount === 'function') {
                    const fetchPromise = fetchPublicUserCount();
                    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(0), 3000));
                    
                    const publicCount = await Promise.race([fetchPromise, timeoutPromise]);
                    regUserIdInput.value = `user_${(publicCount || 0) + 1}`;
                } else {
                    console.error("fetchPublicUserCount is not defined.");
                    regUserIdInput.value = "user_error";
                }
            }
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            regContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        });
    }

    // Handle Login
    const loginBtn = document.getElementById('login-submit-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('login-username').value.trim();
            const pin = document.getElementById('login-pin').value.trim();
            
            if (!username || !pin) {
                alert("Please fill in both fields.");
                return;
            }
            
            if (loginUser(username, pin)) {
                location.reload();
            } else {
                alert("Invalid username or PIN.");
            }
        });
    }

    // Handle Registration
    const regBtn = document.getElementById('reg-submit-btn');
    if (regBtn) {
        regBtn.addEventListener('click', async () => {
            const username = document.getElementById('reg-username').value.trim();
            const pin = document.getElementById('reg-pin').value.trim();
            
            if (!username || !pin) {
                alert("Please fill in all fields.");
                return;
            }
            
            if (username.length > 8) {
                alert("Username must be max 8 characters.");
                return;
            }
            
            if (pin.length > 6) {
                alert("PIN must be max 6 characters.");
                return;
            }

            regBtn.disabled = true;
            regBtn.textContent = "Syncing...";

            try {
                // 1. Sync to Public Database (GitHub)
                const newUserId = await commitUserToGit(username);
                
                // 2. Save locally for PIN verification
                registerUserSync(newUserId, username, pin);
                
                alert(`Account created! Welcome, ${username}. Your global ID is ${newUserId}.`);
                location.reload();
            } catch (e) {
                alert(`Sync failed: ${e.message}`);
                regBtn.disabled = false;
                regBtn.textContent = "Create Account";
            }
        });
    }
}

// Automatically initialize when DOM is loaded
// Note: We might need to ensure storage.js is loaded first
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
});
