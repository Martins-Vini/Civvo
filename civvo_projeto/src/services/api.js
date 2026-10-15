const API_BASE_URL = 'http://localhost:3000/api';

async function request(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        const errorMessage = await response.json().catch(() => ({ message: 'Erro ao comunicar com a API.' }));
        throw new Error(errorMessage.message || 'Erro ao comunicar com a API.');
    }

    return response.json().catch(() => ({ message: 'Operação concluída com sucesso.' }));
}

export async function loginUser(payload) {
    return request('/login-user', 'POST', payload);
}

export async function loginOng(payload) {
    return request('/login-ong', 'POST', payload);
}

export async function cadastrarUser(payload) {
    return request('/cadastro-user', 'POST', payload);
}

export async function cadastrarOng(payload) {
    return request('/cadastro-ong', 'POST', payload);
}

