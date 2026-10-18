/* Acessibilidade. */

const TITULOS = {
  feed: 'Feed',
  buscar: 'Buscar',
  chats: 'Mensagens',
  avisos: 'Avisos',
  perfil: 'Perfil',
  config: 'Configurações',
  planos: 'Planos',
  painel: 'Painel de gestão',
  admin: 'Administração',
  doar: 'Fazer uma doação',
  recibo: 'Comprovante da doação',
  'editar-perfil': 'Editar perfil',
  termos: 'Termos de Uso',
  privacidade: 'Política de Privacidade',
};

function tituloDe(r, a) {
  if (r == 'ong') {
    const o = ong(a);
    return o ? o.name : 'ONG não encontrada';
  }
  
  if (r == 'post') {
    const p = POSTS.find((x) => x.id == a);
    const o = p && ong(p.ong);
    return o ? 'Publicação de ' + o.name : 'Publicação não encontrada';
  }
  
  return Object.hasOwn(TITULOS, r) ? TITULOS[r] : 'Página não encontrada';
}

const setTitle = (r, a) => {
  document.title = tituloDe(r, a) + ' · Civvo';
};

function announce(t) {
  const e = document.getElementById('anuncio');
  if (e) {
    e.textContent = '';
    setTimeout(() => {
      e.textContent = t;
    }, 60);
  }
}

function focusTop() {
  const h = document.querySelector('#root h1');
  if (h) {
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
}

function skipToMain() {
  const m = document.getElementById('conteudo') || document.querySelector('#root h1');
  if (m) {
    m.setAttribute('tabindex', '-1');
    m.focus();
  }
}

function a11yHeadings(r, a) {
  const root = document.getElementById('root');
  if (!root.querySelector('h1')) {
    const h = document.createElement('h1');
    h.className = 'sr';
    h.textContent = tituloDe(r, a);
    (document.getElementById('conteudo') || root).prepend(h);
  }
  
  root.querySelectorAll('h4').forEach((h) => h.setAttribute('aria-level', '2'));
}

let LASTFOC = null;

const overlays = () => [...document.body.children].filter((e) => ['md', 'pv', 'sv'].includes(e.id));

function rememberFocus() {
  if (!overlays().length) {
    LASTFOC = document.activeElement;
  }
}

function syncOverlays() {
  const r = document.getElementById('root');
  if (r) {
    r.inert = overlays().length > 0;
  }
}

function overlayClosed() {
  syncOverlays();
  if (!overlays().length) {
    if (LASTFOC && document.contains(LASTFOC) && LASTFOC !== document.body) {
      LASTFOC.focus({ preventScroll: true });
    }
    LASTFOC = null;
  }
}

addEventListener('keydown', (e) => {
  if (e.key != 'Tab') return;
  
  const o = overlays().pop();
  if (!o) return;
  
  const f = [
    ...o.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])'
    ),
  ].filter((x) => x.offsetParent !== null || x === document.activeElement);
  
  if (!f.length) return;
  
  const first = f[0];
  const last = f[f.length - 1];
  
  if (!o.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

const focusKey = () => {
  const e = document.activeElement;
  const root = document.getElementById('root');
  
  if (!e || e === document.body || !root || !root.contains(e)) return null;
  
  return {
    id: e.id,
    tag: e.tagName,
    cls: e.className,
    label: e.getAttribute('aria-label') || (e.textContent || '').trim().slice(0, 40),
  };
};

function restoreFocus(k) {
  if (!k) return;
  
  const root = document.getElementById('root');
  let t = k.id ? document.getElementById(k.id) : null;
  
  if (!t) {
    t = [...root.querySelectorAll(k.tag)].find(
      (x) =>
        x.className === k.cls &&
        (x.getAttribute('aria-label') || (x.textContent || '').trim().slice(0, 40)) === k.label
    );
  }
  
  if (t) {
    t.focus({ preventScroll: true });
  }
}