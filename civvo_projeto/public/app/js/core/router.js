/* Roteador por hash (#/rota) e navegação. */

function back() {
  history.length > 1 ? history.back() : (location.hash = '#/feed');
}

function go(nav) {
  const y = scrollY;
  const fk = focusKey();
  
  pruneStories();
  
  const [r, a, b] = (location.hash.slice(2) || 'feed').split('/');
  const f = Object.hasOwn(V, r) ? V[r] : V.nf;
  
  if (nav && carregando(r, a)) return;
  
  $('#root').innerHTML = f(a, b);
  
  setTitle(r, a);
  aplicarTema(r);
  a11yHeadings(r, a);
  restoreFocus(fk);
  
  if (typeof observarMais == 'function') {
    observarMais();
  }
  
  if (r != 'chats') {
    window.OPEN = 0;
  }
  
  scrollTo(0, nav ? 0 : y);
  
  const m = $('.cm');
  if (m) {
    m.scrollTop = 1e5;
  }
}

addEventListener('hashchange', () => {

  if (window.__civvoPublico) {
    return;
  }

  closeModal();
  closeViewer();
  go(true);
  announce(document.title);
  focusTop();
});

if (window.__civvoSessao) {
  aplicarSessao(window.__civvoSessao);
}

go();
