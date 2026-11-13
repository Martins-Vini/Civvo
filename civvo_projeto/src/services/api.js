/* Camada de comunicação com o back-end (Civvo_API).
   URL base: VITE_API_URL (produção) ou "/api" (desenvolvimento: o proxy do vite.config.js encaminha para o back).
   O back responde erros como { error: "..." }.

   Esta camada é usada em dois lugares:
   - pelas páginas públicas (login/cadastro), por import;
   - pelo app logado (public/app, scripts sem módulos), por window.CivvoApi (exposto no bridge.js). */

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
    window.location.hash = '#/sair'; /* o bridge.js limpa tudo e recarrega no início */
}

/* Requisição genérica. `autenticado: true` envia o token da sessão (Authorization: Bearer ...).
   - token já vencido: encerra a sessão sem nem chamar o back;
   - back responde 401 numa rota autenticada: encerra a sessão e volta para o início;
   - 403 (sem permissão) e demais erros: só lançam ApiError, a sessão continua. */
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

/* ---- Doador: cadastro e login em 2 etapas (código de 6 dígitos enviado por e-mail) ---- */

/* Cadastro, etapa 1: o back confere se o e-mail está livre e envia o código. Body: { email } */
export const solicitarCadastroUser = (payload) => apiRequest('/auth/register/solicitar', { method: 'POST', dados: payload });

/* Cadastro, etapa 2: valida o código e cria a conta.
   Body: { email, codigo, password, nome, sobrenome, apelido_unico, cpf, cadunico_file } */
export const confirmarCadastroUser = (payload) => apiRequest('/auth/register/confirmar', { method: 'POST', dados: payload });

/* Login, etapa 1: confere a senha e envia o código. Resposta: { requiresTwoFactor: true } */
export const iniciarLoginUser = (payload) => apiRequest('/auth/login/iniciar', { method: 'POST', dados: payload });

/* Login, etapa 2: valida o código. Resposta: { token, user } */
export const verificarLoginUser = (payload) => apiRequest('/auth/login/verificar', { method: 'POST', dados: payload });

/* ---- Doador: login/cadastro com Google ----
   Body: { idToken, userType }  (idToken = credential do Google; userType = 'DOADOR' ou 'ONG').
   Resposta: { message, token } — o back NÃO devolve o usuário; quem monta a sessão é o google-auth.js,
   usando o payload do JWT (userId, userType) e os dados do credential do Google. Cria a conta se o e-mail for novo. */
export const loginGoogle = (idToken, userType = 'DOADOR') =>
    apiRequest('/auth/google', { method: 'POST', dados: { idToken, userType } });

/* ---- ONG: login e cadastro diretos ---- */
export const loginOng = (payload) => apiRequest('/ong/login/ong', { method: 'POST', dados: payload });
export const cadastrarOng = (payload) => apiRequest('/ong/register/ong', { method: 'POST', dados: payload });

/* ---- Admin ---- Body: { email, password }. Resposta: { token, admin: { id, email, nome_completo, role_level } } */
export const loginAdmin = (payload) => apiRequest('/admin/login', { method: 'POST', dados: payload });

/* ======================= Rotas autenticadas (app logado) ======================= */

/* ---- Posts ---- */

/* Feed geral. Resposta: lista de posts (type, caption, ONG, mídias, campanha/vaga). */
export const listarFeed = () => doGet('/posts/feed');

/* Cria post (só ONG). Body: {
     type, caption, is_boosted, boosted_until,
     mediaList:     [{ file_url, media_type }],
     campaignData:  { meta_valor, data_limite },                                   (type de campanha)
     volunteerData: { google_forms_url, vagas_disponiveis, data_limite_inscricao } (type de voluntariado)
   } */
export const criarPost = (payload) => doEnvio('POST', '/posts', payload);

/* Edita só a legenda. */
export const editarPost = (postId, caption) => doEnvio('PUT', `/posts/${id(postId)}`, { caption });
export const excluirPost = (postId) => doEnvio('DELETE', `/posts/${id(postId)}`);

/* Curtir/descurtir (alterna). Resposta: { liked } */
export const curtirPost = (postId) => doEnvio('POST', `/posts/${id(postId)}/curtir`);
export const comentarPost = (postId, content, parentCommentId = null) =>
    doEnvio('POST', `/posts/${id(postId)}/comentar`, { content, parentCommentId });
export const compartilharPost = (postId) => doEnvio('POST', `/posts/${id(postId)}/compartilhar`);

/* O back limita `reason` a 225 caracteres; cortamos aqui para não dar erro. */
export const denunciarPost = (postId, reason) =>
    doEnvio('POST', `/posts/${id(postId)}/denunciar`, { reason: String(reason ?? '').slice(0, 225) });

/* Candidatura a vaga de voluntariado (o back não tem rota para cancelar). */
export const candidatarVoluntariado = (postId) => doEnvio('POST', `/posts/${id(postId)}/candidatar`);

/* Histórico da própria pessoa (o de voluntariado aceita o id de outro usuário). */
export const historicoCurtidas = () => doGet('/posts/historico/curtidas');
export const historicoComentarios = () => doGet('/posts/historico/comentarios');
export const historicoVoluntariado = (userId) =>
    doGet(userId ? `/posts/historico/voluntariado/${id(userId)}` : '/posts/historico/voluntariado');

/* ---- Momentos (stories) ---- */
export const listarMomentos = () => doGet('/moments');
/* Só ONG. Body: { media_url, caption, duracao_horas } (24, 36 ou 48) */
export const criarMomento = (payload) => doEnvio('POST', '/moments', payload);

/* ---- Doações ---- Body: { campaign_id, amount, mensagem }. Resposta traz o comprovante. */
export const doar = (payload) => doEnvio('POST', '/donations', payload);

/* ---- Perfil do doador ---- Body (todos opcionais): { bio, banner_url, avatar_url, voluntariados_publicos, redes_sociais } */
export const atualizarPerfilDoador = (payload) => doEnvio('PUT', '/donor/profile', payload);

/* ---- ONG ---- (o back só tem esta rota de perfil; não há edição de perfil de ONG) */
export const perfilOng = () => doGet('/ong/perfil');

/* ---- Admin ---- */
export const listarDenuncias = () => doGet('/admin/denuncias');

/* Status aceitos pelo banco em POST_REPORTS (ENUM). Qualquer outro valor daria erro 500 no back. */
export const STATUS_DENUNCIA = ['PENDENTE', 'ANALISADO', 'IGNORADO'];

export const atualizarDenuncia = (denunciaId, status) => {
    if (!STATUS_DENUNCIA.includes(status)) {
        return Promise.reject(new ApiError(`Status de denúncia inválido: ${status}.`, 400));
    }
    return doEnvio('PUT', `/admin/denuncias/${id(denunciaId)}`, { status });
};
