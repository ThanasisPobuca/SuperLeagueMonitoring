document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Hardcoded credentials
    const credentials = {
        username: 'admin',
        password: 'password123'
    };

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (username === credentials.username && password === credentials.password) {
                localStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.style.display = 'block';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        });
    }
});

/**
 * Placeholder for future backend analytics calls
 * This can be expanded when the backend endpoints are ready.
 */
async function fetchAnalytics() {
    console.log('Fetching live analytics data...');
    // Example: const response = await fetch('/api/analytics');
    // const data = await response.json();
}
