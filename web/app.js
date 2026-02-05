/* ============================================
   TwitterAI - Frontend Application
   ============================================ */

const state = {
  currentDate: null,
  data: null,
  loading: false,
  error: null,
  accounts: [],
  accountsSha: null,
  panelOpen: false,
  editingIndex: null,
  deletingIndex: null,
  saving: false
};

// ---- Initialization ----

document.addEventListener('DOMContentLoaded', () => {
  initializeDatePicker();
  setupEventListeners();
  loadLatestData();
});

function initializeDatePicker() {
  const picker = document.getElementById('date-picker');
  const today = new Date().toISOString().split('T')[0];
  picker.value = today;
  picker.max = today;
  state.currentDate = today;
}

function setupEventListeners() {
  document.getElementById('date-picker').addEventListener('change', (e) => {
    state.currentDate = e.target.value;
    loadData(state.currentDate);
  });

  document.getElementById('download-btn').addEventListener('click', downloadExcel);

  // Panel controls
  document.getElementById('manage-btn').addEventListener('click', openPanel);
  document.getElementById('panel-close').addEventListener('click', closePanel);
  document.getElementById('panel-overlay').addEventListener('click', closePanel);

  // Token management
  document.getElementById('token-toggle').addEventListener('click', toggleTokenForm);
  document.getElementById('token-save').addEventListener('click', saveToken);

  // Add account
  document.getElementById('add-toggle').addEventListener('click', toggleAddSection);
  document.getElementById('add-url').addEventListener('input', onAddUrlInput);
  document.getElementById('add-confirm').addEventListener('click', addAccount);
}

// ---- Data Loading ----

async function loadLatestData() {
  const today = new Date().toISOString().split('T')[0];

  const loaded = await loadData(today);
  if (!loaded) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    document.getElementById('date-picker').value = yesterday;
    state.currentDate = yesterday;
    await loadData(yesterday);
  }
}

async function loadData(date) {
  showLoading();
  hideError();
  hideEmpty();

  try {
    // Determine base path: works both locally and on GitHub Pages
    const basePath = getBasePath();
    const response = await fetch(`${basePath}data/${date}.json`);
    if (!response.ok) {
      if (response.status === 404) {
        hideLoading();
        showEmpty();
        return false;
      }
      throw new Error('Failed to load data');
    }

    const data = await response.json();
    state.data = data;
    state.error = null;

    hideLoading();
    renderDashboard(data);
    return true;

  } catch (err) {
    hideLoading();

    if (err.message === 'Failed to load data') {
      showError('数据加载失败，请稍后重试');
    } else {
      showEmpty();
    }
    return false;
  }
}

// ---- Rendering ----

function renderDashboard(data) {
  renderStats(data);
  renderAccounts(data);
}

function renderStats(data) {
  const statsEl = document.getElementById('stats');
  const accounts = data.accounts || [];
  const totalTweets = accounts.reduce((sum, a) => sum + (a.tweets ? a.tweets.length : 0), 0);

  document.getElementById('stat-accounts').textContent = accounts.length;
  document.getElementById('stat-tweets').textContent = totalTweets;

  if (data.scrape_time) {
    const d = new Date(data.scrape_time);
    document.getElementById('stat-time').textContent =
      d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  statsEl.style.display = '';
}

function renderAccounts(data) {
  const grid = document.getElementById('accounts-grid');
  grid.innerHTML = '';

  const accounts = data.accounts || [];
  if (accounts.length === 0) {
    showEmpty();
    return;
  }

  accounts.forEach((account, index) => {
    const card = createAccountCard(account, index);
    grid.appendChild(card);
  });
}

function createAccountCard(account, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${index * 0.06}s`;

  const tweetsHtml = (account.tweets || []).map(tweet => {
    const text = escapeHtml(tweet.text);
    const time = formatDate(tweet.created_at);
    const likes = formatNumber(tweet.likes || 0);
    const retweets = formatNumber(tweet.retweets || 0);
    const url = escapeHtml(tweet.url || '');

    return `
      <li class="tweet">
        <p class="tweet__text">${text}</p>
        <div class="tweet__meta">
          <span class="tweet__stat">
            <svg viewBox="0 0 16 16" fill="none"><path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 0 1 8 4.5 3.5 3.5 0 0 1 13.5 7C13.5 10.5 8 14 8 14z" stroke="currentColor" stroke-width="1.2"/></svg>
            ${likes}
          </span>
          <span class="tweet__stat">
            <svg viewBox="0 0 16 16" fill="none"><path d="M1.5 5.5L5 2l3.5 3.5M5 2v9M14.5 10.5L11 14l-3.5-3.5M11 14V5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${retweets}
          </span>
          <span class="tweet__stat">${time}</span>
          ${url ? `<a href="${url}" target="_blank" rel="noopener" class="tweet__link">查看原文</a>` : ''}
        </div>
      </li>`;
  }).join('');

  const categoryLabel = {
    'ai': 'AI',
    'tech': 'Tech',
    'web3': 'Web3'
  }[account.category] || account.category;

  card.innerHTML = `
    <div class="card__header">
      <div class="card__user">
        <span class="card__name">${escapeHtml(account.display_name)}</span>
        <span class="card__username">@${escapeHtml(account.username)}</span>
      </div>
      <span class="card__badge">${escapeHtml(categoryLabel)}</span>
    </div>
    <div class="card__summary">${escapeHtml(account.ai_summary || 'AI摘要暂时不可用')}</div>
    <ul class="card__tweets">${tweetsHtml}</ul>
  `;

  return card;
}

// ---- Excel Download ----

function downloadExcel() {
  if (!state.currentDate) return;
  const basePath = getBasePath();
  const url = `${basePath}output/${state.currentDate}.xlsx`;
  window.open(url, '_blank');
}

function getBasePath() {
  // When served from /web/ subdirectory, data is at ../data/
  // When served from root, data is at ./data/
  const path = window.location.pathname;
  if (path.includes('/web/') || path.endsWith('/web')) {
    return '../';
  }
  return './';
}

// ---- UI State Helpers ----

function showLoading() {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('accounts-grid').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('accounts-grid').style.display = '';
}

function showError(message) {
  const el = document.getElementById('error');
  document.getElementById('error-message').textContent = message;
  el.style.display = '';
  document.getElementById('accounts-grid').style.display = 'none';
}

function hideError() {
  document.getElementById('error').style.display = 'none';
}

function showEmpty() {
  document.getElementById('empty').style.display = '';
  document.getElementById('accounts-grid').style.display = 'none';
  document.getElementById('stats').style.display = 'none';
}

function hideEmpty() {
  document.getElementById('empty').style.display = 'none';
}

// ---- Utility Functions ----

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '\u4E07';
  }
  return num.toLocaleString('zh-CN');
}

function formatDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

// ============================================
//  Account Management Panel
// ============================================

// ---- Panel Open/Close ----

function openPanel() {
  const overlay = document.getElementById('panel-overlay');
  const panel = document.getElementById('manage-panel');
  overlay.style.display = '';
  requestAnimationFrame(() => {
    overlay.classList.add('panel-overlay--visible');
    panel.classList.add('panel--open');
  });
  state.panelOpen = true;
  updateTokenStatus();
  loadAccountsForPanel();
}

function closePanel() {
  const overlay = document.getElementById('panel-overlay');
  const panel = document.getElementById('manage-panel');
  overlay.classList.remove('panel-overlay--visible');
  panel.classList.remove('panel--open');
  setTimeout(() => { overlay.style.display = 'none'; }, 300);
  state.panelOpen = false;
  state.editingIndex = null;
  state.deletingIndex = null;
  clearAddForm();
}

// ---- GitHub Token ----

function toggleTokenForm() {
  const form = document.getElementById('token-form');
  form.style.display = form.style.display === 'none' ? '' : 'none';
  if (form.style.display !== 'none') {
    const saved = localStorage.getItem('github_token');
    const repo = localStorage.getItem('github_repo');
    if (saved) document.getElementById('github-token').value = saved;

    // Auto-detect repo from GitHub Pages URL
    const autoRepo = detectRepoFromUrl();
    const repoField = document.getElementById('repo-field');
    const repoDetected = document.getElementById('repo-detected');

    if (autoRepo) {
      // On GitHub Pages: hide manual input, show detected repo
      repoField.style.display = 'none';
      repoDetected.textContent = `仓库: ${autoRepo}（自动检测）`;
      repoDetected.style.display = '';
    } else {
      // Local dev: show manual input
      repoField.style.display = '';
      repoDetected.style.display = 'none';
      if (repo) document.getElementById('github-repo').value = repo;
    }
  }
}

function detectRepoFromUrl() {
  const host = window.location.hostname;
  const path = window.location.pathname;
  if (host.endsWith('.github.io')) {
    const owner = host.replace('.github.io', '');
    const repoName = path.split('/').filter(Boolean)[0] || '';
    if (repoName) return `${owner}/${repoName}`;
  }
  return null;
}

function saveToken() {
  const token = document.getElementById('github-token').value.trim();
  const autoRepo = detectRepoFromUrl();
  const manualRepo = document.getElementById('github-repo').value.trim();
  const repo = autoRepo || manualRepo;

  if (!token) {
    showAddError('请输入 GitHub Token');
    return;
  }
  if (!repo) {
    showAddError('请输入仓库地址 (如: yourusername/TwitterAI)');
    return;
  }
  localStorage.setItem('github_token', token);
  localStorage.setItem('github_repo', repo);
  hideAddError();
  updateTokenStatus();
  document.getElementById('token-form').style.display = 'none';
  loadAccountsForPanel();
}

function updateTokenStatus() {
  const el = document.getElementById('token-status');
  const token = localStorage.getItem('github_token');
  const repo = localStorage.getItem('github_repo');
  if (token && repo) {
    el.textContent = '已连接';
    el.className = 'token-status token-status--connected';
  } else if (token && !repo) {
    el.textContent = '缺少仓库';
    el.className = 'token-status token-status--disconnected';
  } else {
    el.textContent = '未连接';
    el.className = 'token-status token-status--disconnected';
  }
}

function getGitHubConfig() {
  const token = localStorage.getItem('github_token');
  const repo = localStorage.getItem('github_repo') || detectRepoFromUrl();
  return { token, repo };
}

// ---- Load Accounts from GitHub ----

async function loadAccountsForPanel() {
  const { token, repo } = getGitHubConfig();
  if (!token || !repo) {
    // Fallback: try loading from local accounts.json
    try {
      const basePath = getBasePath();
      const res = await fetch(`${basePath}accounts.json`);
      if (res.ok) {
        state.accounts = await res.json();
        state.accountsSha = null;
        renderAccountList();
      }
    } catch { /* ignore */ }
    return;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/accounts.json`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    state.accountsSha = data.sha;
    state.accounts = JSON.parse(atob(data.content));
    renderAccountList();
  } catch (err) {
    console.error('Failed to load accounts from GitHub:', err);
    // Fallback to local
    try {
      const basePath = getBasePath();
      const res = await fetch(`${basePath}accounts.json`);
      if (res.ok) {
        state.accounts = await res.json();
        state.accountsSha = null;
        renderAccountList();
      }
    } catch { /* ignore */ }
  }
}

// ---- Save Accounts to GitHub ----

async function saveAccountsToGitHub() {
  const { token, repo } = getGitHubConfig();
  if (!token) {
    showAddError('请先在「GitHub 连接」中配置 Token');
    return false;
  }
  if (!repo) {
    showAddError('请先在「GitHub 连接」中配置仓库地址 (owner/repo)');
    return false;
  }

  state.saving = true;
  document.getElementById('panel-saving').style.display = 'flex';

  try {
    // Re-fetch SHA to avoid conflicts
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/accounts.json`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let sha = state.accountsSha;
    if (getRes.ok) {
      const current = await getRes.json();
      sha = current.sha;
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(state.accounts, null, 2) + '\n')));
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/accounts.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'feat: update accounts via dashboard',
        content: content,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(errData.message || `GitHub API error: ${putRes.status}`);
    }

    const result = await putRes.json();
    state.accountsSha = result.content.sha;
    return true;

  } catch (err) {
    console.error('Failed to save accounts:', err);
    showAddError(`保存失败: ${err.message}`);
    return false;
  } finally {
    state.saving = false;
    document.getElementById('panel-saving').style.display = 'none';
  }
}

// ---- URL Parsing ----

const TWITTER_URL_REGEX = /https?:\/\/(twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})\/?(\?.*)?$/;

function parseTwitterUrl(input) {
  const trimmed = input.trim();
  const match = trimmed.match(TWITTER_URL_REGEX);
  if (match) return match[2];
  // Also accept bare username like @elonmusk or elonmusk
  const bare = trimmed.replace(/^@/, '');
  if (/^[A-Za-z0-9_]{1,15}$/.test(bare)) return bare;
  return null;
}

function onAddUrlInput() {
  const input = document.getElementById('add-url').value;
  const username = parseTwitterUrl(input);
  const preview = document.getElementById('add-preview');
  hideAddError();

  if (username) {
    document.getElementById('add-username').value = '@' + username;
    document.getElementById('add-display-name').value = '';
    document.getElementById('add-category').value = 'ai';
    preview.style.display = '';
    document.getElementById('add-display-name').focus();
  } else {
    preview.style.display = 'none';
  }
}

function toggleAddSection() {
  const section = document.getElementById('add-section');
  if (section.style.display === 'none') {
    section.style.display = '';
    document.getElementById('add-url').focus();
  } else {
    section.style.display = 'none';
    clearAddForm();
  }
}

function clearAddForm() {
  document.getElementById('add-url').value = '';
  document.getElementById('add-preview').style.display = 'none';
  document.getElementById('add-section').style.display = 'none';
  hideAddError();
}

function showAddError(msg) {
  const el = document.getElementById('add-error');
  el.textContent = msg;
  el.style.display = '';
}

function hideAddError() {
  document.getElementById('add-error').style.display = 'none';
}

// ---- Add Account ----

async function addAccount() {
  if (state.saving) return;
  hideAddError();

  const username = document.getElementById('add-username').value.replace('@', '').trim();
  const displayName = document.getElementById('add-display-name').value.trim() || username;
  const category = document.getElementById('add-category').value;

  if (!username) {
    showAddError('用户名不能为空');
    return;
  }

  if (state.accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    showAddError('该账号已在监控列表中');
    return;
  }

  state.accounts.push({ username, display_name: displayName, category });

  const saved = await saveAccountsToGitHub();
  if (saved) {
    clearAddForm();
    renderAccountList();
  } else {
    // Rollback
    state.accounts.pop();
  }
}

// ---- Render Account List ----

function renderAccountList() {
  const list = document.getElementById('account-list');
  const empty = document.getElementById('account-list-empty');
  const count = document.getElementById('account-count');

  count.textContent = state.accounts.length;
  list.innerHTML = '';

  if (state.accounts.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  state.accounts.forEach((account, index) => {
    const li = document.createElement('li');

    if (state.editingIndex === index) {
      li.className = 'account-item account-item--editing';
      li.innerHTML = `
        <div class="account-item__info">
          <div class="account-item__name">@${escapeHtml(account.username)}</div>
        </div>
        <div class="account-edit-fields">
          <div class="panel-field">
            <label class="panel-label">显示名称</label>
            <input type="text" class="panel-input edit-display-name" value="${escapeHtml(account.display_name)}">
          </div>
          <div class="panel-field">
            <label class="panel-label">分类</label>
            <select class="panel-input edit-category">
              <option value="ai" ${account.category === 'ai' ? 'selected' : ''}>AI</option>
              <option value="tech" ${account.category === 'tech' ? 'selected' : ''}>Tech</option>
              <option value="web3" ${account.category === 'web3' ? 'selected' : ''}>Web3</option>
            </select>
          </div>
          <div class="account-edit-actions">
            <button class="btn btn--small btn--ghost edit-cancel">取消</button>
            <button class="btn btn--small btn--primary edit-save">保存</button>
          </div>
        </div>
      `;
      li.querySelector('.edit-cancel').addEventListener('click', () => {
        state.editingIndex = null;
        renderAccountList();
      });
      li.querySelector('.edit-save').addEventListener('click', () => saveEdit(index, li));

    } else if (state.deletingIndex === index) {
      li.className = 'account-item account-item--editing';
      li.innerHTML = `
        <div class="account-item__info">
          <div class="account-item__name">${escapeHtml(account.display_name)}</div>
          <div class="account-item__username">@${escapeHtml(account.username)}</div>
        </div>
        <div class="delete-confirm">
          <span class="delete-confirm__text">确认删除?</span>
          <button class="btn btn--small btn--ghost delete-no">取消</button>
          <button class="btn btn--small btn--danger delete-yes">删除</button>
        </div>
      `;
      li.querySelector('.delete-no').addEventListener('click', () => {
        state.deletingIndex = null;
        renderAccountList();
      });
      li.querySelector('.delete-yes').addEventListener('click', () => confirmDelete(index));

    } else {
      li.className = 'account-item';
      const categoryLabels = { ai: 'AI', tech: 'Tech', web3: 'Web3' };
      li.innerHTML = `
        <div class="account-item__info">
          <div class="account-item__name">${escapeHtml(account.display_name)}</div>
          <div class="account-item__username">@${escapeHtml(account.username)}</div>
        </div>
        <span class="account-item__badge">${escapeHtml(categoryLabels[account.category] || account.category)}</span>
        <div class="account-item__actions">
          <button class="account-item__btn edit-btn" title="编辑" aria-label="编辑">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
          </button>
          <button class="account-item__btn account-item__btn--delete delete-btn" title="删除" aria-label="删除">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `;
      li.querySelector('.edit-btn').addEventListener('click', () => {
        state.editingIndex = index;
        state.deletingIndex = null;
        renderAccountList();
      });
      li.querySelector('.delete-btn').addEventListener('click', () => {
        state.deletingIndex = index;
        state.editingIndex = null;
        renderAccountList();
      });
    }

    list.appendChild(li);
  });
}

// ---- Edit Account ----

async function saveEdit(index, li) {
  if (state.saving) return;
  const newName = li.querySelector('.edit-display-name').value.trim();
  const newCategory = li.querySelector('.edit-category').value;

  if (!newName) return;

  const oldAccount = { ...state.accounts[index] };
  state.accounts[index].display_name = newName;
  state.accounts[index].category = newCategory;

  const saved = await saveAccountsToGitHub();
  if (saved) {
    state.editingIndex = null;
    renderAccountList();
  } else {
    // Rollback
    state.accounts[index] = oldAccount;
  }
}

// ---- Delete Account ----

async function confirmDelete(index) {
  if (state.saving) return;

  const removed = state.accounts.splice(index, 1)[0];

  const saved = await saveAccountsToGitHub();
  if (saved) {
    state.deletingIndex = null;
    renderAccountList();
  } else {
    // Rollback
    state.accounts.splice(index, 0, removed);
    state.deletingIndex = null;
    renderAccountList();
  }
}
