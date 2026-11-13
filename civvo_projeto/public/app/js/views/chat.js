/* Mensagens: lista de conversas + conversa aberta (#/chats e #/chats/:id).
   A tela é toda visual e só conversa com ChatBackend (data/chat-backend.js): em sessão real ele ainda não tem rotas,
   então aparece o aviso "em breve" e o envio fica desabilitado; no demo há conversas de exemplo.
   As atualizações (nova mensagem, busca, rascunho) mexem só no trecho da tela, sem redesenhar tudo, para não perder o que a pessoa está digitando. */

const CHAT = { carregando: false, carregou: false, erro: '', busca: '', perfil: null };
const CHAT_MSGS = {}; /* id da conversa → mensagens */
const CHAT_RASC = {}; /* id da conversa → rascunho */
let CHAT_CONTATOS = [];
let CHAT_REC = null; /* gravação de áudio em andamento */
let CHAT_PLAY = null; /* áudio tocando */
let CHAT_ENVIANDO = false;

/* ---------- utilitários ---------- */

const chatUrl = (u) => (/^(https:|blob:|data:image\/)/i.test(u || '') ? u : '');

const chatDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const chatHora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const chatMesmoDia = (a, b) => new Date(a).toDateString() == new Date(b).toDateString();

function chatRotuloDia(iso) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 864e5);
  if (d.toDateString() == hoje.toDateString()) return 'Hoje';
  if (d.toDateString() == ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR');
}

/* hora se for de hoje, "Ontem", dia da semana nos últimos 7 dias, senão dd/mm */
function chatDataLista(iso) {
  const d = new Date(iso);
  const dias = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 864e5);
  if (dias <= 0) return chatHora(iso);
  if (dias == 1) return 'Ontem';
  if (dias < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const chatTamanho = (b) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);

const chatNomeArquivo = (m) => m.nome || decodeURIComponent((m.midia_url || '').split('?')[0].split('/').pop() || '') || 'Arquivo';

const chatConv = (id) => CHATS.find((c) => c.id == id);

function chatPreview(m) {
  if (!m) return 'Nenhuma mensagem ainda';
  const t = { TEXT: m.texto, IMAGE: m.texto || 'Foto', VIDEO: 'Vídeo', AUDIO: `Áudio (${chatDur(m.audio_segundos)})`, FILE: chatNomeArquivo(m) }[m.tipo] || '';
  return (m.minha ? 'Você: ' : '') + t.replace(/\s+/g, ' ').slice(0, 70);
}

/* ---------- carregamento ---------- */

function chatReiniciarSeMudouPerfil() {
  if (CHAT.perfil === ROLE) return;
  CHAT.perfil = ROLE;
  CHAT.carregou = false;
  CHAT.erro = '';
  CHATS.length = 0;
  Object.keys(CHAT_MSGS).forEach((k) => delete CHAT_MSGS[k]);
}

function chatCarregar() {
  if (CHAT.carregando) return;
  CHAT.carregando = true;

  ChatBackend.listarConversas()
    .then((lista) => {
      CHATS.length = 0;
      CHATS.push(...lista);
      CHAT.erro = '';
    })
    .catch((e) => {
      if (e.name != 'ChatIndisponivel') {
        console.error('Falha ao carregar conversas:', e);
        CHAT.erro = 'Não foi possível carregar as conversas.';
      }
    })
    .finally(() => {
      CHAT.carregando = false;
      CHAT.carregou = true;
      if (rotaAtual() == 'chats') go();
    });
}

function chatCarregarMensagens(id) {
  if (CHAT_MSGS[id] || CHAT_MSGS['_c' + id]) return;
  CHAT_MSGS['_c' + id] = 1;

  ChatBackend.listarMensagens(id)
    .then((l) => {
      CHAT_MSGS[id] = l;
    })
    .catch((e) => {
      CHAT_MSGS[id] = [];
      if (e.name == 'ChatIndisponivel') return; /* sem back ainda: a caixa de envio já está desabilitada */
      console.error('Falha ao carregar mensagens:', e);
      toast('Não foi possível carregar as mensagens.');
    })
    .finally(() => {
      delete CHAT_MSGS['_c' + id];
      if (rotaAtual() == 'chats' && window.OPEN == id) go();
    });
}

function chatTentarDeNovo() {
  CHAT.carregou = false;
  CHAT.erro = '';
  go();
}

function chatMarcarLida(conv) {
  if (!conv.naoLidas) return;
  conv.naoLidas = 0;
  document.querySelector(`[data-conv="${conv.id}"] .chat-badge`)?.remove();
  ChatBackend.marcarLida(conv.id).catch(() => {});
}

/* ---------- peças da tela ---------- */

const chatAvatar = (p, s = 44) => av(p.nome, 0, s, chatUrl(p.avatar));

function chatItemHtml(c) {
  const nl = c.naoLidas ? `<span class="chat-badge" aria-label="${c.naoLidas} não lidas">${c.naoLidas > 99 ? '99+' : c.naoLidas}</span>` : '';

  return `
    <a class="chat-item ${window.OPEN == c.id ? 'on' : ''}" href="#/chats/${esc(c.id)}" data-conv="${esc(c.id)}" ${window.OPEN == c.id ? 'aria-current="page"' : ''}>
      ${chatAvatar(c.peer)}
      <span class="chat-item-c">
        <span class="chat-item-l"><b>${esc(c.peer.nome)}</b>${c.ultima ? `<time datetime="${esc(c.ultima.criada_em)}">${esc(chatDataLista(c.ultima.criada_em))}</time>` : ''}</span>
        <span class="chat-item-l"><span class="chat-prev ${c.naoLidas ? 'nl' : ''}">${esc(chatPreview(c.ultima))}</span>${nl}</span>
      </span>
    </a>`;
}

function chatItensHtml() {
  if (CHAT.erro) {
    return `<div class="emp" role="alert"><p>${esc(CHAT.erro)}</p><button class="btn sm" onclick="chatTentarDeNovo()">Tentar de novo</button></div>`;
  }

  if (!CHAT.carregou) {
    return Array.from({ length: 4 }, () => '<div class="chat-item"><div class="sk av" style="width:44px;height:44px"></div><div style="flex:1"><div class="sk" style="height:12px;width:55%;margin-bottom:8px"></div><div class="sk" style="height:10px;width:80%"></div></div></div>').join('');
  }

  const q = CHAT.busca.trim().toLowerCase();
  const lista = CHATS.filter((c) => !q || c.peer.nome.toLowerCase().includes(q));

  if (lista.length) return lista.map(chatItemHtml).join('');

  if (q) return '<div class="emp">Nenhuma conversa encontrada.</div>';

  const dica = !ChatBackend.disponivel
    ? 'O chat estará disponível em breve. Quando estiver pronto, suas conversas aparecem aqui.'
    : ROLE == 'ong'
      ? 'Quando um doador falar com você, a conversa aparece aqui.'
      : 'Converse com as ONGs que você apoia.';

  return `<div class="emp chat-emp">${ic('chat')}<p><b>Nenhuma conversa ainda</b></p><p>${dica}</p></div>`;
}

function chatMsgHtml(m) {
  const u = chatUrl(m.midia_url);
  let corpo = '';

  if (m.tipo == 'IMAGE') {
    corpo = (u ? `<img class="bub-img" src="${esc(u)}" alt="Imagem enviada" loading="lazy" onload="chatRolarFim()">` : '<div class="bub-img bub-sem">Imagem indisponível</div>') + (m.texto ? `<p>${esc(m.texto).replace(/\n/g, '<br>')}</p>` : '');
  } else if (m.tipo == 'VIDEO') {
    corpo = u ? `<video class="bub-img" src="${esc(u)}" controls preload="metadata" onloadedmetadata="chatRolarFim()"></video>` : '<div class="bub-img bub-sem">Vídeo indisponível</div>';
  } else if (m.tipo == 'AUDIO') {
    const barras = Array.from({ length: 28 }, (_, i) => `<i style="height:${30 + ((m.id * 7 + i * 13) % 11) * 6}%"></i>`).join('');
    corpo = `
      <div class="bub-aud">
        <button type="button" class="bub-play" onclick="chatTocar('${esc(m.id)}')" aria-label="Reproduzir áudio de ${chatDur(m.audio_segundos)}">${ic('play')}</button>
        <span class="bub-wave" aria-hidden="true">${barras}</span>
        <span class="bub-dur">${chatDur(m.audio_segundos)}</span>
      </div>`;
  } else if (m.tipo == 'FILE') {
    const dentro = `${ic('file')}<span><b>${esc(chatNomeArquivo(m))}</b><small>${esc(chatTamanho(m.tamanho))}</small></span>`;
    corpo = u && !u.startsWith('data:') ? `<a class="bub-file" href="${esc(u)}" target="_blank" rel="noopener" download>${dentro}</a>` : `<div class="bub-file">${dentro}</div>`;
  } else {
    corpo = `<p>${esc(m.texto).replace(/\n/g, '<br>')}</p>`;
  }

  const tick = m.minha ? `<span class="bub-tick" role="img" aria-label="${m.lida ? 'Lida' : 'Enviada'}">${ic(m.lida ? 'checks' : 'check')}</span>` : '';

  return `
    <div class="bub-w ${m.minha ? 'me' : ''}" id="m-${esc(m.id)}">
      <div class="bub ${m.minha ? 'me' : ''} t-${esc(String(m.tipo).toLowerCase())}">
        ${corpo}
        <span class="bub-meta"><time datetime="${esc(m.criada_em)}">${esc(chatHora(m.criada_em))}</time>${tick}</span>
      </div>
    </div>`;
}

const chatDiaHtml = (iso) => `<div class="chat-dia"><span>${esc(chatRotuloDia(iso))}</span></div>`;

function chatMensagensHtml(msgs) {
  if (!msgs.length) return '<div class="emp chat-emp"><p>Nenhuma mensagem ainda.</p><p>Escreva a primeira abaixo.</p></div>';

  return msgs
    .map((m, i) => (i == 0 || !chatMesmoDia(msgs[i - 1].criada_em, m.criada_em) ? chatDiaHtml(m.criada_em) : '') + chatMsgHtml(m))
    .join('');
}

function chatComposerHtml(id) {
  const off = ChatBackend.disponivel ? '' : 'disabled';
  const rasc = CHAT_RASC[id] || '';
  const tem = !!rasc.trim();

  return `
    <form class="chat-comp" onsubmit="chatEnviar(event, '${esc(id)}')" autocomplete="off">
      <input type="file" id="chatFile" hidden accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onchange="chatAnexar(this, '${esc(id)}')">
      <div class="chat-comp-n">
        <button type="button" class="chat-ib" aria-label="Anexar arquivo" onclick="$('#chatFile').click()" ${off}>${ic('clip')}</button>
        <textarea id="chatTxt" class="in" rows="1" maxlength="${CHAT_TEXTO_MAX}" aria-label="Mensagem"
          placeholder="${ChatBackend.disponivel ? 'Escreva uma mensagem' : 'Mensagens em breve'}"
          oninput="chatDigitou(this, '${esc(id)}')" onkeydown="chatTecla(event, '${esc(id)}')" ${off}>${esc(rasc)}</textarea>
        <button type="button" class="chat-ib" id="chatMic" aria-label="Gravar áudio" onclick="chatGravar('${esc(id)}')" ${off} ${tem ? 'hidden' : ''}>${ic('mic')}</button>
        <button type="submit" class="chat-ib chat-send" id="chatSend" aria-label="Enviar mensagem" ${off} ${tem ? '' : 'hidden'}>${ic('send')}</button>
      </div>
      <div class="chat-comp-g" role="group" aria-label="Gravando áudio">
        <button type="button" class="chat-ib" aria-label="Cancelar gravação" onclick="chatPararGravacao()">${ic('x')}</button>
        <span class="chat-rec-p" aria-hidden="true"></span>
        <span id="chatRecT" role="timer" aria-live="off">0:00 / ${chatDur(CHAT_AUDIO_MAX)}</span>
        <button type="button" class="chat-ib chat-send" aria-label="Enviar áudio" onclick="chatEnviarAudio()">${ic('send')}</button>
      </div>
    </form>`;
}

function chatThreadHtml(conv) {
  if (!conv) {
    return ChatBackend.disponivel
      ? `<div class="chat-vazio">${ic('chat')}<p><b>Suas mensagens</b></p><p>Escolha uma conversa para começar.</p></div>`
      : `<div class="chat-vazio">${ic('chat')}<p><b>Chat em breve</b></p><p>Aqui você vai conversar com ONGs e doadores.</p></div>`;
  }

  const msgs = CHAT_MSGS[conv.id];
  const rotulo = conv.peer.tipo == 'ONG' ? 'ONG' : 'Doador(a)';

  return `
    <header class="chat-th">
      <a class="chat-ib chat-voltar" href="#/chats" aria-label="Voltar para as conversas">${ic('back')}</a>
      ${chatAvatar(conv.peer, 40)}
      <div><h2>${esc(conv.peer.nome)}</h2><small>${rotulo}</small></div>
    </header>
    <div class="cm" id="chatMsgs" role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensagens com ${esc(conv.peer.nome)}" tabindex="0" data-cola="1" onscroll="chatRolou(this)">
      ${msgs ? chatMensagensHtml(msgs) : '<div class="emp" role="status">Carregando mensagens…</div>'}
    </div>
    ${chatComposerHtml(conv.id)}`;
}

/* ---------- tela ---------- */

V.chats = (a) => {
  chatPararGravacao();
  chatPararAudio();

  if (ROLE == 'admin') return V.nf();

  chatReiniciarSeMudouPerfil();
  if (!CHAT.carregou && !CHAT.carregando) chatCarregar();

  const conv = a ? chatConv(a) : null;
  window.OPEN = conv ? conv.id : 0;

  if (conv) {
    chatCarregarMensagens(conv.id);
    if (CHAT_MSGS[conv.id]) chatMarcarLida(conv);
  }

  /* abriu um endereço de conversa que não existe (ou ainda não carregou) */
  const naoAchou = a && !conv && CHAT.carregou;
  const aberta = !!conv || (a && !CHAT.carregou);

  const aviso = ChatBackend.disponivel
    ? ''
    : '<div class="chat-aviso" role="status">Prévia da tela: o chat será ativado quando o servidor estiver pronto.</div>';

  const thread = naoAchou
    ? '<div class="chat-vazio"><a class="chat-ib chat-voltar" href="#/chats" aria-label="Voltar para as conversas">' + ic('back') + '</a><p><b>Conversa não encontrada</b></p><p>Ela pode ter sido removida.</p></div>'
    : a && !conv
      ? '<div class="chat-vazio" role="status"><p>Carregando…</p></div>'
      : chatThreadHtml(conv);

  return shell(
    `<section class="chat ${aberta || naoAchou ? 'aberta' : ''}" aria-label="Mensagens">
       <div class="chat-lista">
         <div class="chat-lh">
           <h2>Mensagens</h2>
           <button class="btn light sm" onclick="chatNovaConversa()" ${ChatBackend.disponivel ? '' : 'disabled title="Em breve"'}>${ic('plus')} Nova</button>
         </div>
         <div class="chat-busca"><input class="in" id="chatBusca" type="search" placeholder="Buscar conversas" aria-label="Buscar conversas" value="${esc(CHAT.busca)}" oninput="chatBuscar(this.value)"></div>
         ${aviso}
         <nav class="chat-itens" id="chatItens" aria-label="Conversas">${chatItensHtml()}</nav>
       </div>
       <div class="chat-thread">${thread}</div>
     </section>`,
    'chats',
    { rightCol: 0, wide: 1 }
  );
};

/* ---------- ações ---------- */

function chatBuscar(v) {
  CHAT.busca = v;
  const e = $('#chatItens');
  if (e) e.innerHTML = chatItensHtml();
}

function chatAtualizarLista() {
  CHATS.sort((x, y) => new Date(y.ultima?.criada_em || 0) - new Date(x.ultima?.criada_em || 0));
  const e = $('#chatItens');
  if (e) e.innerHTML = chatItensHtml();
}

function chatDigitou(ta, id) {
  CHAT_RASC[id] = ta.value;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';

  const tem = !!ta.value.trim();
  const mic = $('#chatMic');
  const env = $('#chatSend');
  if (mic) mic.hidden = tem;
  if (env) env.hidden = !tem;
}

function chatTecla(ev, id) {
  if (ev.key == 'Enter' && !ev.shiftKey && !ev.isComposing) {
    ev.preventDefault();
    chatEnviar(ev, id);
  }
}

/* Mantém a conversa no fim enquanto a pessoa não rolou para cima (imagens e vídeos mudam a altura ao carregar). */
function chatRolou(box) {
  box.dataset.cola = box.scrollHeight - box.scrollTop - box.clientHeight < 80 ? '1' : '0';
}

function chatRolarFim() {
  const b = $('#chatMsgs');
  if (b && b.dataset.cola != '0') b.scrollTop = b.scrollHeight;
}

/* acrescenta uma mensagem à conversa aberta, sem redesenhar a tela */
function chatAcrescentar(id, m) {
  const msgs = CHAT_MSGS[id] || (CHAT_MSGS[id] = []);
  const ant = msgs[msgs.length - 2];
  const box = $('#chatMsgs');
  if (!box || window.OPEN != id) return;

  if (msgs.length == 1) box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', (!ant || !chatMesmoDia(ant.criada_em, m.criada_em) ? chatDiaHtml(m.criada_em) : '') + chatMsgHtml(m));
  box.scrollTop = box.scrollHeight;
}

async function chatEnviarMsg(id, payload) {
  if (CHAT_ENVIANDO) return false;
  CHAT_ENVIANDO = true;

  try {
    const m = await ChatBackend.enviar(id, payload);
    (CHAT_MSGS[id] ||= []).push(m);

    const conv = chatConv(id);
    if (conv) {
      conv.ultima = m;
      conv.naoLidas = 0;
    }
    chatAcrescentar(id, m);
    chatAtualizarLista();
    return true;
  } catch (e) {
    toast(e.name == 'ChatIndisponivel' || e.message ? e.message : 'Não foi possível enviar a mensagem.');
    return false;
  } finally {
    CHAT_ENVIANDO = false;
  }
}

async function chatEnviar(ev, id) {
  ev.preventDefault?.();

  const ta = $('#chatTxt');
  const t = (ta?.value || '').trim();
  if (!t) return;

  const ok = await chatEnviarMsg(id, { tipo: 'TEXT', texto: t });
  if (!ok) return; /* falhou: o texto continua na caixa */

  CHAT_RASC[id] = '';
  if (ta) {
    ta.value = '';
    chatDigitou(ta, id);
    ta.focus();
  }
}

async function chatAnexar(inp, id) {
  const f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;

  if (f.size > CHAT_ARQ_MAX) return toast(`O arquivo deve ter até ${Math.round(CHAT_ARQ_MAX / 1048576)} MB.`);

  const tipo = f.type.startsWith('image/') ? 'IMAGE' : f.type.startsWith('video/') ? 'VIDEO' : 'FILE';
  await chatEnviarMsg(id, { tipo, arquivo: f, nome: f.name, tamanho: f.size });
}

/* ---------- gravação de áudio (visual) ----------
   Hoje só conta o tempo e envia um áudio sem arquivo. Para gravar de verdade, inicie um MediaRecorder em chatGravar(),
   pare em chatEnviarAudio() e envie o Blob em `arquivo` (o ChatBackend decide como subir). */

function chatGravar(id) {
  if (CHAT_REC) return;
  $('.chat-comp')?.classList.add('gravando');

  const t0 = Date.now();
  CHAT_REC = { id, seg: 0, timer: null };
  CHAT_REC.timer = setInterval(() => {
    const s = Math.min(CHAT_AUDIO_MAX, Math.floor((Date.now() - t0) / 1000));
    CHAT_REC.seg = s;

    const e = $('#chatRecT');
    if (e) e.textContent = `${chatDur(s)} / ${chatDur(CHAT_AUDIO_MAX)}`;
    if (s >= CHAT_AUDIO_MAX) clearInterval(CHAT_REC.timer); /* no limite, para de contar e espera enviar ou cancelar */
  }, 250);
}

function chatPararGravacao() {
  if (!CHAT_REC) return;
  clearInterval(CHAT_REC.timer);
  CHAT_REC = null;

  document.querySelector('.chat-comp')?.classList.remove('gravando');
  const e = document.getElementById('chatRecT');
  if (e) e.textContent = `0:00 / ${chatDur(CHAT_AUDIO_MAX)}`;
}

async function chatEnviarAudio() {
  const r = CHAT_REC;
  if (!r) return;

  const seg = Math.max(1, r.seg);
  chatPararGravacao();
  await chatEnviarMsg(r.id, { tipo: 'AUDIO', audioSegundos: seg });
}

/* ---------- reprodução de áudio ---------- */

function chatProgresso(id, p) {
  const barras = document.querySelectorAll(`#m-${CSS.escape(String(id))} .bub-wave i`);
  const n = Math.round(p * barras.length);
  barras.forEach((b, i) => b.classList.toggle('on', i < n));
}

function chatIconeAudio(id, tocando) {
  const b = document.querySelector(`#m-${CSS.escape(String(id))} .bub-play`);
  if (!b) return;
  b.innerHTML = ic(tocando ? 'pause' : 'play');
  b.setAttribute('aria-label', tocando ? 'Pausar áudio' : 'Reproduzir áudio');
}

function chatPararAudio() {
  if (!CHAT_PLAY) return;
  const { id, timer, audio } = CHAT_PLAY;
  clearInterval(timer);
  audio?.pause();
  CHAT_PLAY = null;

  chatProgresso(id, 0);
  chatIconeAudio(id, false);
}

function chatTocar(id) {
  const tocando = CHAT_PLAY && CHAT_PLAY.id == id;
  chatPararAudio();
  if (tocando) return;

  const m = (CHAT_MSGS[window.OPEN] || []).find((x) => x.id == id);
  if (!m) return;

  const dur = m.audio_segundos || 1;
  const u = chatUrl(m.midia_url);
  CHAT_PLAY = { id };

  if (u) {
    const a = new Audio(u);
    CHAT_PLAY.audio = a;
    a.ontimeupdate = () => chatProgresso(id, a.currentTime / (a.duration || dur));
    a.onended = chatPararAudio;
    a.play().catch(() => {
      toast('Não foi possível reproduzir o áudio.');
      chatPararAudio();
    });
  } else {
    /* sem arquivo (exemplo): simula a reprodução para mostrar o visual */
    let t = 0;
    CHAT_PLAY.timer = setInterval(() => {
      t += 0.25;
      chatProgresso(id, t / dur);
      if (t >= dur) chatPararAudio();
    }, 250);
  }

  chatIconeAudio(id, true);
}

/* ---------- nova conversa ---------- */

async function chatNovaConversa() {
  openModal('<h3>Nova conversa</h3><div id="chatContatos" role="status">Carregando…</div>', 'Nova conversa');

  try {
    CHAT_CONTATOS = await ChatBackend.listarContatos();
  } catch (e) {
    CHAT_CONTATOS = [];
  }

  const box = $('#chatContatos');
  if (!box) return;

  box.removeAttribute('role');
  box.innerHTML =
    (ROLE == 'doador' ? '<p style="color:var(--mut);font-size:13px;margin:0 0 12px">Doadores conversam apenas com ONGs.</p>' : '') +
    (CHAT_CONTATOS.length
      ? CHAT_CONTATOS.map((p) => `<button class="chat-item" style="width:100%;border:0;background:none;text-align:left" onclick="chatNova('${esc(p.id)}')">${chatAvatar(p)}<span class="chat-item-c"><b>${esc(p.nome)}</b><small>${p.tipo == 'ONG' ? 'ONG' : 'Doador(a)'}</small></span></button>`).join('')
      : '<p class="emp">Nenhum contato disponível.</p>');
}

function chatNova(peerId) {
  const peer = CHAT_CONTATOS.find((p) => p.id == peerId);
  if (!peer) return;
  closeModal();

  if (!chatConv(peer.id)) {
    CHATS.unshift({ id: peer.id, peer, ultima: null, naoLidas: 0 });
    CHAT_MSGS[peer.id] = [];
  }
  location.hash = '#/chats/' + peer.id;
}
