document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const sidebarNav = document.getElementById('sidebarNav');
    const snapshotBtn = document.getElementById('snapshotBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const historyBody = document.getElementById('historyBody');
    const viewTitle = document.getElementById('viewTitle');
    const compareBtn = document.getElementById('compareBtn');
    const compareCount = document.getElementById('compareCount');

    const API_BASE_URL = 'https://monitoringfucntion-h9f8epaqbfdpafh2.westeurope-01.azurewebsites.net/api';
    let currentType = 'blackboard';
    let selectedSnapshots = [];

    // Auth & Navigation
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
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
                selectedSnapshots = [];
                updateCompareBtn();
                updateView();
            });
        });
    }

    // Modal Controls
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        });
    });

    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    };

    // Initial Load
    if (historyBody) {
        updateView();
    }

    // Event Listeners
    if (snapshotBtn) snapshotBtn.addEventListener('click', triggerSnapshot);
    if (refreshBtn) refreshBtn.addEventListener('click', fetchHistory);
    if (compareBtn) compareBtn.addEventListener('click', handleCompare);

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
            historyBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 2rem;">Error loading history: ${error.message}</td></tr>`;
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
            historyBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-secondary);">No history found.</td></tr>';
            return;
        }

        historyBody.innerHTML = data.map(item => `
            <tr class="clickable-row" data-id="${item.id}" data-date="${item.date}">
                <td onclick="event.stopPropagation()">
                    <input type="checkbox" class="row-checkbox" data-id="${item.id}" data-date="${item.date}">
                </td>
                <td style="font-family: monospace; color: var(--accent-color);">${item.id.substring(0, 8)}...</td>
                <td>${item.date}</td>
                <td>${new Date(item.timestamp).toLocaleString()}</td>
                <td>
                    <span class="badge ${item.cacheStatus === 'HIT' ? 'badge-hit' : 'badge-miss'}">
                        ${item.cacheStatus || 'N/A'}
                    </span>
                </td>
                <td onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="copyId('${item.id}')" title="Copy Full ID">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </td>
            </tr>
        `).join('');

        // Row selection logic
        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                showSnapshotDetails(row.dataset.id, row.dataset.date);
            });
        });

        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const snapshot = { id: cb.dataset.id, date: cb.dataset.date };
                if (cb.checked) {
                    if (selectedSnapshots.length >= 2) {
                        cb.checked = false;
                        showToast('You can only compare 2 snapshots at a time', 'error');
                        return;
                    }
                    selectedSnapshots.push(snapshot);
                } else {
                    selectedSnapshots = selectedSnapshots.filter(s => s.id !== snapshot.id);
                }
                updateCompareBtn();
            });
        });
    }

    function updateCompareBtn() {
        if (!compareBtn) return;
        compareCount.textContent = selectedSnapshots.length;
        compareBtn.style.display = selectedSnapshots.length > 0 ? 'block' : 'none';
        compareBtn.disabled = selectedSnapshots.length !== 2;
        compareBtn.style.opacity = selectedSnapshots.length === 2 ? '1' : '0.5';
    }

    async function showSnapshotDetails(id, date) {
        document.getElementById('detailModal').classList.add('show');
        const headerBoxes = document.getElementById('headerBoxes');
        const jsonBody = document.getElementById('jsonBody');
        
        headerBoxes.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading details...</div>';
        jsonBody.textContent = 'Loading...';

        try {
            const data = await fetchSnapshot(id, date);
            renderSnapshotToElement(data, { headers: headerBoxes, body: jsonBody });
        } catch (error) {
            headerBoxes.innerHTML = `<div style="grid-column: 1/-1; color: #ef4444;">Error: ${error.message}</div>`;
        }
    }

    async function handleCompare() {
        if (selectedSnapshots.length !== 2) return;
        
        const modal = document.getElementById('compareModal');
        modal.classList.add('show');
        
        const leftCol = document.getElementById('compareLeft');
        const rightCol = document.getElementById('compareRight');
        
        leftCol.innerHTML = '<h3>Loading Left...</h3>';
        rightCol.innerHTML = '<h3>Loading Right...</h3>';

        try {
            const [data1, data2] = await Promise.all([
                fetchSnapshot(selectedSnapshots[0].id, selectedSnapshots[0].date),
                fetchSnapshot(selectedSnapshots[1].id, selectedSnapshots[1].date)
            ]);

            renderSnapshotToElement(data1, { container: leftCol, title: 'Snapshot A' });
            renderSnapshotToElement(data2, { container: rightCol, title: 'Snapshot B' });
        } catch (error) {
            leftCol.innerHTML = `<div style="color: #ef4444;">Error: ${error.message}</div>`;
        }
    }

    async function fetchSnapshot(id, date) {
        const key = localStorage.getItem('x-functions-key') || '';
        const endpoint = `${API_BASE_URL}/GetSnapshot?type=${currentType}&id=${id}&date=${date}${key ? `&code=${key}` : ''}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    function renderSnapshotToElement(data, target) {
        // Beautify headers
        const headerHtml = Object.entries(data.headers || {}).map(([key, value]) => `
            <div class="header-box">
                <div class="header-box-label">${key}</div>
                <div class="header-box-value">${Array.isArray(value) ? value[0] : value}</div>
            </div>
        `).join('');

        if (target.headers) {
            target.headers.innerHTML = headerHtml;
            
            let bodyData = data.body;
            // Robustness: if body is a string, try to parse it (handles double-encoded JSON)
            if (typeof bodyData === 'string') {
                try { bodyData = JSON.parse(bodyData); } catch(e) {}
            }
            target.body.innerHTML = syntaxHighlight(JSON.stringify(bodyData, null, 4));
        } else if (target.container) {
            let bodyData = data.body;
            if (typeof bodyData === 'string') {
                try { bodyData = JSON.parse(bodyData); } catch(e) {}
            }
            target.container.innerHTML = `
                <div class="card" style="padding: 1rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--accent-color);">${target.title}</h3>
                    <div class="header-boxes-grid" style="grid-template-columns: 1fr;">
                        ${headerHtml}
                    </div>
                    <div class="json-container" style="max-height: 400px; overflow-y: auto;">
                        <pre style="font-size: 0.75rem;">${syntaxHighlight(JSON.stringify(bodyData, null, 2))}</pre>
                    </div>
                </div>
            `;
        }
    }

    function syntaxHighlight(json) {
        if (!json) return "";
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
            let cls = 'color: #94a3b8;'; // number
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'color: var(--accent-color); font-weight: 600;'; // key
                } else {
                    cls = 'color: #10b981;'; // string
                }
            } else if (/true|false/.test(match)) {
                cls = 'color: #f59e0b;'; // boolean
            } else if (/null/.test(match)) {
                cls = 'color: #ef4444;'; // null
            }
            return '<span style="' + cls + '">' + match + '</span>';
        });
    }

    function showLoading(show) {
        if (!refreshBtn) return;
        if (show) refreshBtn.classList.add('loading');
        else refreshBtn.classList.remove('loading');
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
