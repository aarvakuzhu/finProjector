// ── Theme (light default, persisted) ──────────────────────
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeUI(savedTheme);

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeUI(next);
});

function updateThemeUI(theme) {
  const label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
}

// ── Mobile sidebar ─────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

function openSidebar() { sidebar?.classList.add('open'); overlay?.classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('active'); document.body.style.overflow = ''; }

hamburger?.addEventListener('click', () => sidebar?.classList.contains('open') ? closeSidebar() : openSidebar());
overlay?.addEventListener('click', closeSidebar);
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
});

// ── Chart defaults for light/dark mode ────────────────────
function getChartTheme() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    tickColor: dark ? '#64748b' : '#94a3b8',
    gridColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
    legendColor: dark ? '#94a3b8' : '#475569'
  };
}
window.getChartTheme = getChartTheme;
