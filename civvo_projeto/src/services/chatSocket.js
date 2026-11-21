/* Conexão Socket.IO do chat (tempo real).
   Usada pelo app logado (scripts sem módulos) por window.CivvoChatSocket, definido em bridge.js.
   - Autentica no handshake com o JWT da sessão (o back deve validar: ver CHAT_BACKEND.md).
   - Reentra nas salas das conversas e se registra de novo a cada (re)conexão. */
import { io } from 'socket.io-client';
import { lerSessao } from './sessao.js';

function urlDoSocket() {
  const env = import.meta.env || {};
  if (env.VITE_SOCKET_URL) return String(env.VITE_SOCKET_URL).replace(/\/+$/, '');
  if (env.VITE_API_URL) {
    try {
      return new URL(env.VITE_API_URL).origin; /* tira o /api do final */
    } catch {
      /* URL relativa: cai na origem da página */
    }
  }
  return window.location.origin; /* dev: o proxy do Vite encaminha /socket.io para o back */
}

let socket = null;
const salas = new Set(); /* conversationId das salas em que devemos estar */
const ouvintes = new Map(); /* evento → Set<fn> */

function ligarOuvintes(evento) {
  /* cada evento é ligado uma única vez ao socket; os ouvintes ficam no Map */
  socket.on(evento, (...args) => (ouvintes.get(evento) || []).forEach((fn) => fn(...args)));
}

function eventosOuvidos() {
  return ['receive_message', 'chat_error', 'messages_read', 'connect', 'disconnect', 'connect_error'];
}

export const chatSocket = {
  get conectado() {
    return !!socket?.connected;
  },

  conectar() {
    if (socket) {
      if (!socket.connected) socket.connect();
      return socket;
    }

    socket = io(urlDoSocket(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: lerSessao()?.token || '' }),
      reconnectionDelayMax: 5000,
    });

    eventosOuvidos().forEach(ligarOuvintes);

    socket.on('connect', () => {
      const uid = lerSessao()?.usuario?.id;
      if (uid != null) socket.emit('register_user', uid);
      salas.forEach((c) => socket.emit('join_room', { conversationId: c }));
    });

    socket.connect();
    return socket;
  },

  desconectar() {
    if (!socket) return;
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    salas.clear();
    ouvintes.clear();
  },

  /* ouve um evento; devolve a função que remove o ouvinte */
  on(evento, fn) {
    if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
    ouvintes.get(evento).add(fn);
    return () => ouvintes.get(evento)?.delete(fn);
  },

  entrarSala(conversationId) {
    if (conversationId == null) return;
    salas.add(conversationId);
    if (socket?.connected) socket.emit('join_room', { conversationId });
  },

  /* emite um evento; o 3º argumento do back (callback) é opcional */
  emitir(evento, dados, ack) {
    if (!socket) this.conectar();
    if (ack) socket.emit(evento, dados, ack);
    else socket.emit(evento, dados);
  },
};
