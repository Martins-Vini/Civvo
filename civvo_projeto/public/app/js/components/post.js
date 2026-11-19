/* Cartão de postagem. */

const tipoIcone = (p) => {
  if (p.boosted) return 'zap';
  if (p.camp && (p.camp.status == 'ENCERRADA' || p.camp.status == 'ALCANÇADA')) return 'circle-check';
  return { CAMPANHA: 'heart', VOLUNTARIO: 'users', VOLUNTARIADO: 'users' }[p.kind] || 'file-text';
};

const seguirHtml = (id, f) =>
  `<button class="fo" type="button" data-fo="${id}" aria-pressed="${f}" onclick="seguirOngClick(${id}, this)">${f ? `${lc('check', 13)} Seguindo` : `${lc('plus', 13)} Seguir`}</button>`;

/* "Ver mais / Ver menos" em textos longos */
function alternarTexto(btn) {
  const t = btn.previousElementSibling;
  if (!t) return;
  const recolhido = t.classList.toggle('clamp');
  btn.textContent = recolhido ? 'Ver mais' : 'Ver menos';
}

const postH = (p) => {
  const o = ong(p.ong);
  if (!o) return '';

  const c = p.camp;
  const pct = c && c.meta ? Math.min(100, Math.round((c.atual / c.meta) * 100)) : 0;
  const isOwnPost = ROLE == 'ong' && p.ong == ME_ONG;

  const seguirBtn = isOwnPost || ROLE == 'admin' ? '' : seguirHtml(o.id, FOLLOW.has(o.id));

  const acaoBtn = isOwnPost
    ? `<button class="ph-btn" type="button" title="Gerenciar publicação" aria-label="Gerenciar publicação" onclick="managePost(${p.id})">${lc('ellipsis', 20)}</button>`
    : `<button class="ph-btn" type="button" title="Denunciar publicação" aria-label="Denunciar publicação" onclick="openReport('POST', ${p.id})">${lc('flag', 18)}</button>`;

  const campaignProgress = c
    ? `<div class="prog">
         <div class="prog-top"><b>${money(c.atual)}</b><span>arrecadados de ${money(c.meta)}</span><span class="pct">${pct}%</span></div>
         <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><b style="width:${pct}%"></b></div>
         ${c.limite ? `<div class="prog-bot">${lc('calendar', 14)}<span>até ${esc(c.limite)}</span></div>` : ''}
       </div>`
    : '';

  const texto = p.text || '';
  const longo = texto.length > 260;

  return `
    <article class="card post v2" data-p="${p.id}">
      <header class="ph">
        <a href="#/ong/${o.id}" class="ph-av" aria-label="Abrir perfil de ${esc(o.name)}">${av(o.name, o.h, 44, o.logo)}</a>
        <div class="ph-id">
          <div class="ph-nm">
            <a class="ph-name" href="#/ong/${o.id}">${esc(o.name)}</a>${o.ver ? VER : ''}${seguirBtn}
          </div>
          <div class="ph-meta">
            <span>${esc(p.time)}${p.edited ? ' · editado' : ''}</span>
            ${o.cat ? `<span aria-hidden="true">•</span><span class="ph-cat">${esc(o.cat)}</span>` : ''}
          </div>
        </div>
        <div class="ph-side">
          <span class="tag">${lc(tipoIcone(p), 14)}${postTag(p)}</span>
          ${acaoBtn}
        </div>
      </header>
      <div class="pmedia" role="button" tabindex="0" aria-label="Ver publicação ampliada" onclick="openViewer(${p.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openViewer(${p.id})}">
        ${mediaOf(p, o)}
      </div>
      <div class="pb">
        <p class="pt ${longo ? 'clamp' : ''}">${esc(texto)}</p>
        ${longo ? '<button class="mais-t" type="button" onclick="alternarTexto(this)">Ver mais</button>' : ''}
        ${p.vol ? volBox(p) : ''}
        ${campaignProgress}
      </div>
      <footer class="pa">
        <button type="button" aria-label="Curtir" title="Curtir" data-lk="${p.id}" aria-pressed="${!!p.liked}" class="${p.liked ? 'liked' : ''}" onclick="likePost(${p.id}, this)">
          ${lc('heart', 20)}<span class="n">${p.likes}</span>
        </button>
        <button type="button" aria-label="Comentários" title="Comentários" onclick="openViewer(${p.id})">
          ${lc('message-circle', 20)}<span class="n" data-cm="${p.id}">${p.comments}</span>
        </button>
        <button type="button" aria-label="Compartilhar" title="Compartilhar" onclick="sharePost(${p.id})">${lc('share-2', 20)}</button>
        <div class="pa-cta">${cta(p, o)}</div>
      </footer>
    </article>
  `;
};

/* ---- estilo do card (funciona nos temas claro e escuro) ---- */
(() => {
  if (document.getElementById('civvo-post-css')) return;
  const st = document.createElement('style');
  st.id = 'civvo-post-css';
  st.textContent = `
    .card.post.v2{padding:0;border-radius:16px;overflow:hidden;border:1px solid rgba(127,127,127,.2);margin-bottom:18px;transition:box-shadow .2s ease,border-color .2s ease}
    .card.post.v2:hover{box-shadow:0 10px 30px rgba(0,0,0,.28);border-color:rgba(127,127,127,.36)}

    .card.post.v2 .ph{display:flex;align-items:center;gap:12px;padding:14px 16px}
    .card.post.v2 .ph-av{flex:none;display:inline-flex;border-radius:50%;line-height:0}
    .card.post.v2 .ph-id{flex:1;min-width:0}
    .card.post.v2 .ph-nm{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px}
    .card.post.v2 .ph-name{font-weight:700;font-size:15px;color:inherit;text-decoration:none}
    .card.post.v2 .ph-name:hover{text-decoration:underline}
    .card.post.v2 .ph-meta{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:12.5px;color:var(--mut);min-width:0}
    .card.post.v2 .ph-cat{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}
    .card.post.v2 .ph-side{display:flex;align-items:center;gap:6px;flex:none}
    .card.post.v2 .tag{display:inline-flex;align-items:center;gap:5px;margin:0;font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px}
    .card.post.v2 .ph-btn{width:34px;height:34px;display:grid;place-items:center;border:0;border-radius:50%;background:none;color:var(--mut);cursor:pointer;padding:0}
    .card.post.v2 .ph-btn:hover{background:rgba(127,127,127,.18);color:inherit}
    .card.post.v2 .fo{display:inline-flex;align-items:center;gap:4px;margin:0;padding:2px 10px 2px 8px;border:1px solid rgba(127,127,127,.45);border-radius:999px;background:none;color:inherit;font:inherit;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none}
    .card.post.v2 .fo:hover{background:rgba(127,127,127,.16)}
    .card.post.v2 .fo[aria-pressed="true"]{color:var(--mut);font-weight:500}

    .card.post.v2 .pmedia{position:relative;overflow:hidden;background:linear-gradient(135deg,#1f3945,#39677e);cursor:pointer}
    .card.post.v2 .pmedia.falhou{aspect-ratio:16/10;display:grid;place-items:center}
    .card.post.v2 .pmedia.falhou::after{content:"Imagem indisponível";color:rgba(255,255,255,.7);font-size:14px}

    .card.post.v2 .pb{padding:14px 16px 4px}
    .card.post.v2 .pt{margin:0;white-space:pre-line;line-height:1.55;font-size:15px;word-break:break-word}
    .card.post.v2 .pt.clamp{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
    .card.post.v2 .mais-t{margin:2px 0 0;padding:4px 0;border:0;background:none;color:var(--mut);font:inherit;font-weight:600;cursor:pointer}
    .card.post.v2 .mais-t:hover{color:inherit}

    .card.post.v2 .prog{margin:14px 0 8px;padding:14px 16px;border-radius:12px;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.18)}
    .card.post.v2 .prog-top{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}
    .card.post.v2 .prog-top b{font-size:19px}
    .card.post.v2 .prog-top span{color:var(--mut);font-size:13px}
    .card.post.v2 .prog-top .pct{margin-left:auto;font-weight:700;color:inherit;font-size:14px}
    .card.post.v2 .bar{height:8px;border-radius:8px;background:rgba(127,127,127,.28);overflow:hidden;margin:10px 0 8px}
    .card.post.v2 .bar b{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#39677e,#6fc3e8)}
    .card.post.v2 .prog-bot{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--mut)}

    .card.post.v2 .pa{display:flex;align-items:center;gap:2px;padding:8px 10px 12px}
    .card.post.v2 .pa > button{display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:0;border-radius:10px;background:none;color:var(--mut);font:inherit;cursor:pointer;transition:background .15s,color .15s}
    .card.post.v2 .pa > button:hover{background:rgba(127,127,127,.16);color:inherit}
    .card.post.v2 .pa > button.liked{color:#ef4444}
    .card.post.v2 .pa > button.liked svg{fill:currentColor}
    .card.post.v2 .pa-cta{margin-left:auto;display:flex;align-items:center;gap:8px}
    .card.post.v2 .pa-cta .btn{display:inline-flex;align-items:center;gap:6px}
  `;
  document.head.appendChild(st);
})();

/* imagem que não carrega: mostra um fundo neutro com aviso, em vez de um quadro preto quebrado */
if (!window.__civvoImgErr) {
  window.__civvoImgErr = true;
  document.addEventListener(
    'error',
    (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'IMG' || !t.closest) return;
      const m = t.closest('.pmedia');
      if (!m) return;
      t.style.visibility = 'hidden';
      const imgs = [...m.querySelectorAll('img')];
      if (imgs.every((i) => i.style.visibility === 'hidden' || (i.complete && i.naturalWidth === 0))) m.classList.add('falhou');
    },
    true
  );
}

function pintaLike(p, liked, n) {
  p.liked = liked;
  p.likes = n;

  document.querySelectorAll('[data-lk="' + p.id + '"]').forEach((b) => {
    b.classList.toggle('liked', liked);
    b.setAttribute('aria-pressed', liked);
    const spanN = b.querySelector('.n');
    if (spanN) spanN.textContent = n;
  });

  document.querySelectorAll('[data-ln="' + p.id + '"]').forEach((e) => {
    e.textContent = n;
  });
}

async function likePost(id) {
  const p = POSTS.find((x) => x.id == id);
  if (!p || p._lk) return;

  p._lk = 1;
  const l = !!p.liked;
  const n = p.likes;

  pintaLike(p, !l, n + (l ? -1 : 1));

  try {
    const r = await API.curtirPost(id);
    if (r && typeof r.liked == 'boolean') {
      const novaCurtida = r.liked;
      const totalLikesReal = r.total_likes ?? (n - (l ? 1 : 0) + (novaCurtida ? 1 : 0));
      pintaLike(p, novaCurtida, totalLikesReal);
    }
  } catch (e) {
    pintaLike(p, l, n);
    toast('Não foi possível curtir. Tente de novo.');
  } finally {
    p._lk = 0;
  }
}

const boostBtn = (p) =>
  p.boosted
    ? `<span class="tag">Impulsionado até ${esc(p.boostEnd || '')}</span>`
    : `<button class="btn sm" ${EB()} onclick="openBoost(${p.id})">Add Impulso</button>`;

function openBoost(id) {
  if (!DEMO) return emBreve('Impulsionar depois de publicar estará disponível em breve.');
  if (!temRecurso('impulso')) return upsell('impulso');

  const resta = impulsosRestantes();
  const opcoes = [7, 15, 30]
    .map((d) => {
      const custo = impulsosDe(d);
      const ok = custo <= resta;
      return `<button type="button" class="btn ${ok ? 'light' : 'ghost'} full" style="margin-top:8px" ${ok ? '' : 'disabled'} onclick="boostPost(${id}, ${d}, this)">
        ${d} dias · ${custo} ${custo > 1 ? 'impulsos' : 'impulso'}
      </button>`;
    })
    .join('');

  openModal(
    `<h3>Impulsionar publicação</h3>
     <p style="margin:8px 0;color:var(--mut);font-size:13px">
       Destaca a publicação no feed. Você tem <b>${resta}</b> de ${IMPULSOS_MES} impulsos neste mês.
     </p>
     ${opcoes}`,
    'Impulsionar'
  );
}

async function boostPost(id, dias, btn) {
  const p = POSTS.find((x) => x.id == id);
  if (!p) return;

  const ok = await comEspera(btn, 'Impulsionando…', () => {
    gastarImpulsos(dias);
    p.boosted = true;
    p.boostEnd = new Date(Date.now() + dias * 864e5).toLocaleDateString('pt-BR');
  });

  if (!ok) return;

  closeModal();
  toast(`Publicação impulsionada por ${dias} dias.`);
  go();
}

async function sharePost(id) {
  const p = POSTS.find((x) => x.id == id);
  const o = ong(p.ong);
  const url = location.href.split('#')[0] + '#/post/' + p.id;
  try {
    if (navigator.share) {
      await navigator.share({ title: o.name, text: p.text.slice(0, 100), url });
      if (!DEMO) API.compartilharPost(id).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    if (!DEMO) API.compartilharPost(id).catch(() => {});
    toast('Link copiado.');
  } catch (e) {
    if (e.name != 'AbortError') prompt('Copie o link:', url);
  }
}

const postTag = (p) => {
  if (p.boosted) return 'Impulsionado';
  if (p.camp && p.camp.status == 'ENCERRADA') return 'Encerrada';
  if (p.camp && p.camp.status == 'ALCANÇADA') return 'Meta alcançada';
  const map = { CAMPANHA: 'Campanha', VOLUNTARIADO: 'Voluntariado', VOLUNTARIO: 'Voluntariado' };
  return map[p.kind] || 'Publicação';
};

const mediaOf = (p, o) => {
  /* só imagens enviadas pelo app (ver imgOk); aceita imgs, media_url ou o array media do banco */
  let listaImgs = p.imgs || [];
  if (!listaImgs.length && p.media_url) listaImgs = [p.media_url];
  if (!listaImgs.length && p.media && p.media.length) listaImgs = p.media.map((m) => m.file_url);
  listaImgs = listaImgs.map(imgOk).filter(Boolean);

  if (listaImgs.length > 0) return carousel(listaImgs);

  /* sem imagem: capa padrão com a sigla da ONG, em azul do Civvo (nunca uma foto aleatória) */
  return `<div class="pm-default" aria-hidden="true"><span class="pm-sig">${esc(siglaDe(o.name))}</span></div>`;
};

const cta = (p, o) => {
  const c = p.camp;
  if (ROLE == 'ong' && p.ong == ME_ONG) return boostBtn(p);
  if (p.vol) return volBtn(p, o);
  if (c) {
    return c.status == 'ENCERRADA'
      ? `<span class="tag">${lc('circle-check', 14)} Campanha encerrada</span>`
      : `<a class="btn sm" href="#/doar/${p.id}">${lc('heart', 16)} Ajudar</a>`;
  }
  return `<a class="btn light sm" href="#/ong/${o.id}">${lc('building-2', 16)} Ver ONG</a>`;
};