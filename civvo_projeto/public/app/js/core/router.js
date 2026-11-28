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

/* {rota, id} da página atual: usado para saber se uma troca de hash é uma página nova de verdade
   (vai pro topo) ou só a troca de uma aba/seção dentro da mesma página (mantém o scroll onde estava,
   ex: Publicações -> Sobre -> Ações sociais no perfil da ONG). */
let ULTIMA_PAGINA = (() => {
  const [r, a] = (location.hash.slice(2) || 'feed').split('/');
  return { r, a };
})();

addEventListener('hashchange', () => {

  if (window.__civvoPublico) {
    return;
  }

  closeModal();
  closeViewer();

  const [r, a] = (location.hash.slice(2) || 'feed').split('/');
  const mesmaPagina = ULTIMA_PAGINA.r == r && ULTIMA_PAGINA.a == a;
  ULTIMA_PAGINA = { r, a };

  go(!mesmaPagina);
  announce(document.title);
  focusTop();
});

if (window.__civvoSessao) {
  aplicarSessao(window.__civvoSessao);
}

/* sessão real: busca os dados no back já na abertura (o feed mostra o esqueleto até chegar) */
if (!DEMO && (ROLE == 'doador' || ROLE == 'ong' || ROLE == 'admin')) {
  carregarFeedReal();
}

go();