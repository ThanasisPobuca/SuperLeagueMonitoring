document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarNav = document.getElementById('sidebarNav');
    const snapshotBtn = document.getElementById('snapshotBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const historyBody = document.getElementById('historyBody');
    const viewTitle = document.getElementById('viewTitle');

    const API_BASE_URL = 'https://monitoringfucntion-h9f8epaqbfdpafh2.westeurope-01.azurewebsites.net/api';
    let currentType = 'blackboard';

    // Auth & Navigation
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            // "Pseudo-login": anyone can enter, but the password is saved as the API key
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('x-functions-key', password);
            window.location.href = 'dashboard.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('x-functions-key');
            window.location.href = 'index.html';
        });
    }

    // Sidebar Navigation
    if (sidebarNav) {
        sidebarNav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                sidebarNav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentType = item.dataset.type;
                updateView();
            });
        });
    }

    // Initial Load
    if (historyBody) {
        updateView();
    }

    // Event Listeners
    if (snapshotBtn) {
        snapshotBtn.addEventListener('click', triggerSnapshot);
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchHistory);
    }

    async function updateView() {
        if (!viewTitle) return;
        const titles = {
            'blackboard': 'Live Blackboard',
            'standings': 'Current Standings'
        };
        viewTitle.textContent = titles[currentType];
        fetchHistory();
    }

    async function fetchHistory() {
        if (!historyBody) return;
        showLoading(true);
        try {
            const key = localStorage.getItem('x-functions-key') || '';
            const endpoint = `${API_BASE_URL}/GetHistory?type=${currentType}${key ? `&code=${key}` : ''}`;
            
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            renderHistory(data);
        } catch (error) {
            console.error('Fetch error:', error);
            historyBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 2rem;">Error loading history: ${error.message}<br><small style="color: var(--text-secondary);">Tip: Ensure your API Key (provided as password) is correct.</small></td></tr>`;
            showToast('Failed to load history', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function triggerSnapshot() {
        if (!snapshotBtn) return;
        const btnText = snapshotBtn.querySelector('.btn-text');
        const loader = document.getElementById('snapshotLoader');
        
        if (btnText) btnText.style.opacity = '0.5';
        if (loader) loader.style.display = 'inline-block';
        snapshotBtn.disabled = true;

        try {
            const key = localStorage.getItem('x-functions-key') || '';
            const endpointName = currentType === 'blackboard' ? 'SuperLeagueBlackboard' : 'SuperLeagueStandings';
            const endpoint = `${API_BASE_URL}/${endpointName}${key ? `?code=${key}` : ''}`;

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`Trigger failed! status: ${response.status}`);
            
            showToast(`${currentType.charAt(0).toUpperCase() + currentType.slice(1)} snapshot triggered!`);
            fetchHistory();
        } catch (error) {
            console.error('Trigger error:', error);
            showToast(`Snapshot failed: ${error.message}`, 'error');
        } finally {
            if (btnText) btnText.style.opacity = '1';
            if (loader) loader.style.display = 'none';
            snapshotBtn.disabled = false;
        }
    }

    function renderHistory(data) {
        if (!historyBody) return;
        if (!data || data.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-secondary);">No history found.</td></tr>';
            return;
        }

        historyBody.innerHTML = data.map(item => `
            <tr>
                <td style="font-family: monospace; color: var(--accent-color);">${item.id.substring(0, 8)}...</td>
                <td>${item.date}</td>
                <td>${new Date(item.timestamp).toLocaleString()}</td>
                <td>
                    <span class="badge ${item.cacheStatus === 'HIT' ? 'badge-hit' : 'badge-miss'}">
                        ${item.cacheStatus || 'N/A'}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="copyId('${item.id}')" title="Copy Full ID">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function showLoading(show) {
        if (!refreshBtn) return;
        if (show) {
            refreshBtn.classList.add('loading');
        } else {
            refreshBtn.classList.remove('loading');
        }
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.style.borderColor = type === 'error' ? '#ef4444' : 'var(--glass-border)';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
});

function copyId(id) {
    navigator.clipboard.writeText(id).then(() => {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = 'ID copied to clipboard';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    });
}
