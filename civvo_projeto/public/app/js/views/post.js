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
  return { user: USER.apelido_unico, nome: nomeDoador(), avatar: imgOk(USER.avatar_url), h: 200 };
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
  if (ROLE != 'ong') return false;
  const p = POSTS.find((x) => x.id == pid);
  if (!p) return false;
  /* ME_ONG vem do login ou do perfil; se ainda não chegou, usa o id guardado na sessão */
  const meuId = ME_ONG || window.__civvoSessao?.usuario?.ong_profile_id || null;
  return meuId != null && Number(p.ong) === Number(meuId);
};

let EDITING_COMMENT = null;

/* reduz o tamanho da foto de quem comentou (carrega bem mais rápido) */
const otimizaAvatar = (u, px = 96) => {
  if (!u || typeof u !== 'string') return u || '';
  if (/^https:\/\/lh3\.googleusercontent\.com\//.test(u) && !/=[sw]\d+/.test(u)) return u + `=s${px}-c`;
  const m = u.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/);
  if (m && !/^(c_|w_|h_|f_|q_|ar_|g_)/.test(m[2])) return `${m[1]}c_fill,g_auto,w_${px},h_${px},f_auto,q_auto/${m[2]}`;
  return u;
};

/* linha de comentário do banco -> formato usado na tela */
const comentarioDoBack = (c, pid) => ({
  id: c.id,
  post: pid,
  parent: c.parent_comment_id || null,
  userId: c.user_id,
  user: c.autor_nome || 'Usuário Civvo',
  nome: c.autor_nome || 'Usuário Civvo',
  avatar: imgOk(c.autor_avatar),
  h: 200,
  text: c.content,
  editado: !!c.is_edited,
  time: new Date(c.created_at).toLocaleDateString('pt-BR'),
});

/* troca, na memória, os comentários de uma publicação pela lista vinda do banco */
function substituirComentarios(pid, lista) {
  for (let i = COMMENTS.length - 1; i >= 0; i--) {
    if (Number(COMMENTS[i].post) === Number(pid)) COMMENTS.splice(i, 1);
  }
  if (Array.isArray(lista)) lista.forEach((c) => COMMENTS.push(comentarioDoBack(c, pid)));
}

/* botão só com ícone (com texto alternativo para leitores de tela e dica ao passar o mouse) */
const btnIcone = (icone, titulo, onclick, cls = '') =>
  `<button class="lk ic-btn ${cls}" title="${titulo}" aria-label="${titulo}" onclick="${onclick}">${lc(icone, 17)}</button>`;

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
      const podeDenunciar = !souDono;
      const estaEditando = EDITING_COMMENT == c.id;

      const corpoHtml = estaEditando
        ? `<textarea id="ecTxt-${c.id}" class="in" rows="2">${esc(c.text)}</textarea>
           <div style="margin-top:6px">
             <button class="btn sm" onclick="salvarEdicaoComentario(${c.id}, ${pid}, this)">Salvar</button>
             <button class="lk" style="margin-left:10px" onclick="cancelarEdicaoComentario(${pid})">Cancelar</button>
           </div>`
        : `<p>${esc(c.text)}${c.editado ? ' <small style="color:var(--mut)">(editado)</small>' : ''}</p>
           <div class="cm-acts" style="margin-top:2px">
             ${btnIcone('reply', 'Responder', `replyTo(${c.id})`)}
             ${souDono ? btnIcone('pencil', 'Editar', `iniciarEdicaoComentario(${c.id})`) : ''}
             ${podeExcluir ? btnIcone('trash-2', 'Excluir', `askDelComment(${c.id}, ${pid})`, 'bad') : ''}
             ${podeDenunciar ? btnIcone('flag', 'Denunciar', `openReportComment(${c.id}, ${pid})`, 'bad') : ''}
           </div>`;

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
  const respostas = branch(id).size - 1;
  const aviso = respostas > 0
    ? `Este comentário tem ${respostas} ${respostas > 1 ? 'respostas' : 'resposta'}, que também ${respostas > 1 ? 'serão excluídas' : 'será excluída'}.`
    : 'Esta ação não pode ser desfeita.';

  openModal(
    `<h3>Excluir comentário?</h3>
     <p style="margin:8px 0 16px">${aviso}</p>
     <button class="btn full" style="background:var(--bad)" onclick="delComment(${id}, ${pid}, this)">Excluir definitivamente</button>`,
    'Excluir comentário'
  );
}

async function delComment(id, pid, btn) {
  /* o comentário + todas as respostas dele (cascata) */
  const ids = branch(id);

  const ok = await comEspera(btn, 'Excluindo…', async () => {
    if (!DEMO) await window.CivvoApi.excluirComentario(pid, id);

    let removidos = 0;
    for (let i = COMMENTS.length - 1; i >= 0; i--) {
      if (COMMENTS[i].post == pid && ids.has(COMMENTS[i].id)) {
        COMMENTS.splice(i, 1);
        removidos++;
      }
    }

    bump(POSTS.find((x) => x.id == pid), -removidos);
  });

  if (!ok) return;

  if (EDITING_COMMENT != null && ids.has(EDITING_COMMENT)) EDITING_COMMENT = null;
  if (RPL && ids.has(RPL.id)) RPL = null;
  closeModal();
  toast('Comentário excluído.');
  drawComments(pid);
}

/* ---- Denunciar comentário ---- */
const MOTIVOS_DEN = [
  'Spam ou propaganda',
  'Ofensa, assédio ou discurso de ódio',
  'Conteúdo impróprio',
  'Informação falsa',
  'Outro motivo',
];

function openReportComment(id, pid) {
  const opts = MOTIVOS_DEN.map(
    (m, i) => `<button type="button" class="chip ${i == 0 ? 'on' : ''}" aria-pressed="${i == 0}" onclick="setOpc('rcMot', '${m}', this)">${m}</button>`
  ).join('');
  openModal(
    `<h3 class="md-h">${lc('flag', 20)} Denunciar comentário</h3>
     <label class="md-l" style="margin-top:12px">${lc('circle-alert', 16)}<span>Qual é o motivo?</span></label>
     <input type="hidden" id="rcMot" value="${MOTIVOS_DEN[0]}">
     <div class="chips dk" style="margin:8px 0 4px">${opts}</div>
     <label for="rcDet" class="md-l">${lc('message-circle', 16)}<span>Detalhes (opcional)</span></label>
     <textarea id="rcDet" class="in" rows="3" maxlength="150" placeholder="Conte o que aconteceu"></textarea>
     <p class="dn-err" id="rcErr" role="alert"></p>
     <button class="btn full" onclick="sendReportComment(${id}, this)">${lc('flag', 16)} Enviar denúncia</button>`,
    'Denunciar'
  );
}

async function sendReportComment(id, btn) {
  const mot = $('#rcMot').value;
  const det = $('#rcDet').value.trim();
  const motivo = (det ? `${mot}: ${det}` : mot).slice(0, 225);

  const ok = await comEspera(btn, 'Enviando…', async () => {
    if (!DEMO) await window.CivvoApi.denunciarComentario(id, motivo);
  });

  if (!ok) return;

  closeModal();
  toast('Denúncia enviada. Obrigado por ajudar a manter a Civvo segura.');
}

async function carregarComentariosReais(pid) {
  if (DEMO) return;

  /* já há comentários na memória (vieram junto com o feed)? mostra na hora e atualiza em seguida */
  if (COMMENTS.some((c) => Number(c.post) === Number(pid))) drawComments(pid);

  try {
    const lista = await window.CivvoApi.listarComentariosPost(pid);
    substituirComentarios(pid, lista);
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
  let novo = null;

  const ok = await comEspera(btn, 'Enviando…', async () => {
    const r = DEMO ? null : await window.CivvoApi.comentarPost(pid, t, par);

    /* o back pode devolver só o id, ou a linha inteira do comentário: aceita os dois jeitos */
    const linha = r && (r.comment || r.comentario || r.data || r);
    const novoId = r ? r.commentId ?? linha.id ?? r.id ?? r.insertId ?? null : null;
    const autorId = DEMO ? null : linha?.user_id ?? window.__civvoSessao?.usuario?.id ?? null;

    novo = {
      id: novoId ?? 'tmp' + Date.now(),
      post: pid,
      parent: par,
      userId: autorId,
      user: w.user,
      nome: w.nome,
      avatar: imgOk(linha?.autor_avatar) || imgOk(w.avatar),
      h: w.h,
      text: t,
      editado: false,
      time: new Date().toLocaleDateString('pt-BR'),
      pendente: !DEMO && (novoId == null || autorId == null),
    };
    COMMENTS.push(novo);

    bump(POSTS.find((x) => x.id == pid), 1);
  });

  if (!ok) return;

  RPL = null;
  i.value = '';
  drawComments(pid);

  /* sem o id verdadeiro não dá para editar/excluir: busca a lista de novo para trocar pelo comentário real */
  if (novo && novo.pendente) carregarComentariosReais(pid);
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
      <div id="cmts">${nest(p.id) || '<p class="emp">Carregando comentários...</p>'}</div>
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