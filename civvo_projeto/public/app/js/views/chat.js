/* Mensagens: lista de conversas + conversa aberta (#/chats e #/chats/:id).
   A tela só conversa com ChatBackend (data/chat-backend.js): em sessão real ele usa a API e o Socket.IO (tempo real);
   no demo há conversas de exemplo em memória.
   As atualizações (nova mensagem, busca, rascunho) mexem só no trecho da tela, sem redesenhar tudo, para não perder o que a pessoa está digitando. */

const CHAT = { carregando: false, carregou: false, erro: '', busca: '', perfil: null, online: true, novas: 0, offTimer: null };
const CHAT_MSGS = {}; /* id da conversa → mensagens */
const CHAT_RASC = {}; /* id da conversa → rascunho */
const CHAT_JAN = {}; /* id da conversa → quantas mensagens recentes estão na tela (o resto carrega sob demanda) */
const CHAT_JAN_PASSO = 50;
let CHAT_CONTATOS = [];
let CHAT_REC = null; /* gravação de áudio em andamento */
let CHAT_PLAY = null; /* áudio tocando */
let CHAT_VEL = 1; /* velocidade de reprodução dos áudios */
let CHAT_SEQ = 0;
let CHAT_PEND = null; /* anexo escolhido, aguardando confirmação */
let CHAT_BC = { q: '', ids: [], i: -1 }; /* busca dentro da conversa */
let CHAT_PREF = { fixadas: {}, silenciadas: {} }; /* preferências guardadas só neste navegador */

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
  if (m.status == 'erro') return 'Mensagem não enviada';
  const t = { TEXT: m.texto, IMAGE: m.texto || 'Foto', VIDEO: 'Vídeo', AUDIO: `Áudio (${chatDur(m.audio_segundos)})`, FILE: chatNomeArquivo(m) }[m.tipo] || '';
  return (m.minha ? 'Você: ' : '') + t.replace(/\s+/g, ' ').slice(0, 70);
}

/* texto da mensagem → HTML seguro, com links clicáveis (só http/https) e quebras de linha */
function chatTextoHtml(t) {
  const html = esc(t).replace(/https?:\/\/[^\s<]+/gi, (u) => {
    let fim = '';
    /* pontuação colada no fim do link não faz parte dele (mas o ";" de "&amp;" faz) */
    while (/[.,:!?)\]]$/.test(u) || (u.endsWith(';') && !/&(amp|lt|gt|quot|#39);$/.test(u))) {
      fim = u.slice(-1) + fim;
      u = u.slice(0, -1);
    }
    return `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u}</a>${fim}`;
  });
  return html.replace(/\n/g, '<br>');
}

/* ---------- preferências (fixar / silenciar) e rascunhos ---------- */

const chatChaveUsuario = () => chatMeuId() ?? 'demo-' + ROLE;

function chatPrefCarregar() {
  CHAT_PREF = { fixadas: {}, silenciadas: {} };
  try {
    const p = JSON.parse(localStorage.getItem('civvo.chat.pref.' + chatChaveUsuario()) || 'null');
    if (p) CHAT_PREF = { fixadas: p.fixadas || {}, silenciadas: p.silenciadas || {} };
  } catch (e) {
    /* armazenamento indisponível: segue sem guardar */
  }
}

function chatPrefSalvar() {
  try {
    localStorage.setItem('civvo.chat.pref.' + chatChaveUsuario(), JSON.stringify(CHAT_PREF));
  } catch (e) {
    /* sem armazenamento */
  }
}

const chatFixada = (id) => !!CHAT_PREF.fixadas[id];
const chatSilenciada = (id) => !!CHAT_PREF.silenciadas[id];

function chatRascCarregar() {
  try {
    Object.assign(CHAT_RASC, JSON.parse(sessionStorage.getItem('civvo.chat.rasc.' + chatChaveUsuario()) || '{}'));
  } catch (e) {
    /* ignora */
  }
}

function chatRascSalvar(id, v) {
  if (v) CHAT_RASC[id] = v;
  else delete CHAT_RASC[id];
  try {
    sessionStorage.setItem('civvo.chat.rasc.' + chatChaveUsuario(), JSON.stringify(CHAT_RASC));
  } catch (e) {
    /* ignora */
  }
}

function chatOrdenar() {
  CHATS.sort((x, y) => chatFixada(y.id) - chatFixada(x.id) || new Date(y.ultima?.criada_em || 0) - new Date(x.ultima?.criada_em || 0));
}

function chatAlternarPref(tipo, id) {
  const p = CHAT_PREF[tipo];
  if (p[id]) delete p[id];
  else p[id] = 1;
  chatPrefSalvar();

  const b = document.getElementById('chatPref-' + tipo);
  if (b) {
    const on = !!p[id];
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', tipo == 'fixadas' ? (on ? 'Desafixar conversa' : 'Fixar conversa no topo') : on ? 'Reativar avisos desta conversa' : 'Silenciar esta conversa');
  }

  toast({ fixadas: p[id] ? 'Conversa fixada no topo.' : 'Conversa desafixada.', silenciadas: p[id] ? 'Conversa silenciada.' : 'Avisos reativados.' }[tipo]);
  chatAtualizarLista();
  chatAtualizarBadge();
}

/* ---------- carregamento ---------- */

function chatReiniciarSeMudouPerfil() {
  if (CHAT.perfil === ROLE) return;
  CHAT.perfil = ROLE;
  CHAT.carregou = false;
  CHAT.erro = '';
  CHATS.length = 0;
  Object.keys(CHAT_MSGS).forEach((k) => delete CHAT_MSGS[k]);
  chatPrefCarregar();
  chatRascCarregar();
}

function chatCarregar() {
  if (CHAT.carregando) return;
  CHAT.carregando = true;

  ChatBackend.listarConversas()
    .then((lista) => {
      /* conversa recém-criada (ainda sem mensagens) pode não vir da lista: não a perde */
      const locais = CHATS.filter((c) => !c.ultima && !lista.some((x) => x.id == c.id));
      CHATS.length = 0;
      CHATS.push(...lista, ...locais);
      chatOrdenar();
      CHAT.erro = '';
      chatAtualizarBadge();
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
      else chatAtualizarBadge();
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
  chatAtualizarBadge();
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
        <span class="chat-item-l"><b>${esc(c.peer.nome)}</b><span class="chat-flags">${chatFixada(c.id) ? `<span role="img" aria-label="Fixada">${ic('pin')}</span>` : ''}${chatSilenciada(c.id) ? `<span role="img" aria-label="Silenciada">${ic('mute')}</span>` : ''}</span>${c.ultima ? `<time datetime="${esc(c.ultima.criada_em)}">${esc(chatDataLista(c.ultima.criada_em))}</time>` : ''}</span>
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
    : !temRecurso('chat')
      ? `Quando ${ROLE == 'ong' ? 'um doador' : 'uma ONG'} falar com você, a conversa aparece aqui e você pode responder. Para iniciar conversas, conheça o plano ${NOME_PLANO[PLANO_PAGO[ROLE]]}.`
      : ROLE == 'ong'
        ? 'Inicie uma conversa com um doador ou responda quem escrever.'
        : 'Converse com as ONGs que você apoia.';

  return `<div class="emp chat-emp">${ic('chat')}<p><b>Nenhuma conversa ainda</b></p><p>${dica}</p></div>`;
}

function chatMsgHtml(m) {
  const u = chatUrl(m.midia_url);
  let corpo = '';

  if (m.tipo == 'IMAGE') {
    corpo =
      (u
        ? `<button type="button" class="bub-zoom" onclick="chatZoom('${esc(m.id)}')" aria-label="Ampliar imagem"><img class="bub-img" src="${esc(u)}" alt="Imagem enviada" loading="lazy" onload="chatRolarFim()"></button>`
        : '<div class="bub-img bub-sem">Imagem indisponível</div>') + (m.texto ? `<p>${chatTextoHtml(m.texto)}</p>` : '');
  } else if (m.tipo == 'VIDEO') {
    corpo = u ? `<video class="bub-img" src="${esc(u)}" controls preload="metadata" onloadedmetadata="chatRolarFim()"></video>` : '<div class="bub-img bub-sem">Vídeo indisponível</div>';
  } else if (m.tipo == 'AUDIO') {
    const barras = Array.from({ length: 28 }, (_, i) => `<i style="height:${30 + ((String(m.id).length * 7 + i * 13 + (parseInt(m.id) || 0) * 7) % 11) * 6}%"></i>`).join('');
    corpo = `
      <div class="bub-aud">
        <button type="button" class="bub-play" onclick="chatTocar('${esc(m.id)}')" aria-label="Reproduzir áudio de ${chatDur(m.audio_segundos)}">${ic('play')}</button>
        <span class="bub-wave" aria-hidden="true" onclick="chatBuscarAudio(event, '${esc(m.id)}')">${barras}</span>
        <span class="bub-dur">${chatDur(m.audio_segundos)}</span>
        <button type="button" class="bub-vel" onclick="chatVelocidade()" aria-label="Velocidade de reprodução: ${CHAT_VEL}x">${CHAT_VEL}x</button>
      </div>`;
  } else if (m.tipo == 'FILE') {
    const dentro = `${ic('file')}<span><b>${esc(chatNomeArquivo(m))}</b><small>${esc(chatTamanho(m.tamanho))}</small></span>`;
    corpo = u && !u.startsWith('data:') && !u.startsWith('blob:') ? `<a class="bub-file" href="${esc(u)}" target="_blank" rel="noopener" download>${dentro}</a>` : `<div class="bub-file">${dentro}</div>`;
  } else {
    corpo = `<p>${chatTextoHtml(m.texto)}</p>`;
  }

  /* envio em andamento / falha (mensagem otimista) */
  const enviando = m.status == 'enviando';
  const falhou = m.status == 'erro';
  const barra =
    enviando && m._payload?.arquivo
      ? `<div class="bub-prog" role="progressbar" aria-label="Enviando arquivo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.progresso || 0}"><i style="width:${m.progresso || 0}%"></i></div>`
      : '';
  const erro = falhou
    ? `<div class="bub-erro" role="alert"><span>${esc(m.erro || 'Não enviada.')}</span><span class="bub-erro-bt"><button type="button" onclick="chatReenviar('${esc(m.clientId)}')">${ic('retry')} Tentar de novo</button><button type="button" onclick="chatDescartar('${esc(m.clientId)}')">Descartar</button></span></div>`
    : '';

  const estado = !m.minha ? '' : enviando ? ['clock', 'Enviando'] : falhou ? ['alert', 'Não enviada'] : m.lida ? ['checks', 'Lida'] : ['check', 'Enviada'];
  const tick = estado ? `<span class="bub-tick" role="img" aria-label="${estado[1]}">${ic(estado[0])}</span>` : '';

  return `
    <div class="bub-w ${m.minha ? 'me' : ''}" id="m-${esc(m.id)}">
      <div class="bub ${m.minha ? 'me' : ''} t-${esc(String(m.tipo).toLowerCase())} ${enviando ? 'env' : ''} ${falhou ? 'erro' : ''}">
        ${corpo}
        ${barra}
        <span class="bub-meta"><time datetime="${esc(m.criada_em)}">${esc(chatHora(m.criada_em))}</time>${tick}</span>
        ${erro}
      </div>
    </div>`;
}

const chatDiaHtml = (iso) => `<div class="chat-dia"><span>${esc(chatRotuloDia(iso))}</span></div>`;

/* mostra só as mensagens mais recentes (CHAT_JAN); as anteriores entram por "Ver mensagens anteriores" */
function chatMensagensHtml(msgs, id) {
  if (!msgs.length) return '<div class="emp chat-emp"><p>Nenhuma mensagem ainda.</p><p>Escreva a primeira abaixo.</p></div>';

  const ini = Math.max(0, msgs.length - (CHAT_JAN[id] || CHAT_JAN_PASSO));
  const vis = msgs.slice(ini);

  const mais = ini > 0 ? `<button type="button" class="chat-mais" onclick="chatMaisAntigas('${esc(id)}')">Ver mensagens anteriores (${ini})</button>` : '';

  return mais + vis.map((m, i) => (i == 0 || !chatMesmoDia(vis[i - 1].criada_em, m.criada_em) ? chatDiaHtml(m.criada_em) : '') + chatMsgHtml(m)).join('');
}

const chatBloqueado = () => !ChatBackend.disponivel || !CHAT.online;

function chatComposerHtml(id) {
  const off = ChatBackend.disponivel ? '' : 'disabled';
  const bloq = chatBloqueado() ? 'disabled' : '';
  const rasc = CHAT_RASC[id] || '';
  const tem = !!rasc.trim();
  const perto = rasc.length >= CHAT_TEXTO_MAX * 0.9;

  return `
    <form class="chat-comp" onsubmit="chatEnviar(event, '${esc(id)}')" autocomplete="off">
      <input type="file" id="chatFile" hidden accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onchange="chatAnexar(this, '${esc(id)}')">
      <span class="chat-cnt ${rasc.length >= CHAT_TEXTO_MAX ? 'lim' : ''}" id="chatCnt" aria-live="polite" ${perto ? '' : 'hidden'}>${rasc.length}/${CHAT_TEXTO_MAX}</span>
      <div class="chat-comp-n">
        <button type="button" class="chat-ib" data-env aria-label="Anexar arquivo" onclick="$('#chatFile').click()" ${off} ${bloq}>${ic('clip')}</button>
        <textarea id="chatTxt" class="in" rows="1" maxlength="${CHAT_TEXTO_MAX}" aria-label="Mensagem"
          placeholder="${ChatBackend.disponivel ? 'Escreva uma mensagem' : 'Mensagens em breve'}"
          oninput="chatDigitou(this, '${esc(id)}')" onkeydown="chatTecla(event, '${esc(id)}')" ${off}>${esc(rasc)}</textarea>
        <button type="button" class="chat-ib" data-env id="chatMic" aria-label="Gravar áudio" onclick="chatGravar('${esc(id)}')" ${off} ${bloq} ${tem ? 'hidden' : ''}>${ic('mic')}</button>
        <button type="submit" class="chat-ib chat-send" data-env id="chatSend" aria-label="Enviar mensagem" ${off} ${bloq} ${tem ? '' : 'hidden'}>${ic('send')}</button>
      </div>
      <div class="chat-comp-g" role="group" aria-label="Gravando áudio">
        <button type="button" class="chat-ib" aria-label="Cancelar gravação" onclick="chatPararGravacao()">${ic('x')}</button>
        <span class="chat-rec-p" aria-hidden="true"></span>
        <span id="chatRecT" role="timer" aria-live="off">0:00 / ${chatDur(CHAT_AUDIO_MAX)}</span>
        <button type="button" class="chat-ib chat-send" data-env aria-label="Enviar áudio" onclick="chatEnviarAudio()" ${bloq}>${ic('send')}</button>
      </div>
    </form>`;
}

const chatAvisoConexao = () => `<div class="chat-conn" role="status" aria-live="polite" ${CHAT.online ? 'hidden' : ''}>${ic('alert')}<span>Sem conexão. Reconectando…</span></div>`;

function chatPrefBtn(tipo, id) {
  const on = tipo == 'fixadas' ? chatFixada(id) : chatSilenciada(id);
  const rot = tipo == 'fixadas' ? (on ? 'Desafixar conversa' : 'Fixar conversa no topo') : on ? 'Reativar avisos desta conversa' : 'Silenciar esta conversa';
  return `<button type="button" class="chat-ib ${on ? 'on' : ''}" id="chatPref-${tipo}" aria-pressed="${on}" aria-label="${rot}" onclick="chatAlternarPref('${tipo}', '${esc(id)}')">${ic(tipo == 'fixadas' ? 'pin' : 'mute')}</button>`;
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
      <div class="chat-th-t"><h2>${esc(conv.peer.nome)}</h2><small>${rotulo}</small></div>
      <div class="chat-th-a">
        <button type="button" class="chat-ib" aria-label="Buscar nesta conversa" onclick="chatBcAbrir()">${ic('search')}</button>
        ${chatPrefBtn('fixadas', conv.id)}
        ${chatPrefBtn('silenciadas', conv.id)}
      </div>
    </header>
    ${chatAvisoConexao()}
    <div class="chat-bc" id="chatBc" role="search" hidden>
      <input class="in" id="chatBcIn" type="search" placeholder="Buscar nesta conversa" aria-label="Buscar nesta conversa" oninput="chatBuscarConv(this.value)" onkeydown="chatBcTecla(event)">
      <span id="chatBcN" aria-live="polite"></span>
      <button type="button" class="chat-ib" aria-label="Resultado anterior" onclick="chatBcNav(-1)">${ic('up')}</button>
      <button type="button" class="chat-ib" aria-label="Próximo resultado" onclick="chatBcNav(1)">${ic('down')}</button>
      <button type="button" class="chat-ib" aria-label="Fechar busca" onclick="chatBcFechar()">${ic('x')}</button>
    </div>
    <div class="cm-w">
      <div class="cm" id="chatMsgs" role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensagens com ${esc(conv.peer.nome)}" tabindex="0" data-cola="1" onscroll="chatRolou(this)">
        ${msgs ? chatMensagensHtml(msgs, conv.id) : '<div class="emp" role="status">Carregando mensagens…</div>'}
      </div>
      <button type="button" class="chat-down" id="chatDown" onclick="chatIrFim()" hidden></button>
    </div>
    ${chatComposerHtml(conv.id)}`;
}

/* ---------- tela ---------- */

V.chats = (a) => {
  chatPararGravacao();
  chatPararAudio();
  CHAT_BC = { q: '', ids: [], i: -1 };
  CHAT.novas = 0;

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

  setTimeout(() => chatPosRender(conv ? conv.id : 0), 0);

  return shell(
    `<section class="chat ${aberta || naoAchou ? 'aberta' : ''}" aria-label="Mensagens">
       <div class="chat-lista">
         <div class="chat-lh">
           <h2>Mensagens</h2>
           <button class="btn light sm" onclick="chatNovaConversa()" ${ChatBackend.disponivel ? '' : 'disabled title="Em breve"'}>${ic('plus')} Nova</button>
         </div>
         <div class="chat-busca"><input class="in" id="chatBusca" type="search" placeholder="Buscar conversas" aria-label="Buscar conversas" value="${esc(CHAT.busca)}" oninput="chatBuscar(this.value)"></div>
         ${chatAvisoConexao()}
         <div id="chatNotif">${chatNotifHtml()}</div>
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
  chatOrdenar();
  const e = $('#chatItens');
  if (e) e.innerHTML = chatItensHtml();
}

/* depois que a tela é desenhada: foco, rolagem, aviso de conexão e título */
function chatPosRender(id) {
  chatAplicarConexao();
  chatAtualizarTitulo();

  const ta = $('#chatTxt');
  if (!id || !ta) return;

  if (ta.value) chatDigitou(ta, id);

  /* no computador, já deixa o cursor na caixa; no celular não, para não abrir o teclado sozinho */
  const foco = document.activeElement;
  if (innerWidth > 760 && !ta.disabled && (!foco || foco === document.body || foco.closest?.('.chat-lista'))) {
    ta.focus({ preventScroll: true });
  }
}

/* ---- conexão ---- */

function chatAplicarConexao() {
  document.querySelectorAll('.chat-conn').forEach((e) => (e.hidden = CHAT.online));
  document.querySelectorAll('.chat-comp [data-env]').forEach((b) => (b.disabled = chatBloqueado()));
}

/* ok=false só vira "sem conexão" depois de alguns segundos (evita piscar numa queda rápida) */
function chatDefinirConexao(ok, imediato) {
  clearTimeout(CHAT.offTimer);

  if (ok) {
    CHAT.online = true;
    chatAplicarConexao();
    return;
  }

  const cair = () => {
    CHAT.online = false;
    chatAplicarConexao();
  };
  if (imediato) cair();
  else CHAT.offTimer = setTimeout(cair, 2500);
}

function chatPodeEnviar() {
  if (!ChatBackend.disponivel) return false;
  if (!CHAT.online) {
    toast('Sem conexão. Aguarde a reconexão para enviar.');
    return false;
  }
  return true;
}

/* ---- caixa de texto ---- */

function chatDigitou(ta, id) {
  chatRascSalvar(id, ta.value);
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';

  const tem = !!ta.value.trim();
  const mic = $('#chatMic');
  const env = $('#chatSend');
  if (mic) mic.hidden = tem;
  if (env) env.hidden = !tem;

  /* contador só aparece perto do limite */
  const n = ta.value.length;
  const c = $('#chatCnt');
  if (c) {
    c.hidden = n < CHAT_TEXTO_MAX * 0.9;
    c.textContent = `${n}/${CHAT_TEXTO_MAX}`;
    c.classList.toggle('lim', n >= CHAT_TEXTO_MAX);
  }
}

function chatTecla(ev, id) {
  if (ev.key == 'Enter' && !ev.shiftKey && !ev.isComposing) {
    ev.preventDefault();
    chatEnviar(ev, id);
  }
}

/* ---- rolagem ---- */

/* Mantém a conversa no fim enquanto a pessoa não rolou para cima (imagens e vídeos mudam a altura ao carregar). */
function chatRolou(box) {
  const dist = box.scrollHeight - box.scrollTop - box.clientHeight;
  box.dataset.cola = dist < 80 ? '1' : '0';
  if (dist < 80) CHAT.novas = 0;
  chatAtualizarBtnFim(dist);
}

function chatRolarFim() {
  const b = $('#chatMsgs');
  if (b && b.dataset.cola != '0') b.scrollTop = b.scrollHeight;
}

/* botão "↓" (com o número de mensagens novas, se houver) quando a pessoa está lendo mensagens antigas */
function chatAtualizarBtnFim(dist) {
  const b = $('#chatDown');
  const box = $('#chatMsgs');
  if (!b || !box) return;

  if (dist == null) dist = box.scrollHeight - box.scrollTop - box.clientHeight;
  const n = CHAT.novas;

  b.hidden = !(dist > 200 || (n > 0 && dist >= 80));
  b.innerHTML = n > 0 ? `${ic('down')}<span>${n} nova${n > 1 ? 's' : ''}</span>` : ic('down');
  b.setAttribute('aria-label', n > 0 ? `Ir para o fim: ${n} mensagem${n > 1 ? 's' : ''} nova${n > 1 ? 's' : ''}` : 'Ir para o fim da conversa');
}

function chatIrFim() {
  const b = $('#chatMsgs');
  if (!b) return;
  CHAT.novas = 0;
  b.dataset.cola = '1';
  b.scrollTo({ top: b.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  chatAtualizarBtnFim(0);
}

/* redesenha só a lista de mensagens da conversa aberta */
function chatRedesenharMensagens(id, manterPosicao) {
  const box = $('#chatMsgs');
  if (!box || window.OPEN != id) return;

  const h = box.scrollHeight;
  const t = box.scrollTop;
  const cola = box.dataset.cola != '0';

  box.innerHTML = chatMensagensHtml(CHAT_MSGS[id] || [], id);

  if (manterPosicao) box.scrollTop = t + (box.scrollHeight - h);
  else if (cola) box.scrollTop = box.scrollHeight;
  chatAtualizarBtnFim();
}

function chatMaisAntigas(id) {
  CHAT_JAN[id] = (CHAT_JAN[id] || CHAT_JAN_PASSO) + CHAT_JAN_PASSO;
  const box = $('#chatMsgs');
  if (box) box.dataset.cola = '0';
  chatRedesenharMensagens(id, true);
}

/* acrescenta uma mensagem à conversa aberta, sem redesenhar a tela */
function chatAcrescentar(id, m) {
  const msgs = CHAT_MSGS[id] || (CHAT_MSGS[id] = []);
  const ant = msgs[msgs.length - 2];
  const box = $('#chatMsgs');
  if (!box || window.OPEN != id) return;

  /* se a pessoa está lendo mensagens antigas, não puxa a tela para baixo */
  const noFim = box.dataset.cola != '0' || m.minha;

  if (msgs.length == 1) box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', (!ant || !chatMesmoDia(ant.criada_em, m.criada_em) ? chatDiaHtml(m.criada_em) : '') + chatMsgHtml(m));

  if (noFim) {
    box.scrollTop = box.scrollHeight;
    CHAT.novas = 0;
  } else if (!m.minha) {
    CHAT.novas++;
  }
  chatAtualizarBtnFim();
}

/* troca uma mensagem já desenhada (ex.: "enviando" → enviada) sem mexer nas outras */
function chatRefazerMsg(m) {
  const el = document.getElementById('m-' + m.id);
  if (el) el.outerHTML = chatMsgHtml(m);
}

/* ---- ampliar imagem ---- */

let CHAT_ZOOM_FOCO = null;

function chatZoom(id) {
  const m = (CHAT_MSGS[window.OPEN] || []).find((x) => x.id == id);
  const u = m && chatUrl(m.midia_url);
  if (!u) return;

  chatFecharZoom();
  CHAT_ZOOM_FOCO = document.activeElement;

  const d = document.createElement('div');
  d.id = 'chatZoom';
  d.className = 'chat-zoom';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', 'Imagem ampliada');
  d.innerHTML = `<button type="button" class="chat-zoom-x" aria-label="Fechar imagem" onclick="chatFecharZoom()">${ic('x')}</button><img src="${esc(u)}" alt="${esc(m.texto || 'Imagem enviada')}">`;
  d.onclick = (e) => {
    if (e.target.tagName != 'IMG') chatFecharZoom();
  };

  document.body.appendChild(d);
  d.querySelector('button').focus();
}

function chatFecharZoom() {
  const d = document.getElementById('chatZoom');
  if (!d) return;
  d.remove();
  CHAT_ZOOM_FOCO?.focus?.();
  CHAT_ZOOM_FOCO = null;
}

addEventListener(
  'keydown',
  (e) => {
    if (!document.getElementById('chatZoom')) return;
    if (e.key == 'Escape') {
      e.stopImmediatePropagation();
      chatFecharZoom();
    } else if (e.key == 'Tab') {
      e.preventDefault(); /* só há um botão: mantém o foco dentro */
    }
  },
  true
);

/* ---- busca dentro da conversa ---- */

function chatBcAbrir() {
  const b = $('#chatBc');
  if (!b) return;
  b.hidden = false;
  $('#chatBcIn')?.focus();
}

function chatBcLimpar() {
  document.querySelectorAll('.bub.achado').forEach((e) => e.classList.remove('achado'));
}

function chatBcFechar() {
  const b = $('#chatBc');
  if (b) b.hidden = true;
  const i = $('#chatBcIn');
  if (i) i.value = '';
  CHAT_BC = { q: '', ids: [], i: -1 };
  chatBcLimpar();
  $('#chatTxt')?.focus();
}

function chatBcTecla(ev) {
  if (ev.key == 'Enter') {
    ev.preventDefault();
    chatBcNav(ev.shiftKey ? -1 : 1);
  } else if (ev.key == 'Escape') {
    ev.stopPropagation();
    chatBcFechar();
  }
}

function chatBuscarConv(q) {
  q = q.trim().toLowerCase();
  const msgs = CHAT_MSGS[window.OPEN] || [];

  CHAT_BC.q = q;
  CHAT_BC.ids = q ? msgs.filter((m) => (m.texto || '').toLowerCase().includes(q) || (m.tipo == 'FILE' && chatNomeArquivo(m).toLowerCase().includes(q))).map((m) => m.id) : [];
  CHAT_BC.i = CHAT_BC.ids.length - 1; /* começa pelo resultado mais recente */

  chatBcLimpar();
  chatBcIr();
}

function chatBcNav(d) {
  const n = CHAT_BC.ids.length;
  if (!n) return;
  CHAT_BC.i = (CHAT_BC.i + d + n) % n;
  chatBcIr();
}

function chatBcIr() {
  const n = CHAT_BC.ids.length;
  const e = $('#chatBcN');
  if (e) e.textContent = !CHAT_BC.q ? '' : n ? `${CHAT_BC.i + 1} de ${n}` : 'Nada encontrado';
  if (!n) return;

  const mid = CHAT_BC.ids[CHAT_BC.i];
  const id = window.OPEN;
  const msgs = CHAT_MSGS[id] || [];
  const idx = msgs.findIndex((x) => x.id == mid);
  if (idx < 0) return;

  /* resultado antigo, fora da janela de mensagens exibidas: amplia a janela até ele */
  if (msgs.length - idx > (CHAT_JAN[id] || CHAT_JAN_PASSO)) {
    CHAT_JAN[id] = msgs.length - idx + 10;
    chatRedesenharMensagens(id, true);
  }

  const box = $('#chatMsgs');
  if (box) box.dataset.cola = '0';

  chatBcLimpar();
  const el = document.getElementById('m-' + mid);
  if (!el) return;
  el.querySelector('.bub')?.classList.add('achado');
  el.scrollIntoView({ block: 'center' });
}

/* ---- envio (a mensagem aparece na hora; o servidor confirma depois) ---- */

function chatNovaTemp(payload) {
  const cid = `c${Date.now().toString(36)}${++CHAT_SEQ}`;
  return {
    id: 'tmp-' + cid,
    clientId: cid,
    tipo: payload.tipo,
    texto: payload.texto || '',
    midia_url: payload.arquivo ? URL.createObjectURL(payload.arquivo) : '',
    audio_segundos: payload.audioSegundos || 0,
    nome: payload.nome || '',
    tamanho: payload.tamanho || 0,
    lida: false,
    criada_em: new Date().toISOString(),
    minha: true,
    status: 'enviando',
    progresso: 0,
    _payload: payload,
  };
}

function chatProgressoEnvio(m, p) {
  m.progresso = p;
  const b = document.querySelector(`#m-${CSS.escape(String(m.id))} .bub-prog`);
  if (!b) return;
  b.setAttribute('aria-valuenow', p);
  b.firstElementChild.style.width = p + '%';
}

async function chatEnviarMsg(id, payload, tmp) {
  const conv = chatConv(id);

  if (!tmp) {
    tmp = chatNovaTemp(payload);
    (CHAT_MSGS[id] ||= []).push(tmp);
    chatAcrescentar(id, tmp);
    if (conv) conv.ultima = tmp;
    chatAtualizarLista();
  } else {
    tmp.status = 'enviando';
    tmp.progresso = 0;
    tmp.erro = '';
    chatRefazerMsg(tmp);
  }

  try {
    const m = await ChatBackend.enviar(id, { ...payload, clientId: tmp.clientId, onProgress: (p) => chatProgressoEnvio(tmp, p) });
    const real = { ...m, clientId: tmp.clientId };
    const lista = CHAT_MSGS[id] || (CHAT_MSGS[id] = []);
    const i = lista.findIndex((x) => x.clientId == tmp.clientId);

    if (lista.some((x) => x.id == m.id && x !== lista[i])) {
      /* o servidor já avisou dessa mensagem pelo tempo real: só remove a provisória */
      if (i >= 0) lista.splice(i, 1);
      document.getElementById('m-' + tmp.id)?.remove();
    } else if (i >= 0) {
      lista[i] = real;
      const el = document.getElementById('m-' + tmp.id);
      if (el) el.outerHTML = chatMsgHtml(real);
    } else {
      lista.push(real);
      chatAcrescentar(id, real);
    }

    if (tmp.midia_url.startsWith('blob:') && !(CHAT_PLAY && CHAT_PLAY.id == tmp.id)) URL.revokeObjectURL(tmp.midia_url);

    if (conv) {
      conv.ultima = real;
      conv.naoLidas = 0;
    }
    chatAtualizarLista();
    return true;
  } catch (e) {
    tmp.status = 'erro';
    tmp.erro = e.message || 'Não foi possível enviar a mensagem.';
    chatRefazerMsg(tmp);
    chatAtualizarLista();
    return false;
  }
}

function chatReenviar(cid) {
  const id = window.OPEN;
  const m = (CHAT_MSGS[id] || []).find((x) => x.clientId == cid);
  if (!m || m.status == 'enviando' || !chatPodeEnviar()) return;
  chatEnviarMsg(id, m._payload, m);
}

function chatDescartar(cid) {
  const id = window.OPEN;
  const lista = CHAT_MSGS[id] || [];
  const i = lista.findIndex((x) => x.clientId == cid && x.status == 'erro');
  if (i < 0) return;

  const [m] = lista.splice(i, 1);
  if (m.midia_url.startsWith('blob:')) URL.revokeObjectURL(m.midia_url);
  document.getElementById('m-' + m.id)?.remove();

  const conv = chatConv(id);
  if (conv) conv.ultima = lista[lista.length - 1] || null;
  chatAtualizarLista();
}

async function chatEnviar(ev, id) {
  ev.preventDefault?.();
  if (!chatPodeEnviar()) return;

  const ta = $('#chatTxt');
  const t = (ta?.value || '').trim();
  if (!t) return;

  /* limpa a caixa já: se o envio falhar, a mensagem fica na conversa com "Tentar de novo" */
  if (ta) {
    ta.value = '';
    chatDigitou(ta, id);
    ta.focus();
  }

  chatEnviarMsg(id, { tipo: 'TEXT', texto: t });
}

/* ---- anexos: prévia antes de enviar; imagens grandes são reduzidas no navegador ---- */

async function chatComprimirImagem(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return f; /* gif/svg e outros: segue como está */

  try {
    const bmp = await createImageBitmap(f);
    const fator = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (fator == 1 && f.size < 1.2 * 1048576) {
      bmp.close?.();
      return f;
    }

    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * fator);
    c.height = Math.round(bmp.height * fator);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; /* png com transparência vira fundo branco */
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();

    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (e) {
    return f;
  }
}

async function chatAnexar(inp, id) {
  const f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;
  if (!chatPodeEnviar()) return;

  if (f.size > CHAT_ARQ_MAX) return toast(`O arquivo deve ter até ${Math.round(CHAT_ARQ_MAX / 1048576)} MB.`);

  const tipo = f.type.startsWith('image/') ? 'IMAGE' : f.type.startsWith('video/') ? 'VIDEO' : 'FILE';
  const arq = tipo == 'IMAGE' ? await chatComprimirImagem(f) : f;

  chatCancelarAnexo(false);
  CHAT_PEND = { id, tipo, arq, nome: arq.name || f.name, url: URL.createObjectURL(arq) };

  const prev =
    tipo == 'IMAGE'
      ? `<img src="${esc(CHAT_PEND.url)}" alt="Prévia da imagem">`
      : tipo == 'VIDEO'
        ? `<video src="${esc(CHAT_PEND.url)}" controls preload="metadata"></video>`
        : `<div class="bub-file">${ic('file')}<span><b>${esc(CHAT_PEND.nome)}</b><small>${esc(chatTamanho(arq.size))}</small></span></div>`;

  openModal(
    `<h3>Enviar ${tipo == 'IMAGE' ? 'imagem' : tipo == 'VIDEO' ? 'vídeo' : 'arquivo'}</h3>
     <div class="chat-pv">${prev}</div>
     ${tipo == 'IMAGE' ? `<textarea id="chatLeg" class="in" rows="2" maxlength="500" aria-label="Legenda (opcional)" placeholder="Adicionar legenda (opcional)"></textarea>` : ''}
     <div class="chat-pv-bt"><button type="button" class="btn light" onclick="chatCancelarAnexo(true)">Cancelar</button><button type="button" class="btn" onclick="chatConfirmarAnexo()">Enviar</button></div>`,
    'Enviar arquivo'
  );
}

function chatCancelarAnexo(fechar = true) {
  if (CHAT_PEND?.url) URL.revokeObjectURL(CHAT_PEND.url);
  CHAT_PEND = null;
  if (fechar) closeModal();
}

function chatConfirmarAnexo() {
  const p = CHAT_PEND;
  if (!p) return;

  const legenda = ($('#chatLeg')?.value || '').trim();
  CHAT_PEND = null;
  URL.revokeObjectURL(p.url);
  closeModal();

  if (!chatPodeEnviar()) return;
  chatEnviarMsg(p.id, { tipo: p.tipo, texto: legenda, arquivo: p.arq, nome: p.nome, tamanho: p.arq.size });
}

/* ---------- gravação de áudio ----------
   Sessão real: grava com o microfone (MediaRecorder) e envia o arquivo. Demo: só conta o tempo e envia um áudio de exemplo. */

async function chatGravar(id) {
  if (CHAT_REC) return;

  let stream = null;
  let rec = null;
  let pronto = null;

  if (!DEMO) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder == 'undefined') {
      return toast('Seu navegador não permite gravar áudio.');
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      return toast('Permita o acesso ao microfone para gravar áudio.');
    }

    const partes = [];
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported?.(t));
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data && e.data.size && partes.push(e.data);
    pronto = new Promise((ok) => {
      rec.onstop = () => ok(new Blob(partes, { type: rec.mimeType || 'audio/webm' }));
    });
    rec.start();
  }

  $('.chat-comp')?.classList.add('gravando');

  const t0 = Date.now();
  CHAT_REC = { id, seg: 0, timer: null, rec, stream, pronto };
  const r = CHAT_REC;

  r.timer = setInterval(() => {
    const s = Math.min(CHAT_AUDIO_MAX, Math.floor((Date.now() - t0) / 1000));
    r.seg = s;

    const e = $('#chatRecT');
    if (e) e.textContent = `${chatDur(s)} / ${chatDur(CHAT_AUDIO_MAX)}`;

    if (s >= CHAT_AUDIO_MAX) {
      /* no limite, para de gravar e espera enviar ou cancelar */
      clearInterval(r.timer);
      if (r.rec && r.rec.state == 'recording') r.rec.stop();
    }
  }, 250);
}

/* cancela a gravação (descarta o áudio) */
function chatPararGravacao() {
  if (!CHAT_REC) return;
  const { timer, rec, stream } = CHAT_REC;
  clearInterval(timer);
  CHAT_REC = null;

  if (rec && rec.state != 'inactive') {
    rec.onstop = null;
    try {
      rec.stop();
    } catch (e) {
      /* já parou */
    }
  }
  stream?.getTracks().forEach((t) => t.stop());

  document.querySelector('.chat-comp')?.classList.remove('gravando');
  const e = document.getElementById('chatRecT');
  if (e) e.textContent = `0:00 / ${chatDur(CHAT_AUDIO_MAX)}`;
}

async function chatEnviarAudio() {
  const r = CHAT_REC;
  if (!r) return;

  const seg = Math.max(1, r.seg);
  let payload = { tipo: 'AUDIO', audioSegundos: seg };

  if (r.rec) {
    if (r.rec.state != 'inactive') r.rec.stop();
    const blob = await r.pronto;
    if (!blob.size) {
      chatPararGravacao();
      return toast('Não foi possível gravar o áudio.');
    }
    const ext = /mp4|aac/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    payload = { ...payload, arquivo: blob, nome: `audio-${Date.now()}.${ext}`, tamanho: blob.size };
  }

  chatPararGravacao();
  await chatEnviarMsg(r.id, payload);
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
  CHAT_PLAY = null;
  if (audio) {
    audio.onerror = null;
    audio.pause();
  }

  chatProgresso(id, 0);
  chatIconeAudio(id, false);
}

/* Endereços para tentar, em ordem. O Chrome grava em webm, que o Safari mais antigo não toca:
   para áudios no Cloudinary, a mesma URL com final ".mp3" é convertida na hora pelo próprio Cloudinary. */
function chatUrlsAudio(u) {
  const mp3 = /res\.cloudinary\.com\/.+\/video\/upload\//.test(u) ? u.replace(/\.[a-z0-9]{2,4}(\?.*)?$/i, '.mp3') : '';
  const ehWebm = /\.(webm|ogg)(\?|$)/i.test(u);
  const toca = !!document.createElement('audio').canPlayType('audio/webm; codecs=opus');

  const lista = mp3 && ehWebm && !toca ? [mp3, u] : [u, ...(mp3 && mp3 != u ? [mp3] : [])];
  return lista;
}

function chatVelocidade() {
  CHAT_VEL = { 1: 1.5, 1.5: 2, 2: 1 }[CHAT_VEL] || 1;
  document.querySelectorAll('.bub-vel').forEach((b) => {
    b.textContent = CHAT_VEL + 'x';
    b.setAttribute('aria-label', `Velocidade de reprodução: ${CHAT_VEL}x`);
  });
  if (CHAT_PLAY?.audio) CHAT_PLAY.audio.playbackRate = CHAT_VEL;
}

/* clicar na onda leva o áudio que está tocando para aquele ponto */
function chatBuscarAudio(ev, id) {
  if (!CHAT_PLAY || CHAT_PLAY.id != id || !CHAT_PLAY.audio) return;
  const a = CHAT_PLAY.audio;
  const m = (CHAT_MSGS[window.OPEN] || []).find((x) => x.id == id);
  const dur = Number.isFinite(a.duration) && a.duration ? a.duration : m?.audio_segundos || 0;
  const r = ev.currentTarget.getBoundingClientRect();
  if (dur && r.width) a.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur;
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
    const urls = chatUrlsAudio(u);
    let k = 0;
    const a = new Audio();
    CHAT_PLAY.audio = a;

    a.ontimeupdate = () => chatProgresso(id, a.currentTime / (Number.isFinite(a.duration) && a.duration ? a.duration : dur));
    a.onended = chatPararAudio;

    const tentar = () => {
      if (CHAT_PLAY?.audio !== a) return; /* já foi pausado ou trocado */
      if (k >= urls.length) {
        toast('Não foi possível reproduzir o áudio.');
        chatPararAudio();
        return;
      }
      a.src = urls[k++];
      a.playbackRate = CHAT_VEL;
      a.play().catch(tentar);
    };
    a.onerror = tentar;
    tentar();
  } else {
    /* sem arquivo (exemplo): simula a reprodução para mostrar o visual */
    let t = 0;
    CHAT_PLAY.timer = setInterval(() => {
      t += 0.25 * CHAT_VEL;
      chatProgresso(id, t / dur);
      if (t >= dur) chatPararAudio();
    }, 250);
  }

  chatIconeAudio(id, true);
}

/* ---------- nova conversa ---------- */

async function chatNovaConversa() {
  /* plano pago inicia conversas; no gratuito dá para responder quem escreveu (ver views/plans.js) */
  if (!temRecurso('chat')) return upsell('chat');

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

async function chatNova(peerId) {
  const peer = CHAT_CONTATOS.find((p) => p.id == peerId);
  if (!peer) return;
  closeModal();
  await chatAbrirConversa(peer);
}

/* abre (criando, se for preciso) a conversa com um usuário */
async function chatAbrirConversa(peer) {
  try {
    await ChatBackend.garantirConversa(peer);
  } catch (e) {
    return toast(e.message || 'Não foi possível abrir a conversa.');
  }

  if (!chatConv(peer.id)) {
    CHATS.unshift({ id: String(peer.id), peer, ultima: null, naoLidas: 0 });
  }
  location.hash = '#/chats/' + peer.id;
}

/* botão "Mensagem" do perfil da ONG (o id recebido é o do perfil da ONG; o chat usa o id do usuário dela) */
async function chatAbrirComOng(ongId) {
  if (DEMO) {
    location.hash = '#/chats';
    return;
  }

  if (!temRecurso('chat')) return upsell('chat');

  let userId = ONG_PERFIL[ongId]?.dados?.userId;
  if (!userId) {
    try {
      userId = (await API.perfilOngPublico(ongId)).user_id;
    } catch (e) {
      userId = null;
    }
  }

  if (!userId) return toast('Não foi possível iniciar a conversa agora.');

  const o = ong(ongId);
  await chatAbrirConversa({ id: String(userId), nome: o?.name || 'ONG', tipo: 'ONG', avatar: o?.logo || '' });
}

/* ---------- tempo real ---------- */

/* conversas silenciadas não entram na contagem do menu, do título da aba nem nos avisos */
const chatNaoLidas = () => CHATS.reduce((t, c) => t + (chatSilenciada(c.id) ? 0 : c.naoLidas || 0), 0);

/* título da aba: "(2) Início · Civvo". O app troca o título a cada tela; por isso observamos a mudança. */
function chatAtualizarTitulo() {
  const n = chatNaoLidas();
  const base = document.title.replace(/^\(\d+\+?\)\s*/, '');
  const novo = n > 0 ? `(${n > 99 ? '99+' : n}) ${base}` : base;
  if (document.title !== novo) document.title = novo;
}

/* liga/desliga o pontinho de "tem mensagem nova" no menu, sem redesenhar a tela */
function chatAtualizarBadge() {
  const tem = chatNaoLidas() > 0;

  document.querySelectorAll('a.nav[href="#/chats"], a.tb-m[href="#/chats"]').forEach((a) => {
    const d = a.querySelector('.dot');
    if (tem && !d) a.insertAdjacentHTML('beforeend', '<i class="dot" aria-hidden="true"></i>');
    if (!tem && d) d.remove();
  });

  chatAtualizarTitulo();
}

function chatRecarregarLista() {
  if (CHAT.carregando) return;
  CHAT.carregou = false;
  chatCarregar();
}

/* ---- avisos: som curto e notificação do navegador (com a aba em segundo plano) ---- */

let CHAT_AC = null;

/* o navegador só libera som depois de um toque/clique da pessoa */
function chatDesbloquearSom() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC && !CHAT_AC) CHAT_AC = new AC();
    CHAT_AC?.resume?.();
  } catch (e) {
    /* sem som */
  }
}
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, chatDesbloquearSom, { once: true }));

function chatBip() {
  if (!CHAT_AC || CHAT_AC.state != 'running') return;
  try {
    const t = CHAT_AC.currentTime;
    const o = CHAT_AC.createOscillator();
    const g = CHAT_AC.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(CHAT_AC.destination);
    o.start(t);
    o.stop(t + 0.26);
  } catch (e) {
    /* sem som */
  }
}

const chatPodeNotificar = () => !DEMO && typeof Notification != 'undefined';

function chatNotifHtml() {
  if (!chatPodeNotificar() || Notification.permission != 'default') return '';
  return `<button type="button" class="chat-notif" onclick="chatPedirNotificacao()">${ic('bell')}<span>Ativar avisos de novas mensagens</span></button>`;
}

function chatPedirNotificacao() {
  Notification.requestPermission().finally(() => {
    const e = $('#chatNotif');
    if (e) e.innerHTML = chatNotifHtml();
  });
}

function chatAvisar(conv, msg) {
  if (chatSilenciada(conv.id)) return;

  chatBip();

  if (typeof announce == 'function') announce(`Nova mensagem de ${conv.peer.nome}`);

  if (document.hidden && chatPodeNotificar() && Notification.permission == 'granted') {
    try {
      const n = new Notification(conv.peer.nome, {
        body: chatPreview(msg).replace(/^Você: /, ''),
        icon: chatUrl(conv.peer.avatar) || undefined,
        tag: 'civvo-chat-' + conv.id,
      });
      n.onclick = () => {
        focus();
        location.hash = '#/chats/' + conv.id;
        n.close();
      };
    } catch (e) {
      /* alguns celulares exigem Service Worker para notificar: sem aviso, só o som e o título */
    }
  }
}

/* chegou algo pelo tempo real: { peerId, conversationId, msg } | { lidas, peerId } | { reconectou } | { conexao } */
function chatReceber(ev) {
  if ('conexao' in ev) {
    chatDefinirConexao(ev.conexao, false);
    return;
  }

  if (ev.reconectou) {
    chatRecarregarLista();
    /* mensagens da conversa aberta que chegaram enquanto estava fora */
    const id = window.OPEN;
    if (id && rotaAtual() == 'chats') {
      ChatBackend.listarMensagens(id)
        .then((l) => {
          const pend = (CHAT_MSGS[id] || []).filter((x) => x.status);
          CHAT_MSGS[id] = [...l, ...pend];
          chatRedesenharMensagens(id);
        })
        .catch(() => {});
    }
    return;
  }

  const aberta = (id) => rotaAtual() == 'chats' && window.OPEN == id;

  /* o outro usuário leu minhas mensagens: troca o visto (✓ → ✓✓) */
  if (ev.lidas) {
    const lista = CHAT_MSGS[ev.peerId];
    if (!lista) return;
    lista.forEach((x) => {
      if (x.minha && !x.status) x.lida = true;
    });
    if (aberta(ev.peerId)) chatRedesenharMensagens(ev.peerId);
    return;
  }

  const { peerId, msg } = ev;
  const conv = peerId != null ? chatConv(peerId) : null;

  /* conversa que ainda não conheço (alguém escreveu pela primeira vez): busca a lista de novo */
  if (!conv) {
    chatRecarregarLista();
    return;
  }

  conv.ultima = msg;

  const lista = CHAT_MSGS[peerId];
  if (lista && !lista.some((x) => x.id == msg.id)) {
    lista.push(msg);
    if (aberta(peerId)) chatAcrescentar(peerId, msg);
  }

  if (!msg.minha) {
    const lendo = aberta(peerId) && !document.hidden;
    if (lendo) {
      conv.naoLidas = 0;
      ChatBackend.marcarLida(peerId).catch(() => {});
    } else {
      conv.naoLidas = (conv.naoLidas || 0) + 1;
      chatAvisar(conv, msg);
    }
  }

  if (rotaAtual() == 'chats') chatAtualizarLista();
  chatAtualizarBadge();
}

/* voltou para a aba com a conversa aberta: marca como lida */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (rotaAtual() == 'chats' && window.OPEN) {
    const c = chatConv(window.OPEN);
    if (c) chatMarcarLida(c);
  }
  chatAtualizarTitulo();
});

/* saiu da tela de mensagens: para áudio e gravação */
addEventListener('hashchange', () => {
  if (rotaAtual() != 'chats') {
    chatPararAudio();
    chatPararGravacao();
  }
});

/* o navegador perdeu/recuperou a internet */
addEventListener('offline', () => !DEMO && chatDefinirConexao(false, true));
addEventListener('online', () => {
  if (DEMO) return;
  ChatBackend.iniciar();
  if (ChatBackend.conectado()) chatDefinirConexao(true);
});

/* o app troca o título a cada tela: reaplica o "(n)" */
const chatTitulo = document.querySelector('title');
if (chatTitulo) new MutationObserver(chatAtualizarTitulo).observe(chatTitulo, { childList: true, characterData: true, subtree: true });

/* sessão real: conecta já na abertura do app, para receber mensagens e mostrar o aviso no menu em qualquer tela */
function chatIniciarTempoReal() {
  const perfil = window.__civvoSessao?.perfil;
  if (DEMO || (perfil != 'doador' && perfil != 'ong')) return;

  CHAT.perfil = perfil;
  chatPrefCarregar();
  chatRascCarregar();
  ChatBackend.aoReceber(chatReceber);
  ChatBackend.iniciar();
  chatCarregar();
}

chatIniciarTempoReal();
