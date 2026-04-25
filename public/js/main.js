// Mobile sidebar toggle
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  sidebar?.classList.add('open');
  overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  sidebar?.classList.remove('open');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
  sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay?.addEventListener('click', closeSidebar);

// Close sidebar when a nav link is tapped on mobile
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
  });
});
