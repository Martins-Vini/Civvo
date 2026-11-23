/* Visualizador de Momentos. */

const STLIKE = new Set();
let STPAUSE = false;
let STSTART = 0;
let STREM = 5000;

function pruneStories() {
  for (let i = STORIES.length - 1; i >= 0; i--) {
    const s = STORIES[i];
    s.imgs = s.imgs.filter((m) => typeof m == 'string' || !m.exp || m.exp > Date.now());
    if (!s.imgs.length) STORIES.splice(i, 1);
  }
}

function openStory(i) {
  SIDX = i;
  IIDX = 0;
  renderStory();
}

function renderStory() {
  clearTimeout(TM);
  const s = STORIES[SIDX];
  if (!s) return closeStory();
  
  const o = ong(s.o);
  let el = $('#sv');
  
  if (!el) {
    rememberFocus();
    el = document.createElement('div');
    el.id = 'sv';
    el.className = 'sv';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Momentos');
    document.body.appendChild(el);
    syncOverlays();
  }

  const m = s.imgs[IIDX];
  const it = typeof m == 'string' ? { caption: m } : m;
  const lk = STLIKE.has(SIDX + '-' + IIDX);
  const bgStyle = it.src ? `#14232c url('${esc(it.src)}') center/cover` : '#39677e';

  const progressHtml = s.imgs
    .map((_, k) => `<i class="${k < IIDX ? 'd' : k == IIDX ? 'a' : ''}"><b></b></i>`)
    .join('');

  el.innerHTML = `
    <div class="sc" style="background:${bgStyle}">
      <div>
        <div class="pg">${progressHtml}</div>
        <div class="ph" style="padding:12px 0">
          ${av(o.name, o.h, 36)}
          <b>${esc(o.name)}</b>
          <button class="sp" style="margin-left:auto" aria-label="Pausar momento" onclick="pauseStory()">${ic('pause')}</button>
          <button style="color:#fff;font-size:22px;margin-left:6px" aria-label="Fechar" onclick="closeStory()">✕</button>
        </div>
      </div>
      <div style="text-align:center;font-size:24px;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.45)">
        ${esc(it.caption || '')}
      </div>
      <div class="rp">
        <input aria-label="Responder" placeholder="Responder…" onkeydown="if(event.key=='Enter'&&this.value.trim())responderMomento(this)">
        <button class="sh ${lk ? 'liked' : ''}" aria-label="Curtir" aria-pressed="${lk}" onclick="likeStory(this)">${ic('heart')}</button>
      </div>
      <div class="tz">
        <div onclick="stepStory(-1)"></div>
        <div onclick="stepStory(1)"></div>
      </div>
    </div>
  `;

  STPAUSE = false;
  STREM = 5000;
  STSTART = Date.now();
  TM = setTimeout(() => stepStory(1), STREM);
}

function pauseStory() {
  const sc = document.querySelector('.sc');
  if (!sc) return;
  
  STPAUSE = !STPAUSE;
  
  if (STPAUSE) {
    clearTimeout(TM);
    STREM -= Date.now() - STSTART;
  } else {
    STSTART = Date.now();
    TM = setTimeout(() => stepStory(1), STREM);
  }
  
  sc.classList.toggle('paused', STPAUSE);
  
  const b = sc.querySelector('.sp');
  b.classList.toggle('on', STPAUSE);
  b.innerHTML = ic(STPAUSE ? 'play' : 'pause');
  b.setAttribute('aria-label', STPAUSE ? 'Retomar momento' : 'Pausar momento');
}

function likeStory(b) {
  if (!DEMO) return emBreve('Curtir momentos estará disponível em breve.');
  const k = SIDX + '-' + IIDX;
  STLIKE.has(k) ? STLIKE.delete(k) : STLIKE.add(k);
  b.classList.toggle('liked');
  b.setAttribute('aria-pressed', STLIKE.has(k));
}

/* responder a um momento vira uma mensagem no chat com quem postou (item 10, igual ao Instagram) */
async function responderMomento(input) {
  const texto = input.value.trim();
  if (!texto) return;

  if (DEMO) {
    toast('Resposta enviada.');
    input.value = '';
    return;
  }
  if (!temRecurso('chat')) return upsell('chat');

  const s = STORIES[SIDX];
  const m = s && s.imgs[IIDX];
  const momentId = m && typeof m == 'object' ? m.id : null;
  if (!momentId) return emBreve('Não foi possível responder a este momento.');

  const o = ong(s.o);
  let userId = ONG_PERFIL[s.o]?.dados?.userId;
  if (!userId) {
    try {
      userId = (await API.perfilOngPublico(s.o)).user_id;
    } catch (e) {
      userId = null;
    }
  }
  if (!userId) return toast('Não foi possível enviar a resposta agora.');

  input.disabled = true;
  try {
    await ChatBackend.garantirConversa({ id: String(userId), nome: o?.name, tipo: 'ONG', avatar: o?.logo });
    await ChatBackend.enviar(userId, { tipo: 'MOMENT_REPLY', momentId, texto });
    toast('Resposta enviada.');
    input.value = '';
  } catch (e) {
    toast(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível enviar a resposta.');
  } finally {
    input.disabled = false;
  }
}

function stepStory(d) {
  IIDX += d;
  if (IIDX < 0) {
    SIDX = Math.max(0, SIDX - 1);
    IIDX = 0;
  } else if (IIDX >= STORIES[SIDX].imgs.length) {
    SIDX++;
    IIDX = 0;
  }
  renderStory();
}

function closeStory() {
  clearTimeout(TM);
  const v = document.getElementById('sv');
  if (v) {
    v.remove();
    overlayClosed();
  }
}

addEventListener('keydown', (e) => {
  if (e.key == ' ' && $('#sv') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    pauseStory();
  }
});