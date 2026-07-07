window.addEventListener('unload', () => {});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.replace(window.location.href);
  }
});

// Logout modal
const logoutBtn = document.getElementById('logoutBtn');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutModal.classList.add('active');
  });
}

if (cancelLogout) {
  cancelLogout.addEventListener('click', () => {
    logoutModal.classList.remove('active');
  });
}

// Close modal if clicking outside the box
if (logoutModal) {
  logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
      logoutModal.classList.remove('active');
    }
  });
}