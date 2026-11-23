/* Camada de dados do chat.

   A tela (views/chat.js) só conversa com `ChatBackend`; ela não sabe de onde os dados vêm.
   - Demo (?demo): ChatDemo, conversas de exemplo em memória, para ver e testar o visual.
   - Sessão real: ChatApi, que usa as rotas REST do back (src/services/api.js) para histórico/lista/arquivos
     e o Socket.IO (window.CivvoChatSocket, src/services/chatSocket.js) para enviar e receber em tempo real.
     O que o back precisa oferecer está em CHAT_BACKEND.md.

   ===== FORMATOS (o que a tela espera) =====
   Peer     { id, nome, tipo: 'DOADOR' | 'ONG', avatar?: url }                       (id = USERS.id do outro usuário)
   Conversa { id, peer, ultima: Mensagem | null, naoLidas: número, conversationId? }   (id = id do outro usuário)
   Mensagem { id, tipo: 'TEXT'|'AUDIO'|'IMAGE'|'VIDEO'|'FILE', texto, midia_url, audio_segundos,
              nome?, tamanho?, lida, criada_em (ISO), minha } */

const CHAT_AUDIO_MAX = 60; /* segundos: o CHECK da tabela MESSAGES */
const CHAT_ARQ_MAX = 20 * 1024 * 1024; /* ajuste conforme o limite de upload do back */
const CHAT_TEXTO_MAX = 2000;

/* Regra do banco (trigger trg_check_message_restriction): doador não envia mensagem para doador. */
const chatPodeConversar = (tipoA, tipoB) => !(tipoA == 'DOADOR' && tipoB == 'DOADOR');

class ChatIndisponivel extends Error {
  constructor() {
    super('O chat ainda não está disponível.');
    this.name = 'ChatIndisponivel';
  }
}

const chatMeuTipo = () => (ROLE == 'ong' ? 'ONG' : 'DOADOR');
const chatMeuId = () => window.__civvoSessao?.usuario?.id ?? null;

const CHAT_TIPOS = ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'POST_SHARE', 'PROFILE_SHARE', 'MOMENT_REPLY'];

/* Mensagem do back → Mensagem da tela. Aceita a linha do REST (snake_case) e o payload do socket (camelCase).
   `meuId` = USERS.id de quem está logado. */
function chatMsgDoBack(r, meuId) {
  const tipo = String(r.media_type ?? r.mediaType ?? 'text').toUpperCase();
  const remetente = r.sender_id ?? r.senderId;
  const criada = r.created_at ?? r.createdAt;

  return {
    id: r.id,
    tipo: CHAT_TIPOS.includes(tipo) ? tipo : 'TEXT',
    texto: r.content ?? r.texto ?? '',
    midia_url: r.media_url ?? r.mediaUrl ?? '',
    audio_segundos: r.audio_duration_seconds ?? r.audioSeconds ?? 0,
    nome: r.media_name ?? r.mediaName ?? '',
    tamanho: r.media_size ?? r.mediaSize ?? 0,
    sharedPostId: r.shared_post_id ?? r.sharedPostId ?? null,
    sharedProfileType: r.shared_profile_type ?? r.sharedProfileType ?? null,
    sharedProfileId: r.shared_profile_id ?? r.sharedProfileId ?? null,
    momentId: r.moment_id ?? r.momentId ?? null,
    lida: !!(r.is_read ?? r.isRead),
    criada_em: criada ? new Date(criada).toISOString() : new Date().toISOString(),
    minha: meuId != null && remetente != null && remetente == meuId,
  };
}

/* ------------------------------ Sessão real (REST + Socket.IO) ------------------------------ */

const ChatApi = (() => {
  const conversas = new Map(); /* id do outro usuário → conversationId */
  const pendentes = []; /* envios aguardando a confirmação do servidor */
  const vistas = new Set(); /* ids de mensagens já processadas (o back pode emitir 2x: sala da conversa e sala do usuário) */
  const ouvintes = new Set();
  let ligado = false;

  const sock = () => window.CivvoChatSocket;
  const api = () => window.CivvoApi;

  const peerDoId = (conversationId) => {
    for (const [peer, c] of conversas) if (c == conversationId) return peer;
    return null;
  };

  const lembrar = (c) => {
    if (c.conversationId != null) {
      conversas.set(String(c.id), c.conversationId);
      sock()?.entrarSala(c.conversationId);
    }
  };

  const clientId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  /* o back pode devolver o eco da minha própria mensagem: casa com o envio que estava esperando */
  function casarPendente(p, m) {
    return pendentes.findIndex((x) => {
      if (x.conversationId != p.conversationId) return false;
      if (p.clientId) return p.clientId == x.clientId; /* o back devolveu o clientId */
      return x.tipo == m.tipo && (x.midia ? x.midia == m.midia_url : x.texto == m.texto);
    });
  }

  function aoReceber(p) {
    const meuId = chatMeuId();
    const m = chatMsgDoBack(p, meuId);
    if (m.id == null || vistas.has(m.id)) return;
    vistas.add(m.id);
    if (vistas.size > 500) vistas.delete(vistas.values().next().value);

    const conversationId = p.conversationId ?? p.conversation_id;

    if (m.minha) {
      const i = casarPendente({ ...p, conversationId }, m);
      if (i >= 0) {
        const [x] = pendentes.splice(i, 1);
        x.resolver(m);
        return;
      }
    }

    const peerId = m.minha ? peerDoId(conversationId) : String(p.senderId ?? p.sender_id);
    ouvintes.forEach((fn) => fn({ peerId, conversationId, msg: m }));
  }

  function ligar() {
    if (ligado || !sock()) return;
    ligado = true;
    const s = sock();

    s.on('receive_message', aoReceber);

    s.on('chat_error', (e) => {
      const x = pendentes.shift();
      if (x) x.recusar(new Error(e?.message || 'Não foi possível enviar a mensagem.'));
      else window.toast?.(e?.message || 'Erro no chat.');
    });

    s.on('messages_read', (p) => {
      const conversationId = p?.conversationId ?? p?.conversation_id;
      ouvintes.forEach((fn) => fn({ lidas: true, peerId: peerDoId(conversationId), conversationId }));
    });

    /* meu pedido de conversa foi aceito do outro lado */
    s.on('chat_request_aceita', (p) => {
      const conversationId = p?.conversationId ?? p?.conversation_id;
      statusConversa.set(conversationId, { status: 'ACEITA', requestedByMe: true });
      ouvintes.forEach((fn) => fn({ pedidoAceito: true, peerId: peerDoId(conversationId), conversationId }));
    });

    /* estado da conexão (a tela mostra "Reconectando…" e bloqueia o envio enquanto estiver fora) */
    let jaConectou = false;
    s.on('connect', () => {
      ouvintes.forEach((fn) => fn({ conexao: true }));
      /* voltou a conexão: o que chegou enquanto estava fora é buscado de novo */
      if (jaConectou) ouvintes.forEach((fn) => fn({ reconectou: true }));
      jaConectou = true;
    });
    s.on('disconnect', () => ouvintes.forEach((fn) => fn({ conexao: false })));
    s.on('connect_error', () => ouvintes.forEach((fn) => fn({ conexao: false })));
  }

  const statusConversa = new Map(); /* conversationId → { status, requestedByMe } */

  async function garantir(peerId) {
    const k = String(peerId);
    if (conversas.has(k)) return conversas.get(k);

    const r = await api().chatGarantirConversa(Number(peerId));
    const c = r.conversationId ?? r.conversation_id ?? r.id;
    if (c == null) throw new Error('Não foi possível abrir a conversa.');
    lembrar({ id: k, conversationId: c });
    statusConversa.set(c, { status: r.status || 'ACEITA', requestedByMe: !!r.requestedByMe });
    return c;
  }

  return {
    disponivel: true,

    conectado: () => !!sock()?.conectado,

    /* liga o tempo real (idempotente) */
    iniciar() {
      if (!sock()) return;
      ligar();
      sock().conectar();
    },

    parar() {
      sock()?.desconectar();
      ligado = false;
      conversas.clear();
    },

    /* recebe { peerId, conversationId, msg } | { lidas, peerId } | { reconectou } | { conexao: true|false } */
    aoReceber(fn) {
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },

    garantirConversa: (peer) => garantir(peer.id),

    async listarConversas() {
      const lista = await api().chatListarConversas();
      const meuId = chatMeuId();

      return (lista || []).map((c) => {
        const peer = c.peer || {
          id: c.peer_id,
          nome: c.peer_nome,
          tipo: c.peer_tipo,
          avatar: c.peer_avatar,
        };
        const conv = {
          id: String(peer.id),
          conversationId: c.conversationId ?? c.conversation_id,
          peer: {
            id: String(peer.id),
            nome: peer.nome || 'Usuário Civvo',
            tipo: String(peer.tipo || peer.user_type || 'DOADOR').toUpperCase() == 'ONG' ? 'ONG' : 'DOADOR',
            avatar: peer.avatar || '',
          },
          ultima: c.ultima ? chatMsgDoBack(c.ultima, meuId) : null,
          naoLidas: Number(c.naoLidas ?? c.unread ?? 0),
          /* pedido de conversa: 'PENDENTE' até o outro lado aceitar */
          status: c.status || 'ACEITA',
          souSolicitante: !!c.requestedByMe,
        };
        lembrar(conv);
        if (conv.conversationId != null) {
          statusConversa.set(conv.conversationId, { status: conv.status, requestedByMe: conv.souSolicitante });
        }
        return conv;
      });
    },

    /* aceita o pedido de conversa (só quem recebeu o pedido pode chamar) */
    async aceitarConversa(peerId) {
      const c = await garantir(peerId);
      await api().chatAceitarConversa(c);
      statusConversa.set(c, { status: 'ACEITA', requestedByMe: false });
      return true;
    },

    /* status atual da conversa já carregada (não busca no servidor) */
    statusDaConversa(peerId) {
      const c = conversas.get(String(peerId));
      return c != null ? statusConversa.get(c) || { status: 'ACEITA', requestedByMe: false } : { status: 'ACEITA', requestedByMe: false };
    },

    async listarMensagens(peerId) {
      const c = await garantir(peerId);
      const rows = await api().chatListarMensagens(c);
      const meuId = chatMeuId();
      return (rows || []).map((r) => chatMsgDoBack(r, meuId));
    },

    /* payload: { tipo, texto?, arquivo?: File|Blob, nome?, tamanho?, audioSegundos?, clientId?, onProgress?(0..100) } */
    async enviar(peerId, p) {
      if (!sock()) throw new ChatIndisponivel();
      this.iniciar();

      const conversationId = await garantir(peerId);

      let midia = '';
      let nome = p.nome || '';
      let tamanho = p.tamanho || 0;

      if (p.arquivo) {
        const fd = new FormData();
        fd.append('file', p.arquivo, p.nome || 'arquivo');
        const up = await api().chatEnviarArquivo(fd, p.onProgress);
        midia = up.url || up.secure_url || '';
        if (!midia) throw new Error('Não foi possível enviar o arquivo.');
        nome = up.name || nome;
        tamanho = up.size || tamanho;
      }

      const id = p.clientId || clientId();
      const tipo = p.tipo || 'TEXT';
      const dados = {
        clientId: id,
        conversationId,
        senderId: chatMeuId(),
        receiverId: Number(peerId),
        content: p.texto || '',
        mediaUrl: midia || null,
        mediaType: tipo.toLowerCase(),
        audioSeconds: p.audioSegundos || 0,
        mediaName: nome || null,
        mediaSize: tamanho || null,
        sharedPostId: p.sharedPostId || null,
        sharedProfileType: p.sharedProfileType || null,
        sharedProfileId: p.sharedProfileId || null,
        momentId: p.momentId || null,
      };

      return new Promise((ok, erro) => {
        const item = {
          clientId: id,
          conversationId,
          tipo,
          texto: dados.content,
          midia,
          resolver: (m) => {
            clearTimeout(item.t);
            ok(m);
          },
          recusar: (e) => {
            clearTimeout(item.t);
            erro(e);
          },
        };
        item.t = setTimeout(() => {
          const i = pendentes.indexOf(item);
          if (i >= 0) pendentes.splice(i, 1);
          erro(new Error('O servidor não confirmou o envio. Tente novamente.'));
        }, 12000);
        pendentes.push(item);

        /* back com confirmação (ack): { message } ou { error }. Sem ack, vale o eco "receive_message". */
        sock().emitir('send_message', dados, (resp) => {
          const i = pendentes.indexOf(item);
          if (i < 0) return;
          if (resp?.error) {
            pendentes.splice(i, 1);
            return item.recusar(new Error(resp.error));
          }
          const bruto = resp?.message || (resp?.id ? resp : null);
          if (bruto) {
            pendentes.splice(i, 1);
            vistas.add(bruto.id);
            item.resolver(chatMsgDoBack(bruto, chatMeuId()));
          }
        });
      });
    },

    async marcarLida(peerId) {
      const c = conversas.get(String(peerId));
      if (c == null) return;
      await api().chatMarcarLida(c);
    },

    /* Quem posso procurar para começar uma conversa: doador → ONGs que segue; ONG → seguidores e quem segue. */
    async listarContatos() {
      const minhaListaSeguindo = await api().minhaListaSeguindo();
      let lista = minhaListaSeguindo || [];

      if (ROLE == 'ong' && ME_ONG != null) {
        const seguidores = await api().listaOng(ME_ONG, 'seguidores');
        lista = [...(seguidores || []), ...lista];
      }

      const meuId = chatMeuId();
      const vistos = new Set();

      return lista
        .filter((u) => u.user_id != null && u.user_id != meuId && !vistos.has(u.user_id) && vistos.add(u.user_id))
        .map((u) => ({
          id: String(u.user_id),
          nome: u.nome || 'Usuário Civvo',
          tipo: String(u.user_type).toUpperCase() == 'ONG' ? 'ONG' : 'DOADOR',
          avatar: u.avatar || '',
        }))
        .filter((p) => chatPodeConversar(chatMeuTipo(), p.tipo));
    },
  };
})();

/* ------------------------------ Demo: conversas de exemplo em memória ------------------------------ */

const ChatDemo = (() => {
  const porPerfil = {};
  let seq = 1000;

  /* imagem de exemplo embutida (sem depender de rede) */
  const FOTO =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b7e7ff"/><stop offset="1" stop-color="#39677e"/></linearGradient></defs><rect width="480" height="320" fill="url(#g)"/><circle cx="360" cy="90" r="38" fill="#fff" opacity=".7"/><path d="M0 320l130-140 90 90 70-60 190 110z" fill="#1f3945" opacity=".55"/></svg>'
    );

  const PEERS = {
    doador: [
      { id: 'o1', nome: 'Instituto Esperança', tipo: 'ONG' },
      { id: 'o2', nome: 'Casa Amiga', tipo: 'ONG' },
      { id: 'o3', nome: 'Mãos Unidas', tipo: 'ONG' },
    ],
    ong: [
      { id: 'd1', nome: 'Mariana Souza', tipo: 'DOADOR' },
      { id: 'd2', nome: 'Carlos Lima', tipo: 'DOADOR' },
      { id: 'd3', nome: 'Beatriz Alves', tipo: 'DOADOR' },
    ],
  };

  const semente = (perfil) => {
    const t = Date.now();
    const quando = (min) => new Date(t - min * 60000).toISOString();
    const m = (minha, tipo, extra, min, lida = true) => ({
      id: ++seq, tipo, texto: '', midia_url: '', audio_segundos: 0, nome: '', tamanho: 0, lida, minha, criada_em: quando(min), ...extra,
    });
    const [a, b] = PEERS[perfil];

    const ong = perfil == 'doador';
    return {
      conversas: {
        [a.id]: {
          peer: a,
          msgs: [
            m(false, 'TEXT', { texto: ong ? 'Olá! Obrigada por apoiar a nossa campanha de inverno.' : 'Oi! Quero ajudar com a campanha, como funciona a entrega?' }, 60 * 26),
            m(true, 'TEXT', { texto: ong ? 'Imagina! Posso levar cobertores também?' : 'Você pode retirar na nossa sede ou doar pelo app.' }, 60 * 25),
            m(false, 'IMAGE', { midia_url: FOTO, texto: ong ? 'Veja como ficou a distribuição de ontem' : '' }, 60 * 3),
            m(false, 'AUDIO', { audio_segundos: 23 }, 40, false),
            m(false, 'FILE', { nome: 'prestacao-de-contas-2026.pdf', tamanho: 482000 }, 12, false),
          ],
        },
        [b.id]: {
          peer: b,
          msgs: [
            m(true, 'TEXT', { texto: 'Bom dia! Vocês ainda precisam de voluntários neste sábado?' }, 60 * 50),
            m(false, 'TEXT', { texto: 'Precisamos sim! As inscrições vão até sexta.' }, 60 * 49),
          ],
        },
      },
    };
  };

  const dados = () => (porPerfil[ROLE] ??= semente(ROLE == 'ong' ? 'ong' : 'doador'));
  const espera = (v, ms = 220) => new Promise((ok) => setTimeout(() => ok(v), ms));
  const ultima = (c) => c.msgs[c.msgs.length - 1] || null;
  const naoLidas = (c) => c.msgs.filter((x) => !x.minha && !x.lida).length;

  return {
    disponivel: true,
    conectado: () => true,
    iniciar() {},
    parar() {},
    aoReceber: () => () => {},
    garantirConversa: () => Promise.resolve(),

    listarConversas() {
      const lista = Object.entries(dados().conversas)
        .map(([id, c]) => ({ id, peer: c.peer, ultima: ultima(c), naoLidas: naoLidas(c) }))
        .filter((c) => c.ultima)
        .sort((x, y) => new Date(y.ultima.criada_em) - new Date(x.ultima.criada_em));
      return espera(lista);
    },

    listarMensagens(id) {
      return espera([...(dados().conversas[id]?.msgs || [])], 160);
    },

    /* payload: { tipo, texto?, arquivo?: File, nome?, tamanho?, audioSegundos? } */
    enviar(id, p) {
      const conv = (dados().conversas[id] ??= { peer: PEERS[ROLE == 'ong' ? 'ong' : 'doador'].find((x) => x.id == id), msgs: [] });
      if (!conv.peer) return Promise.reject(new Error('Contato não encontrado.'));
      if (!chatPodeConversar(chatMeuTipo(), conv.peer.tipo)) {
        return Promise.reject(new Error('Doadores só podem conversar com ONGs.'));
      }

      const msg = {
        id: ++seq,
        tipo: p.tipo,
        texto: p.texto || '',
        midia_url: p.arquivo ? URL.createObjectURL(p.arquivo) : '',
        audio_segundos: p.audioSegundos || 0,
        nome: p.nome || '',
        tamanho: p.tamanho || 0,
        lida: false,
        minha: true,
        criada_em: new Date().toISOString(),
      };
      conv.msgs.push(msg);
      return espera(msg, 120);
    },

    marcarLida(id) {
      (dados().conversas[id]?.msgs || []).forEach((x) => {
        if (!x.minha) x.lida = true;
      });
      return espera();
    },

    listarContatos() {
      return espera(PEERS[ROLE == 'ong' ? 'ong' : 'doador'].filter((p) => chatPodeConversar(chatMeuTipo(), p.tipo)), 120);
    },
  };
})();

const ChatBackend = DEMO ? ChatDemo : ChatApi;
