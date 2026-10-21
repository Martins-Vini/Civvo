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

/* Rotas de autenticação do back */
export const loginUser = (payload) => apiRequest('/auth/login', { method: 'POST', dados: payload });
export const loginOng = (payload) => apiRequest('/ong/login/ong', { method: 'POST', dados: payload });
export const cadastrarUser = (payload) => apiRequest('/auth/register/doador', { method: 'POST', dados: payload });
export const cadastrarOng = (payload) => apiRequest('/ong/register/ong', { method: 'POST', dados: payload });
