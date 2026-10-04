/**
 * Smart Library — UI Utilities
 * Shared UI helpers: toast, modal, navbar, skeleton, etc.
 */

// ─── Toast Notifications ───
const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', title = '', duration = 4000) {
    this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => this.remove(toast));
    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  },

  remove(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  },

  success(message, title = '') { return this.show(message, 'success', title); },
  error(message, title = '') { return this.show(message, 'error', title); },
  warning(message, title = '') { return this.show(message, 'warning', title); },
  info(message, title = '') { return this.show(message, 'info', title); }
};

// ─── Modal Manager ───
const Modal = {
  show(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  hide(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Create a dynamic modal
  create({ title, content, footer, id = 'dynamic-modal' }) {
    // Remove existing
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" aria-label="Close modal">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) Modal.hide(id);
    });

    overlay.querySelector('.modal-close').addEventListener('click', () => Modal.hide(id));

    document.body.appendChild(overlay);
    // Trigger reflow for animation
    requestAnimationFrame(() => overlay.classList.add('active'));
    document.body.style.overflow = 'hidden';

    return overlay;
  }
};

// ─── Button Ripple Effect ───
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn || btn.disabled) return;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ─── Button Loading State ───
function setButtonLoading(btn, loading) {
  if (loading) {
    btn.classList.add('btn-loading');
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = 'Loading...';
  } else {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    if (btn.dataset.originalText) {
      btn.textContent = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  }
}

// ─── Skeleton Loader ───
function showSkeleton(container, count = 3, type = 'card') {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    if (type === 'card') {
      skel.className = 'skeleton skeleton-card';
      skel.style.height = '180px';
    } else if (type === 'text') {
      skel.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
      `;
    }
    container.appendChild(skel);
  }
}

// ─── Empty State ───
function showEmptyState(container, { icon = '📭', title = 'Nothing here yet', message = '', actionText = '', actionHref = '' } = {}) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${title}</h3>
      ${message ? `<p>${message}</p>` : ''}
      ${actionText ? `<a href="${actionHref}" class="btn btn-primary">${actionText}</a>` : ''}
    </div>
  `;
}

// ─── Navbar Renderer ───
function renderNavbar(activePage = '') {
  const user = api.getUser();
  const isLoggedIn = api.isLoggedIn();

  let navLinks = '';
  let bottomTabs = '';

  if (isLoggedIn && user) {
    if (user.role === 'student') {
      navLinks = `
        <a href="/dashboard" class="navbar-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="/seats" class="navbar-link ${activePage === 'seats' ? 'active' : ''}">Seats</a>
        <a href="/catalog" class="navbar-link ${activePage === 'catalog' ? 'active' : ''}">Books</a>
        <a href="/my-bookings" class="navbar-link ${activePage === 'my-bookings' ? 'active' : ''}">My Bookings</a>
        <a href="/my-books" class="navbar-link ${activePage === 'my-books' ? 'active' : ''}">My Books</a>
      `;
      bottomTabs = `
        <a href="/dashboard" class="bottom-tab ${activePage === 'dashboard' ? 'active' : ''}">
          <span class="bottom-tab-icon">🏠</span>Home
        </a>
        <a href="/seats" class="bottom-tab ${activePage === 'seats' ? 'active' : ''}">
          <span class="bottom-tab-icon">💺</span>Seats
        </a>
        <a href="/catalog" class="bottom-tab ${activePage === 'catalog' ? 'active' : ''}">
          <span class="bottom-tab-icon">📚</span>Books
        </a>
        <a href="/notifications" class="bottom-tab ${activePage === 'notifications' ? 'active' : ''}">
          <span class="bottom-tab-icon">🔔</span>Alerts
        </a>
        <a href="/dashboard" class="bottom-tab" id="bottom-profile-tab">
          <span class="bottom-tab-icon">👤</span>Profile
        </a>
      `;
    } else if (user.role === 'staff') {
      navLinks = `
        <a href="/staff" class="navbar-link ${activePage === 'staff' ? 'active' : ''}">Staff Panel</a>
        <a href="/scanner" class="navbar-link ${activePage === 'scanner' ? 'active' : ''}">Scanner</a>
        <a href="/seats" class="navbar-link ${activePage === 'seats' ? 'active' : ''}">Seats</a>
        <a href="/catalog" class="navbar-link ${activePage === 'catalog' ? 'active' : ''}">Catalog</a>
      `;
    } else if (user.role === 'admin') {
      navLinks = `
        <a href="/admin" class="navbar-link ${activePage === 'admin' ? 'active' : ''}">Admin</a>
        <a href="/staff" class="navbar-link ${activePage === 'staff' ? 'active' : ''}">Staff Panel</a>
        <a href="/scanner" class="navbar-link ${activePage === 'scanner' ? 'active' : ''}">Scanner</a>
        <a href="/seats" class="navbar-link ${activePage === 'seats' ? 'active' : ''}">Seats</a>
        <a href="/catalog" class="navbar-link ${activePage === 'catalog' ? 'active' : ''}">Catalog</a>
      `;
    }
  }

  const initial = user ? user.name.charAt(0).toUpperCase() : '?';

  let homeLink = '/';
  if (isLoggedIn && user) {
    if (user.role === 'admin') homeLink = '/admin';
    else if (user.role === 'staff') homeLink = '/staff';
    else homeLink = '/dashboard';
  }

  const navbar = document.createElement('nav');
  navbar.className = 'navbar';
  navbar.setAttribute('role', 'navigation');
  navbar.innerHTML = `
    <div class="navbar-inner">
      <a href="${homeLink}" class="navbar-brand">
        <div class="navbar-brand-icon">📖</div>
        <span>SmartLib</span>
      </a>

      ${isLoggedIn ? `<div class="navbar-links">${navLinks}</div>` : ''}

      <div class="navbar-actions">
        <button class="theme-toggle" aria-label="Toggle theme">🌙</button>
        ${isLoggedIn ? `
          <a href="/notifications" class="bell-btn" aria-label="Notifications">
            🔔
            <span class="bell-badge" id="notif-badge"></span>
          </a>
          <div class="dropdown">
            <button class="avatar" id="avatar-btn" aria-label="User menu">${initial}</button>
            <div class="dropdown-menu" id="avatar-dropdown">
              <div style="padding: var(--space-3) var(--space-4);">
                <div style="font-weight: 600; font-size: var(--text-sm);">${user?.name || ''}</div>
                <div style="font-size: var(--text-xs); color: var(--muted);">${user?.email || ''}</div>
                <div class="badge badge-primary" style="margin-top: var(--space-1); text-transform: capitalize;">${user?.role || ''}</div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" onclick="window.location.href='${homeLink}'">👤 Profile</button>
              <button class="dropdown-item" onclick="api.logout()">🚪 Log Out</button>
            </div>
          </div>
        ` : `
          <a href="/login" class="btn btn-ghost btn-sm">Log In</a>
          <a href="/register" class="btn btn-primary btn-sm">Sign Up</a>
        `}
      </div>
    </div>
  `;

  document.body.prepend(navbar);

  // Bottom bar for mobile (student only)
  if (isLoggedIn && user && user.role === 'student') {
    const bottomBar = document.createElement('nav');
    bottomBar.className = 'bottom-bar';
    bottomBar.setAttribute('role', 'navigation');
    bottomBar.innerHTML = bottomTabs;
    document.body.appendChild(bottomBar);
  }

  // Theme toggle
  navbar.querySelector('.theme-toggle').addEventListener('click', () => ThemeManager.toggle());

  // Avatar dropdown
  const avatarBtn = document.getElementById('avatar-btn');
  const dropdown = document.getElementById('avatar-dropdown');
  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('active');
    });
    document.addEventListener('click', () => dropdown.classList.remove('active'));
  }

  // Fetch unread notification count
  if (isLoggedIn) {
    fetchNotificationCount();
  }
}

async function fetchNotificationCount() {
  try {
    const data = await api.get('/notifications');
    const unread = (data.notifications || []).filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
    }
  } catch {
    // Silently fail — notifications route may not exist yet
  }
}

// ─── Auth Guard ───
function requireAuth() {
  if (!api.isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireRole(...roles) {
  const user = api.getUser();
  if (!user || !roles.includes(user.role)) {
    Toast.error('Access denied. Insufficient permissions.');
    window.location.href = '/dashboard';
    return false;
  }
  return true;
}

// ─── Date/Time Formatting ───
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Inject Scroll Progress Bar ───
(function injectScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.prepend(bar);
})();

// ─── Dynamically Load 3D Motion Engine ───
(function loadMotionEngine() {
  const script = document.createElement('script');
  script.src = '/js/motion.js';
  script.defer = true;
  document.body.appendChild(script);
})();

