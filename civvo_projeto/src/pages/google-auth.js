/* Liga o botão "Entrar/Cadastrar com o Google" das telas do doador.
   Login e cadastro são o mesmo fluxo no back: se o e-mail ainda não existe, a conta é criada na hora.
   Contas Google não passam pelo 2FA por e-mail (o Google já autenticou a pessoa). */

import { loginGoogle } from '../services/api.js';
import { ativarBotaoGoogle, emailDoCredential } from '../services/google.js';
import { criarSessao, salvarSessao, rotaInicial } from '../services/sessao.js';
import { mostrarModalSucesso } from './modal-sucesso.js';

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
                const dados = await loginGoogle({ token: credential });
                if (!dados.token) throw new Error('Não foi possível concluir o login com o Google.');

                const sessao = criarSessao('doador', dados, { email: emailDoCredential(credential) });
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
