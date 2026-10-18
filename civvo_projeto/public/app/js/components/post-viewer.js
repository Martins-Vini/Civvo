/* Visualizador da publicação */

function closeViewer() {
  const v = document.getElementById('pv');
  if (v) {
    v.remove();
    document.body.style.overflow = '';
    overlayClosed();
  }
}

function openViewer(id) {
  if (location.hash.startsWith('#/post/')) {
    const i = document.getElementById('nc');
    if (i) i.focus();
    return;
  }

  const p = POSTS.find((x) => x.id == id);
  const o = p && ong(p.ong);
  if (!p || !o) return;

  closeViewer();
  RPL = null;
  CURPOST = p.id;

  const c = p.camp;
  const pct = c && c.meta ? Math.min(100, (c.atual / c.meta) * 100) : 0;
  const own = ROLE == 'ong' && p.ong == ME_ONG;

  const actionButton = own 
    ? `<button class="lk" onclick="closeViewer();managePost(${p.id})">Gerenciar</button>` 
    : `<button class="lk" onclick="openReport('POST', ${p.id})">Denunciar</button>`;

  const campaignBox = c 
    ? `<div class="prog">
         <div class="bar"><b style="width:${pct}%"></b></div>
         <div class="pg2">
           <b>${money(c.atual)}</b> de ${money(c.meta)}
           <span>${c.limite ? 'até ' + esc(c.limite) : ''}</span>
         </div>
       </div>` 
    : '';

  const el = document.createElement('div');
  el.id = 'pv';
  el.className = 'pv';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Publicação de ' + o.name);

  el.onclick = (e) => {
    if (e.target == el) closeViewer();
  };

  el.innerHTML = `
    <button class="pvx" aria-label="Fechar" onclick="closeViewer()">✕</button>
    <div class="pvc">
      <div class="pvm">${mediaOf(p, o)}</div>
      <div class="pvr">
        <div class="pvh">
          ${av(o.name, o.h, 38)}
          <div>
            <b>${esc(o.name)} ${o.ver ? VER : ''}</b>
            <small>${esc(o.city || o.cat || '')}</small>
          </div>
          <span class="tag">${postTag(p)}</span>
          ${actionButton}
        </div>
        <div class="pvb">
          <div class="cap">
            ${av(o.name, o.h, 34)}
            <div>
              <b>${esc(o.name)}</b> ${esc(p.text)}
              <small>${esc(p.time)}${p.edited ? ' · editado' : ''}</small>
            </div>
          </div>
          ${p.vol ? volBox(p) : ''}
          ${campaignBox}
          <div id="cmts" style="margin-top:12px">${cmtsInicial(p.id)}</div>
        </div>
        <div class="pvf">
          <div id="rpl" class="rpl" hidden style="margin:0 14px">
            <span></span>
            <button class="lk" style="margin:0" onclick="replyTo(null)">Cancelar</button>
          </div>
          <div class="pa" style="padding:10px 14px 4px">
            <button aria-label="Curtir" data-lk="${p.id}" aria-pressed="${!!p.liked}" class="${p.liked ? 'liked' : ''}" onclick="likePost(${p.id})">
              ${ic('heart')} <span class="n">${p.likes}</span>
            </button>
            <button aria-label="Comentar" onclick="document.getElementById('nc').focus()">
              ${ic('msg')} <span class="n" data-cm="${p.id}">${p.comments}</span>
            </button>
            <button aria-label="Compartilhar" onclick="sharePost(${p.id})">${ic('share')}</button>
            ${cta(p, o)}
          </div>
          <div class="pvl"><b data-ln="${p.id}">${p.likes}</b> curtidas · ${esc(p.time)}</div>
          <div class="cf">
            <input id="nc" class="in" aria-label="Escreva um comentário" placeholder="Adicione um comentário..." onkeydown="if(event.key==='Enter')addComment(${p.id})">
            <button class="btn sm" onclick="addComment(${p.id}, this)">Postar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  rememberFocus();
  document.body.appendChild(el);
  syncOverlays();
  document.body.style.overflow = 'hidden';
  el.querySelector('.pvx').focus();
}