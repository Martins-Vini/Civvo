/* Cartão de postagem. post_type 'CAMPANHA' mostra progresso da meta e botão "Ajudar" (leva ao fluxo de doação). */

const postH = (p) => {
  const o = ong(p.ong);
  if (!o) return '';

  const c = p.camp;
  const pct = c && c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0;
  const isOwnPost = ROLE == 'ong' && p.ong == ME_ONG;

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
        ${av(o.name, o.h)}
        <div>
          <b>${esc(o.name)} ${o.ver ? VER : ''}</b>
          <small>${esc(p.time)}${p.edited ? ' · editado' : ''} · ${esc(o.cat)}</small>
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
    b.querySelector('.n').textContent = n;
  });

  document.querySelectorAll('[data-ln="' + p.id + '"]').forEach((e) => {
    e.textContent = n;
  });
}

async function likePost(id) {
  const p = POSTS.find((x) => x.id == id);
  if (p._lk) return;

  p._lk = 1;
  const l = !!p.liked;
  const n = p.likes;

  pintaLike(p, !l, n + (l ? -1 : 1));

  try {
    await chamar(null, 250);
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
    : `<button class="btn sm" onclick="openBoost(${p.id})">Add Impulso</button>`;

function openBoost(id) {
  const radiosHtml = [7, 15, 30]
    .map((d, i) => `<label class="rd"><input type="radio" name="bd" value="${d}" ${i ? '' : 'checked'}> ${d} dias</label>`)
    .join('');

  const content = `
    <h3>Impulsionar publicação</h3>
    <p class="sub">Sua publicação ganha destaque no feed dos doadores durante o período escolhido.</p>
    <fieldset class="mot">${radiosHtml}</fieldset>
    <button class="btn full" onclick="confirmBoost(${id}, this)">Impulsionar</button>
  `;

  openModal(content, 'Impulsionar');
}

async function confirmBoost(id, btn) {
  const p = POSTS.find((x) => x.id == id);
  const d = +document.querySelector('input[name=bd]:checked').value;

  const ok = await comEspera(btn, 'Processando…', () => {
    p.boosted = true;
    p.boostEnd = dataBR(new Date(Date.now() + d * 864e5).toISOString().slice(0, 10));
  });

  if (!ok) return;

  closeModal();

  const c = document.querySelector('[data-p="' + id + '"]');
  if (c) {
    c.querySelector('.ph .tag').textContent = 'Impulsionado';
    const b = c.querySelector('.pa .btn');
    if (b) {
      b.outerHTML = boostBtn(p);
    }
  }

  if (document.getElementById('pv')) {
    openViewer(id);
  }

  toast(`Publicação impulsionada por ${d} dias.`);
}

async function sharePost(id) {
  const p = POSTS.find((x) => x.id == id);
  const o = ong(p.ong);
  const url = location.href.split('#')[0] + '#/post/' + p.id;

  try {
    if (navigator.share) {
      await navigator.share({ 
        title: o.name, 
        text: p.text.slice(0, 100), 
        url 
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('Link copiado.');
  } catch (e) {
    if (e.name != 'AbortError') {
      prompt('Copie o link:', url);
    }
  }
}

const postTag = (p) => {
  if (p.boosted) return 'Impulsionado';
  if (p.camp && p.camp.status == 'ENCERRADA') return 'Encerrada';
  if (p.camp && p.camp.status == 'ALCANÇADA') return 'Meta alcançada';
  
  const map = { CAMPANHA: 'Campanha', VOLUNTARIO: 'Voluntariado' };
  return map[p.kind] || 'Publicação';
};

const mediaOf = (p, o) => {
  if (p.imgs && p.imgs.length) {
    return carousel(p.imgs);
  }
  
  const bgColor = o.id % 2 ? '#4a778b' : '#39677e';
  return `
    <div class="pm" style="background:${bgColor}">
      <div>
        ${esc(p.title || o.name)}
        <small>Espaço reservado para a mídia do post</small>
      </div>
    </div>
  `;
};

const cta = (p, o) => {
  const c = p.camp;
  if (ROLE == 'ong' && p.ong == ME_ONG) {
    return boostBtn(p);
  }
  if (p.vol) {
    return volBtn(p, o);
  }
  if (c) {
    return c.status == 'ENCERRADA'
      ? '<span class="tag">Campanha encerrada</span>'
      : `<a class="btn sm" href="#/doar/${p.id}">Ajudar</a>`;
  }
  return `<a class="btn light sm" href="#/ong/${o.id}">Ver ONG</a>`;
};