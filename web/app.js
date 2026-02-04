/* ============================================
   TwitterAI - Frontend Application
   ============================================ */

const state = {
  currentDate: null,
  data: null,
  loading: false,
  error: null
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
