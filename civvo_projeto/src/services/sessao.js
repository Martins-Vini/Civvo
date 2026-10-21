/* Sessão do usuário no front.
   Centraliza leitura/gravação (sessionStorage) e converte a resposta de login do back
   para o formato que o app logado (public/app/js/core/sessao.js) espera: { perfil, usuario, token }.
   Fica separado do bridge.js para as páginas poderem importar sem dependência circular. */

export const CHAVE = 'civvo.sessao';
export const PERFIS = { DOADOR: 'doador', ONG: 'ong', ADMIN: 'admin' };

export function lerSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function salvarSessao(sessao) {
  sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
}

export function limparSessao() {
  sessionStorage.removeItem(CHAVE);
}

/* Primeira tela depois do login. */
export function rotaInicial(sessao) {
  return sessao?.perfil === PERFIS.ADMIN ? '#/admin' : '#/feed';
}

/* Lê o payload do JWT só para saber quando expira; quem valida a assinatura é o back. */
function lerPayloadToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* Sem token (modo demo) ou sem "exp" no token: não dá para saber, então deixa o back decidir. */
export function tokenExpirado(token) {
  if (!token) return false;
  const payload = lerPayloadToken(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}

const semVazios = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

/* Converte a resposta de login do back (user / ong / admin) no formato da sessão do app.
   - Doador: { user: { id, nome, apelido, avatar } }
   - ONG:    { ong: { id, ongProfileId, razaoSocial, nomeFantasia, cnpj } }
   - Admin:  { admin: { id, nomeCompleto, cargo, roleLevel } }
   `extras` completa o que o back não devolve (ex.: o e-mail digitado no login). */
export function criarSessao(perfil, resposta = {}, extras = {}) {
  const token = resposta.token || null;
  let usuario;

  if (perfil === PERFIS.ONG) {
    const o = resposta.ong || {};
    usuario = {
      id: o.id,
      ong_profile_id: o.ongProfileId,
      nome_fantasia: o.nomeFantasia,
      razao_social: o.razaoSocial,
      cnpj: o.cnpj,
      email: extras.email,
    };
  } else if (perfil === PERFIS.ADMIN) {
    const a = resposta.admin || {};
    usuario = {
      id: a.id,
      nome: a.nomeCompleto,
      cargo: a.cargo,
      role_level: a.roleLevel,
      email: extras.email,
    };
  } else {
    const u = resposta.user || {};
    usuario = {
      id: u.id,
      nome: u.nome,
      /* o login do back não devolve o sobrenome; '' evita herdar o sobrenome de exemplo do app */
      sobrenome: u.sobrenome ?? '',
      apelido_unico: u.apelido,
      avatar_url: u.avatar,
      email: extras.email,
    };
  }

  return { perfil, usuario: semVazios(usuario), token };
}
