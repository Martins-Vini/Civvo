/* Post individual (#/post/ID) e comentários em árvore (POST_COMMENT.parent_comment_id), também usados no visualizador. */

let RPL = null;
let CURPOST = 0;

const bump = (p, n) => {
  p.comments = Math.max(0, p.comments + n);
  document
    .querySelectorAll(`[data-cm="${p.id}"]`)
    .forEach((e) => (e.textContent = p.comments));
};

const quem = () => {
  if (ROLE == 'ong') {
    const o = meOng();
    return { 
      user: o.name, 
      nome: o.name, 
      avatar: o.logo, 
      h: o.h 
    };
  }
  
  return { 
    user: USER.apelido_unico, 
    nome: nomeDoador(), 
    avatar: USER.avatar_url, 
    h: 200 
  };
};

const canDelComment = (pid) => {
  const p = POSTS.find((x) => x.id == pid);
  return ROLE == 'ong' && !!p && p.ong == ME_ONG;
};

const branch = (id) => {
  const ids = new Set([id]);
  let ch = true;
  
  while (ch) {
    ch = false;
    COMMENTS.forEach((x) => {
      if (x.parent && ids.has(x.parent) && !ids.has(x.id)) {
        ids.add(x.id);
        ch = true;
      }
    });
  }
  
  return ids;
};

const nest = (pid, parent = null, d = 0) => {
  return COMMENTS
    .filter((c) => c.post == pid && (c.parent || null) == parent)
    .map((c) => {
      const isRep = d ? 'rep' : '';
      const marginLeft = Math.min(d, 3) * 18;
      const delBtn = canDelComment(pid) 
        ? `<button class="lk" style="margin:0" onclick="askDelComment(${c.id})">Excluir</button>` 
        : '';

      return `
        <div class="cmt ${isRep}" style="margin-left:${marginLeft}px">
          ${av(c.nome || c.user, c.h || 200, 30, c.avatar)}
          <div class="cmb">
            <b>${esc(c.user)}</b> 
            <small style="color:var(--mut)">${esc(dia(c.time))}</small>
            <p>${esc(c.text)}</p>
            <button class="lk" style="margin:0 12px 0 0" onclick="replyTo(${c.id})">Responder</button>
            <button class="lk" style="margin:0 12px 0 0" onclick="openReport('COMMENT', ${c.id})">Denunciar</button>
            ${delBtn}
          </div>
        </div>
        ${nest(pid, c.id, d + 1)}
      `;
    })
    .join('');
};

function drawComments(pid) {
  if (!$('#cmts')) return;
  
  $('#cmts').innerHTML = nest(pid) || '<p class="emp">Seja o primeiro a comentar.</p>';
  
  const r = $('#rpl');
  r.hidden = !RPL;
  if (RPL) {
    r.firstElementChild.textContent = 'Respondendo a @' + RPL.user;
  }
}

function replyTo(id) {
  RPL = id ? { id, user: COMMENTS.find((c) => c.id == id).user } : null;
  drawComments(CURPOST);
  $('#nc').focus();
}

async function addComment(pid, btn) {
  const i = $('#nc');
  const t = i.value.trim();
  if (!t) return;

  const w = quem();
  const par = RPL ? RPL.id : null;
  btn = btn || i.nextElementSibling;

  const ok = await comEspera(btn, 'Enviando…', () => {
    COMMENTS.push({
      id: Date.now(),
      post: pid,
      parent: par,
      user: w.user,
      nome: w.nome,
      avatar: w.avatar,
      h: w.h,
      text: t,
      time: new Date().toLocaleDateString('pt-BR'),
    });

    bump(POSTS.find((x) => x.id == pid), 1);

    if (!par && ROLE != 'ong') {
      notify(
        'ong', 
        'COMENTARIO', 
        `@${w.user} comentou em uma publicação.`, 
        '#/post/' + pid
      );
    }
  });

  if (!ok) return;

  RPL = null;
  i.value = '';
  drawComments(pid);
}

function askDelComment(id) {
  const c = COMMENTS.find((x) => x.id == id);
  if (!c || !canDelComment(c.post)) return;

  const n = branch(id).size - 1;
  const avisoRespostas = n ? `As ${n} resposta(s) a ele também serão removidas. ` : '';

  openModal(
    `<h3>Excluir comentário?</h3>
     <p style="margin:8px 0 16px">${avisoRespostas}Esta ação não pode ser desfeita.</p>
     <button class="btn full" style="background:var(--bad)" onclick="delComment(${id});closeModal()">Excluir</button>`,
    'Excluir comentário'
  );
}

function delComment(id) {
  const c = COMMENTS.find((x) => x.id == id);
  if (!c || !canDelComment(c.post)) return;

  const ids = branch(id);

  for (let i = COMMENTS.length - 1; i >= 0; i--) {
    if (ids.has(COMMENTS[i].id)) {
      COMMENTS.splice(i, 1);
    }
  }

  bump(POSTS.find((x) => x.id == c.post), -ids.size);

  if (RPL && ids.has(RPL.id)) {
    RPL = null;
  }

  drawComments(c.post);
}

const openPost = (id) => {
  if (location.hash == '#/post/' + id) {
    $('#nc')?.focus();
  } else {
    location.hash = '#/post/' + id;
  }
};

V.post = (id) => {
  const p = POSTS.find((x) => x.id == id);
  if (!p || !ong(p.ong)) {
    return shell('<div class="card emp">Publicação não encontrada.</div>', 'feed', { rightCol: 0 });
  }

  RPL = null;
  CURPOST = p.id;

  const content = `
    <div class="top">
      <a class="btn light sm" href="#/feed">← Feed</a>
    </div>
    ${postH(p)}
    <div class="card" style="padding:16px">
      <h4 style="margin-bottom:8px">Comentários</h4>
      <div id="cmts">${cmtsInicial(p.id)}</div>
      <div id="rpl" class="rpl" hidden>
        <span></span>
        <button class="lk" style="margin:0" onclick="replyTo(null)">Cancelar</button>
      </div>
      <div class="cf" style="padding:12px 0 0;border:0">
        <input 
          id="nc" 
          class="in" 
          aria-label="Escreva um comentário" 
          placeholder="Escreva um comentário…" 
          onkeydown="if(event.key=='Enter')addComment(${p.id})"
        >
        <button class="btn" onclick="addComment(${p.id}, this)">Enviar</button>
      </div>
    </div>
  `;

  return shell(content, 'feed', { rightCol: 0 });
};