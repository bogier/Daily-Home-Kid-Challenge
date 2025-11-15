/* 🌙 Mode sombre */
if (window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.body.classList.add("dark");
if (localStorage.getItem("darkMode") === "true")
  document.body.classList.add("dark");

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
}

/* Activer le lien courant dans le header */
document.addEventListener('DOMContentLoaded', () => {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('header a[href]').forEach(a => {
    const target = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
    if (target === file) a.classList.add('active');
  });
});
