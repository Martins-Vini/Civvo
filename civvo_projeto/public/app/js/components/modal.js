
function openModal(html, label) {
  closeModal();
  rememberFocus();

  const m = document.createElement('div');
  m.id = 'md';
  m.className = 'md';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-label', label || 'Janela');
  
  m.innerHTML = `
    <div class="mc">
      <button class="mx" aria-label="Fechar" onclick="closeModal()">✕</button>
      ${html}
    </div>
  `;

  m.onclick = (e) => {
    if (e.target == m) closeModal();
  };

  document.body.appendChild(m);
  syncOverlays();
  
  m.querySelector('input, textarea')?.focus();
}

function closeModal() {
  const m = document.getElementById('md');
  if (m) {
    m.remove();
    overlayClosed();
  }
}

function toast(t) {
  const e = document.createElement('div');
  e.className = 'toast';
  e.setAttribute('role', 'status');
  e.textContent = t;

  document.body.appendChild(e);
  setTimeout(() => e.remove(), 3200);
}

addEventListener('keydown', (e) => {
  if (e.key == 'Escape') {
    if (document.getElementById('md')) {
      closeModal();
    } else if (document.getElementById('pv')) {
      closeViewer();
    } else {
      closeStory();
    }
  }
});