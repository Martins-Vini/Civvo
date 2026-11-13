/* Camada de dados do chat.

   A tela (views/chat.js) só conversa com `ChatBackend`; ela não sabe de onde os dados vêm.
   - Demo (?demo): ChatDemo, conversas de exemplo em memória, para ver e testar o visual.
   - Sessão real: ChatApi, que ainda NÃO tem rotas no back (só existe a tabela MESSAGES), então tudo recusa com
     ChatIndisponivel e a tela mostra o aviso "em breve" com o envio desabilitado.

   ===== COMO LIGAR QUANDO O BACK TIVER AS ROTAS =====
   1. Em src/services/api.js, crie uma função por rota (ex.: listarConversas, listarMensagens, enviarMensagem, marcarConversaLida).
   2. Em ChatApi (mais abaixo), troque cada método por uma chamada a elas e passe as linhas pelo `chatMsgDoBack`.
   3. Coloque `disponivel: true`.
   A tela não muda. Sugestão de rotas (proposta, ainda não existem): GET /chats, GET /chats/:peerId/mensagens,
   POST /chats/:peerId/mensagens, PUT /chats/:peerId/lida, GET /chats/contatos.

   ===== FORMATOS (o que a tela espera) =====
   Peer     { id, nome, tipo: 'DOADOR' | 'ONG', avatar?: url }
   Conversa { id, peer, ultima: Mensagem | null, naoLidas: número }      (id = id do outro usuário)
   Mensagem { id, tipo: 'TEXT'|'AUDIO'|'IMAGE'|'VIDEO'|'FILE', texto, midia_url, audio_segundos,
              nome?, tamanho?, lida, criada_em (ISO), minha }
   O que é nome/tamanho de arquivo não existe na tabela MESSAGES: se o back não mandar, a tela deriva o nome do endereço. */

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

/* Linha da tabela MESSAGES (como o back deve devolver) → Mensagem da tela. `meuId` = USERS.id de quem está logado. */
function chatMsgDoBack(r, meuId) {
  return {
    id: r.id,
    tipo: r.media_type || 'TEXT',
    texto: r.encrypted_content || '', /* se o back não decifrar, a tela mostrará o texto cifrado: decifre antes de entregar */
    midia_url: r.media_url || '',
    audio_segundos: r.audio_duration_seconds ?? 0,
    nome: r.media_name || '',
    tamanho: r.media_size ?? 0,
    lida: !!r.is_read,
    criada_em: r.created_at,
    minha: meuId != null && r.sender_id == meuId,
  };
}

/* ------------------------------ Sessão real (sem rotas ainda) ------------------------------ */

const ChatApi = {
  disponivel: false,
  listarConversas: () => Promise.reject(new ChatIndisponivel()),
  listarMensagens: () => Promise.reject(new ChatIndisponivel()),
  enviar: () => Promise.reject(new ChatIndisponivel()),
  marcarLida: () => Promise.reject(new ChatIndisponivel()),
  listarContatos: () => Promise.reject(new ChatIndisponivel()),
};

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
