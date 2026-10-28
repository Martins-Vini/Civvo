/* Camada de comunicação com o back-end (Civvo_API).
   URL base: VITE_API_URL (produção) ou "/api" (desenvolvimento: o proxy do vite.config.js encaminha para o back).
   O back responde erros como { error: "..." }. */

import { lerSessao, limparSessao } from './sessao.js';

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/+$/, '');

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

/* Requisição genérica. `autenticado: true` envia o token da sessão (Authorization: Bearer ...)
   e, se o back responder 401, encerra a sessão e volta para o início. */
export async function apiRequest(endpoint, { method = 'GET', dados = null, autenticado = false } = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };

    if (autenticado) {
        const token = lerSessao()?.token;
        if (token) headers.Authorization = `Bearer ${token}`;
    }

    let resposta;
    try {
        resposta = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: dados ? JSON.stringify(dados) : undefined,
        });
    } catch {
        throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    }

    const corpo = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        if (resposta.status === 401 && autenticado) {
            limparSessao();
            window.location.hash = '#/sair'; /* o bridge.js limpa tudo e recarrega no início */
        }
        throw new ApiError(corpo?.error || corpo?.message || mensagemPadrao(resposta.status), resposta.status);
    }

    return corpo ?? {};
}

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
   Body: { token } (ID token do Google). Resposta: { token, user }. Cria a conta se o e-mail for novo. */
export const loginGoogle = (payload) => apiRequest('/auth/google', { method: 'POST', dados: payload });

/* ---- ONG: login e cadastro diretos ---- */
export const loginOng = (payload) => apiRequest('/ong/login/ong', { method: 'POST', dados: payload });
export const cadastrarOng = (payload) => apiRequest('/ong/register/ong', { method: 'POST', dados: payload });
