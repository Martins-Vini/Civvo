/* Post individual (#/post/ID) e comentários em árvore */

let RPL = null;
let CURPOST = 0;

const semComentarios = () => '<p class="emp">Seja o primeiro a comentar.</p>';

const bump = (p, n) => {
  if (!p) return;
  p.comments = Math.max(0, (p.comments || 0) + n);
  document
    .querySelectorAll(`[data-cm="${p.id}"]`)
    .forEach((e) => (e.textContent = p.comments));
};

const quem = () => {
  if (ROLE == 'ong') {
    const o = meOng();
    return { user: o.name, nome: o.name, avatar: o.logo, h: o.h };
  }
  return { user: USER.apelido_unico, nome: nomeDoador(), avatar: USER.avatar_url, h: 200 };
};

// Dono do comentário: pode editar e excluir o próprio comentário.
// Em sessão real comparamos pelo user_id de verdade (vindo do banco); no demo, como não existe
// um id de usuário real guardado por comentário, comparamos pelo nome de quem está "logado".
const souAutorComentario = (c) => {
  if (DEMO) return c.user === quem().user;
  const meuId = window.__civvoSessao?.usuario?.id;
  return meuId != null && c.userId != null && Number(c.userId) === Number(meuId);
};

// Dono da publicação (ONG): pode excluir qualquer comentário nela, mas nunca editar o de outra pessoa.
const donoDoPostPodeExcluir = (pid) => {
  const p = POSTS.find((x) => x.id == pid);
  return ROLE == 'ong' && !!p && p.ong == ME_ONG;
};

let EDITING_COMMENT = null;

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
      const souDono = souAutorComentario(c);
      const podeExcluir = souDono || donoDoPostPodeExcluir(pid);
      const estaEditando = EDITING_COMMENT == c.id;

      const corpoHtml = estaEditando
        ? `<textarea id="ecTxt-${c.id}" class="in" rows="2">${esc(c.text)}</textarea>
           <div style="margin-top:6px">
             <button class="btn sm" onclick="salvarEdicaoComentario(${c.id}, ${pid}, this)">Salvar</button>
             <button class="lk" style="margin-left:10px" onclick="cancelarEdicaoComentario(${pid})">Cancelar</button>
           </div>`
        : `<p>${esc(c.text)}${c.editado ? ' <small style="color:var(--mut)">(editado)</small>' : ''}</p>
           <button class="lk" style="margin:0 12px 0 0" onclick="replyTo(${c.id})">Responder</button>
           ${souDono ? `<button class="lk" style="margin:0 12px 0 0" onclick="iniciarEdicaoComentario(${c.id})">Editar</button>` : ''}
           ${podeExcluir ? `<button class="lk" style="margin:0" onclick="askDelComment(${c.id}, ${pid})">Excluir</button>` : ''}`;

      return `
        <div class="cmt ${isRep}" style="margin-left:${marginLeft}px">
          ${av(c.nome || c.user, c.h || 200, 30, c.avatar)}
          <div class="cmb">
            <b>${esc(c.nome || c.user)}</b> 
            <small style="color:var(--mut)">${esc(dia(c.time))}</small>
            ${corpoHtml}
          </div>
        </div>
        ${nest(pid, c.id, d + 1)}
      `;
    })
    .join('');
};

function iniciarEdicaoComentario(id) {
  RPL = null;
  EDITING_COMMENT = id;
  drawComments(CURPOST);
  $('#ecTxt-' + id)?.focus();
}

function cancelarEdicaoComentario(pid) {
  EDITING_COMMENT = null;
  drawComments(pid);
}

async function salvarEdicaoComentario(id, pid, btn) {
  const ta = $('#ecTxt-' + id);
  const novoTexto = ta.value.trim();
  if (!novoTexto) return;

  const c = COMMENTS.find((x) => x.id == id);

  const ok = await comEspera(btn, 'Salvando…', async () => {
    if (!DEMO) await window.CivvoApi.editarComentario(pid, id, novoTexto);
    c.text = novoTexto;
    c.editado = true;
  });

  if (!ok) return;

  EDITING_COMMENT = null;
  drawComments(pid);
}

function askDelComment(id, pid) {
  openModal(
    `<h3>Excluir comentário?</h3>
     <p style="margin:8px 0 16px">Esta ação não pode ser desfeita.</p>
     <button class="btn full" style="background:var(--bad)" onclick="delComment(${id}, ${pid}, this)">Excluir definitivamente</button>`,
    'Excluir comentário'
  );
}

async function delComment(id, pid, btn) {
  const ok = await comEspera(btn, 'Excluindo…', async () => {
    if (!DEMO) await window.CivvoApi.excluirComentario(pid, id);

    const idx = COMMENTS.findIndex((x) => x.id == id);
    if (idx >= 0) COMMENTS.splice(idx, 1);

    bump(POSTS.find((x) => x.id == pid), -1);
  });

  if (!ok) return;

  if (EDITING_COMMENT == id) EDITING_COMMENT = null;
  closeModal();
  toast('Comentário excluído.');
  drawComments(pid);
}

async function carregarComentariosReais(pid) {
  if (DEMO) return;
  try {
    const lista = await window.CivvoApi.listarComentariosPost(pid);
    
    // LIMPEZA SEGURA: Remove da memória local APENAS os comentários deste post para evitar duplicação
    for (let i = COMMENTS.length - 1; i >= 0; i--) {
      if (Number(COMMENTS[i].post) === Number(pid)) {
        COMMENTS.splice(i, 1);
      }
    }

    // Insere limpo e ordenado exatamente o que veio do MySQL
    if (Array.isArray(lista)) {
      lista.forEach((c) => {
        COMMENTS.push({
          id: c.id,
          post: pid,
          parent: c.parent_comment_id || null,
          userId: c.user_id,
          user: c.autor_nome || 'Usuário Civvo',
          nome: c.autor_nome || 'Usuário Civvo',
          avatar: c.autor_avatar || '',
          h: 200,
          text: c.content,
          editado: !!c.is_edited,
          time: new Date(c.created_at).toLocaleDateString('pt-BR'),
        });
      });
    }
    
    CMT_OK.add(pid);
    drawComments(pid);
  } catch (e) {
    console.error('Erro ao buscar comentários do banco:', e);
  }
}

function drawComments(pid) {
  if (!$('#cmts')) return;
  $('#cmts').innerHTML = nest(pid) || semComentarios();
  
  const r = $('#rpl');
  if (r) {
    r.hidden = !RPL;
    if (RPL) r.firstElementChild.textContent = 'Respondendo a @' + RPL.user;
  }
}

function replyTo(id) {
  EDITING_COMMENT = null;
  RPL = id ? { id, user: COMMENTS.find((c) => c.id == id)?.user || 'Usuário' } : null;
  drawComments(CURPOST);
  $('#nc')?.focus();
}

async function addComment(pid, btn) {
  const i = $('#nc');
  const t = i.value.trim();
  if (!t) return;

  const w = quem();
  const par = RPL ? RPL.id : null;
  btn = btn || i.nextElementSibling;

  const ok = await comEspera(btn, 'Enviando…', async () => {
    const r = DEMO ? null : await window.CivvoApi.comentarPost(pid, t, par);

    COMMENTS.push({
      id: r?.commentId ?? Date.now(),
      post: pid,
      parent: par,
      userId: DEMO ? null : window.__civvoSessao?.usuario?.id,
      user: w.user,
      nome: w.nome,
      avatar: w.avatar,
      h: w.h,
      text: t,
      editado: false,
      time: new Date().toLocaleDateString('pt-BR'),
    });

    bump(POSTS.find((x) => x.id == pid), 1);
  });

  if (!ok) return;

  RPL = null;
  i.value = '';
  drawComments(pid);
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

  // Dispara a busca em tempo real no banco MySQL
  setTimeout(() => carregarComentariosReais(p.id), 50);

  const content = `
    <div class="top">
      <a class="btn light sm" href="#/feed">← Feed</a>
    </div>
    ${postH(p)}
    <div class="card" style="padding:16px">
      <h4 style="margin-bottom:8px">Comentários</h4>
      <div id="cmts"><p class="emp">Carregando comentários...</p></div>
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