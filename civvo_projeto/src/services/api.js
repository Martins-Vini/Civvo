import { lerSessao, limparSessao, tokenExpirado } from './sessao.js';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '');
const TEMPO_LIMITE_MS = 20000;

export class ApiError extends Error {
    constructor(mensagem, status = 0) {
        super(mensagem);
        this.name = 'ApiError';
        this.status = status;
    }
}

function mensagemPadrao(status) {
    if (status === 401) return 'Credenciais inválidas ou sessão expirada.';
    if (status === 403) return 'Você não tem permissão para realizar esta ação.';
    if (status === 404) return 'Recurso não encontrado.';
    if (status >= 500) return 'Erro no servidor. Tente novamente em instantes.';
    return 'Erro ao comunicar com a API.';
}

function encerrarSessao() {
    limparSessao();
    window.location.hash = '#/sair';
}

export async function apiRequest(endpoint, { method = 'GET', dados = null, autenticado = false } = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };

    if (autenticado) {
        const token = lerSessao()?.token;
        if (token && tokenExpirado(token)) {
            encerrarSessao();
            throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
        }
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

    let resposta;
    try {
        resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: dados ? JSON.stringify(dados) : undefined,
            signal: controle.signal,
        });
    } catch (erro) {
        if (erro?.name === 'AbortError') {
            throw new ApiError('O servidor demorou para responder. Tente novamente.');
        }
        throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
        clearTimeout(relogio);
    }

    const corpo = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        if (resposta.status === 401 && autenticado) encerrarSessao();
        throw new ApiError(corpo?.error || corpo?.message || mensagemPadrao(resposta.status), resposta.status);
    }

    return corpo ?? {};
}

const doGet = (endpoint) => apiRequest(endpoint, { autenticado: true });
const doEnvio = (method, endpoint, dados) => apiRequest(endpoint, { method, dados, autenticado: true });
const id = (valor) => encodeURIComponent(valor);

/* ======================= Autenticação (rotas públicas) ======================= */
export const solicitarCadastroUser = (payload) => apiRequest('/auth/register/solicitar', { method: 'POST', dados: payload });
export const confirmarCadastroUser = (payload) => apiRequest('/auth/register/confirmar', { method: 'POST', dados: payload });
export const iniciarLoginUser = (payload) => apiRequest('/auth/login/iniciar', { method: 'POST', dados: payload });
export const verificarLoginUser = (payload) => apiRequest('/auth/login/verificar', { method: 'POST', dados: payload });
export const loginGoogle = (idToken, userType = 'DOADOR') =>
    apiRequest('/auth/google', { method: 'POST', dados: { idToken, userType } });
export const solicitarRecuperacaoSenha = (email) =>
    apiRequest('/auth/password/solicitar', { method: 'POST', dados: { email } });
export const confirmarRecuperacaoSenha = ({ email, codigo, novaSenha }) =>
    apiRequest('/auth/password/confirmar', { method: 'POST', dados: { email, codigo, novaSenha } });
export const loginOng = (payload) => apiRequest('/ong/login/ong', { method: 'POST', dados: payload });
export const cadastrarOng = (payload) => apiRequest('/ong/register/ong', { method: 'POST', dados: payload });
export const loginAdmin = (payload) => apiRequest('/admin/login', { method: 'POST', dados: payload });

/* ======================= Rotas autenticadas (app logado) ======================= */
export const listarFeed = () => doGet('/posts/feed');
export const criarPost = (payload) => doEnvio('POST', '/posts', payload);
export const editarPost = (postId, caption) => doEnvio('PUT', `/posts/${id(postId)}`, { caption });
export const excluirPost = (postId) => doEnvio('DELETE', `/posts/${id(postId)}`);

export const curtirPost = (postId) => doEnvio('POST', `/posts/${id(postId)}/curtir`);
export const listarComentariosPost = (postId) => doGet(`/posts/${id(postId)}/comentarios`);
export const comentarPost = (postId, content, parentCommentId = null) =>
    doEnvio('POST', `/posts/${id(postId)}/comentar`, { content, parentCommentId });
export const compartilharPost = (postId) => doEnvio('POST', `/posts/${id(postId)}/compartilhar`);
export const denunciarPost = (postId, reason) =>
    doEnvio('POST', `/posts/${id(postId)}/denunciar`, { reason: String(reason ?? '').slice(0, 225) });
export const candidatarVoluntariado = (postId) => doEnvio('POST', `/posts/${id(postId)}/candidatar`);

export const historicoCurtidas = () => doGet('/posts/historico/curtidas');
export const historicoComentarios = () => doGet('/posts/historico/comentarios');
export const historicoVoluntariado = (userId) =>
    doGet(userId ? `/posts/historico/voluntariado/${id(userId)}` : '/posts/historico/voluntariado');

/* ---- Seguidores ---- */
export const toggleSeguir = (payload) => doEnvio('POST', '/followers/toggle', payload);
export const listarSeguidores = (userId) => doGet(`/followers/${id(userId)}/followers`);
export const listarSeguindo = (userId) => doGet(`/followers/${id(userId)}/following`);

/* ---- Momentos (stories) ---- */
export const listarMomentos = () => doGet('/moments');
export const criarMomento = (payload) => doEnvio('POST', '/moments', payload);

/* ---- Doações ---- */
export const doar = (payload) => doEnvio('POST', '/donations', payload);

/* ---- Perfil do doador ---- */
export const atualizarPerfilDoador = (payload) => doEnvio('PUT', '/donor/profile', payload);

/* ---- Exclusão da própria conta ---- */
export const excluirContaDoador = () => doEnvio('DELETE', '/donor/account');
export const excluirContaOng = () => doEnvio('DELETE', '/ong/account');

/* ---- ONG ---- */
export const perfilOng = () => doGet('/ong/perfil');

/* ---- Admin ---- */
export const listarDenuncias = () => doGet('/admin/denuncias');
export const STATUS_DENUNCIA = ['PENDENTE', 'ANALISADO', 'IGNORADO'];
export const atualizarDenuncia = (denunciaId, status) => {
    if (!STATUS_DENUNCIA.includes(status)) {
        return Promise.reject(new ApiError(`Status de denúncia inválido: ${status}.`, 400));
    }
    return doEnvio('PUT', `/admin/denuncias/${id(denunciaId)}`, { status });
};