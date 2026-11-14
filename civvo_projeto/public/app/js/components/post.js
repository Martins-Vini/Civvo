/* Cartão de postagem. */

const postH = (p) => {
  const o = ong(p.ong);
  if (!o) return '';

  const c = p.camp;
  const pct = c && c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0;
  const isOwnPost = ROLE == 'ong' && p.ong == ME_ONG;

  const seguindo = FOLLOW.has(o.id);
  const seguirBtn = isOwnPost || ROLE == 'admin'
    ? ''
    : `<button class="lk fo" data-fo="${o.id}" aria-pressed="${seguindo}" onclick="seguirOngClick(${o.id}, this)">${seguindo ? 'Seguindo' : 'Seguir'}</button>`;

  const actionLink = isOwnPost 
    ? `<button class="lk" onclick="managePost(${p.id})">Gerenciar</button>` 
    : `<button class="lk" aria-label="Denunciar publicação" onclick="openReport('POST', ${p.id})">Denunciar</button>`;

  const campaignProgress = c 
    ? `<div class="prog">
         <div class="bar"><b style="width:${pct}%"></b></div>
         <div class="pg2">
           <b>${money(c.atual)}</b> de ${money(c.meta)}
           <span>${c.limite ? 'até ' + esc(c.limite) : ''}</span>
         </div>
       </div>` 
    : '';

  return `
    <article class="card post" data-p="${p.id}">
      <div class="ph">
        <a href="#/ong/${o.id}" class="ph-av" aria-label="Abrir perfil de ${esc(o.name)}">${av(o.name, o.h)}</a>
        <div>
          <b>${esc(o.name)} ${o.ver ? VER : ''}</b> ${seguirBtn}
          <small>${esc(p.time)}${p.edited ? ' · editado' : ''}${o.cat ? ' · ' + esc(o.cat) : ''}</small>
        </div>
        <span class="tag">${postTag(p)}</span>
        ${actionLink}
      </div>
      <div class="pmedia" role="button" tabindex="0" aria-label="Ver publicação ampliada" onclick="openViewer(${p.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openViewer(${p.id})}">
        ${mediaOf(p, o)}
      </div>
      <div class="pb">
        <p>${esc(p.text)}</p>
        ${p.vol ? volBox(p) : ''}
        ${campaignProgress}
      </div>
      <div class="pa">
        <button aria-label="Curtir" data-lk="${p.id}" aria-pressed="${!!p.liked}" class="${p.liked ? 'liked' : ''}" onclick="likePost(${p.id}, this)">
          ${ic('heart')} <span class="n">${p.likes}</span>
        </button>
        <button aria-label="Comentários" onclick="openViewer(${p.id})">
          ${ic('msg')} <span class="n" data-cm="${p.id}">${p.comments}</span>
        </button>
        <button aria-label="Compartilhar" onclick="sharePost(${p.id})">${ic('share')}</button>
        ${cta(p, o)}
      </div>
    </article>
  `;
};

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
  // Código modal boost mantido igual
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
  const map = { CAMPANHA: 'Campanha', VOLUNTARIADO: 'Voluntariado' };
  return map[p.kind] || 'Publicação';
};

const mediaOf = (p, o) => {
  // Pega imagens de p.imgs, p.media_url ou do array p.media do banco
  let listaImgs = p.imgs || [];
  if (!listaImgs.length && p.media_url) listaImgs = [p.media_url];
  if (!listaImgs.length && p.media && p.media.length) {
    listaImgs = p.media.map(m => m.file_url);
  }

  if (listaImgs && listaImgs.length > 0) {
    return carousel(listaImgs);
  }
  
  const bgColor = o.id % 2 ? '#4a778b' : '#39677e';
  return `
    <div class="pm" style="background:${bgColor}">
      <div>
        ${esc(p.title || o.name)}
        <small>Mídia indisponível ou em formato inválido</small>
      </div>
    </div>
  `;
};

const cta = (p, o) => {
  const c = p.camp;
  if (ROLE == 'ong' && p.ong == ME_ONG) return boostBtn(p);
  if (p.vol) return volBtn(p, o);
  if (c) return c.status == 'ENCERRADA' ? '<span class="tag">Campanha encerrada</span>' : `<a class="btn sm" href="#/doar/${p.id}">Ajudar</a>`;
  return `<a class="btn light sm" href="#/ong/${o.id}">Ver ONG</a>`;
};