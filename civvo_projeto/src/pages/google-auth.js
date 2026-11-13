/* Liga o botão "Entrar/Cadastrar com o Google" das telas do doador.
   Login e cadastro são o mesmo fluxo no back: se o e-mail ainda não existe, a conta é criada na hora.
   Contas Google não passam pelo 2FA por e-mail (o Google já autenticou a pessoa). */

import { loginGoogle } from '../services/api.js';
import { ativarBotaoGoogle, dadosDoCredential } from '../services/google.js';
import { criarSessao, salvarSessao, rotaInicial, decodificarToken } from '../services/sessao.js';
import { mostrarModalSucesso } from './modal-sucesso.js';
import { comCarregando } from './modal-carregando.js';

const ATRASO_ENTRADA_MS = 2500;

export function configurarGoogle({ form, mostrarStatus, texto = 'signin_with' }) {
    const botao = form.querySelector('.google-button');
    if (!botao) return;

    let enviando = false;

    ativarBotaoGoogle({
        botao,
        texto,
        aoErro: (erro) => mostrarStatus(erro.message, true),
        aoCredencial: async (credential) => {
            if (enviando) return;
            enviando = true;
            mostrarStatus('Entrando com o Google…');

            try {
                const dados = await comCarregando(
                    {
                        titulo: 'Entrando com o Google',
                        mensagens: ['Conectando com o Google…', 'Verificando a sua conta…', 'Quase lá…'],
                    },
                    () => loginGoogle(credential, 'DOADOR')
                );
                if (!dados.token) throw new Error('Não foi possível concluir o login com o Google.');

                /* O back devolve só o token (sem o usuário): o id vem do JWT dele e o nome/foto, do credential do Google. */
                const dadosToken = decodificarToken(dados.token) || {};
                if (dadosToken.userType && dadosToken.userType !== 'DOADOR') {
                    throw new Error('Este e-mail pertence a uma ONG. Entre pelo login de ONG.');
                }

                const g = dadosDoCredential(credential);
                const sessao = criarSessao(
                    'doador',
                    {
                        token: dados.token,
                        user: {
                            id: dadosToken.userId,
                            nome: g.nome,
                            sobrenome: g.sobrenome,
                            /* o back cria o apelido de contas novas como user_<id> */
                            apelido: dadosToken.userId ? `user_${dadosToken.userId}` : undefined,
                            avatar: g.avatar,
                        },
                    },
                    { email: g.email }
                );
                form.querySelector('.auth-status')?.remove();

                mostrarModalSucesso({
                    duracao: ATRASO_ENTRADA_MS,
                    aoConcluir: () => {
                        salvarSessao(sessao);
                        window.location.hash = rotaInicial(sessao);
                    },
                });
            } catch (erro) {
                mostrarStatus(erro.message || 'Não foi possível entrar com o Google.', true);
                enviando = false;
            }
        },
    });
}
