/* Redefinição de senha (doador e ONG), em duas etapas no mesmo cartão:
   1) a pessoa informa o e-mail e o back envia um código de 6 dígitos;
   2) ela digita o código + a nova senha e o back troca a senha.
   Depois do sucesso, volta para o login certo (usuário ou ONG). */

import { solicitarRecuperacaoSenha, confirmarRecuperacaoSenha } from '../services/api.js';
import { mostrarModalSucesso } from './modal-sucesso.js';
import { comCarregando } from './modal-carregando.js';
import { REENVIO_ESPERA_S } from './codigo-verificacao.js';
import { setupPasswordInputs } from './password-inputs.js';
import logoCivvoSvg from '../assets/logo-civvo.svg';

/* mesmo mínimo que o medidor de força trata como "fraca" (menos de 8 caracteres) */
const SENHA_MINIMA = 8;

/* tempo (ms) que o modal de sucesso fica visível antes de voltar ao login */
const ATRASO_VOLTA_MS = 2500;

const DESTINOS = {
    user: { papel: 'Usuário', login: '#/login-user' },
    ong: { papel: 'ONG', login: '#/login-ong' },
};

const TEXTOS = {
    email: {
        titulo: 'Esqueceu sua senha?',
        subtitulo: 'Informe o e-mail da sua conta e enviaremos um código para você criar uma nova senha.',
    },
    nova: {
        titulo: 'Crie uma nova senha',
        subtitulo: 'Digite o código que enviamos e escolha a nova senha.',
    },
};

export function renderRedefinirSenha(tipo = 'user') {
    const destino = DESTINOS[tipo] || DESTINOS.user;
    const app = document.getElementById('app');

    app.innerHTML = `
    <header class="topbar">
        <a href="${destino.login}" class="back-link" aria-label="Voltar para o login">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
            </svg>
        </a>
        <img class="logo-civvo" src="${logoCivvoSvg}" alt="Logo Civvo" />
    </header>

    <main class="auth-page">
        <p class="auth-role"></p>
        <h1 class="titulo-auth" id="rs-titulo" tabindex="-1"></h1>
        <p class="auth-subtitle" id="rs-subtitulo"></p>

        <section class="auth-card">
            <form id="rs-email-form" class="auth-form" novalidate>
                <label class="auth-field" for="rs-email">
                    <span>E-mail da conta</span>
                    <input id="rs-email" name="email" type="email" placeholder="seu@email.com" autocomplete="email" required />
                </label>

                <button type="submit" class="auth-button">Enviar código</button>
            </form>

            <form id="rs-nova-form" class="auth-form" style="display:none" novalidate>
                <p class="auth-code__texto">
                    Se existir uma conta com <strong class="auth-code__email"></strong>,
                    enviamos um código de 6 dígitos para esse e-mail. Ele vale por 10 minutos.
                </p>

                <label class="auth-field" for="rs-codigo">
                    <span>Código de verificação</span>
                    <input id="rs-codigo" name="codigo" class="auth-code__input" type="text" inputmode="numeric"
                           autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000" required />
                </label>

                <label class="auth-field" for="rs-senha">
                    <span>Nova senha</span>
                    <div class="password-input-wrapper" data-password-field>
                        <input id="rs-senha" name="novaSenha" type="password" placeholder="Crie uma nova senha" autocomplete="new-password" aria-describedby="rs-forca-texto" data-password-strength-input required />
                        <button class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false"></button>
                    </div>
                    <div class="password-strength" data-password-strength data-strength="none">
                        <div class="password-strength-track" role="meter" aria-label="Força da senha" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0" aria-valuetext="Sem avaliação">
                            <span class="password-strength-fill"></span>
                        </div>
                        <p class="password-strength-text" id="rs-forca-texto" aria-live="polite">Digite uma senha para ver a força.</p>
                    </div>
                </label>

                <label class="auth-field" for="rs-confirma">
                    <span>Confirmar nova senha</span>
                    <div class="password-input-wrapper" data-password-field>
                        <input id="rs-confirma" name="confirmarSenha" type="password" placeholder="Repita a nova senha" autocomplete="new-password" required />
                        <button class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false"></button>
                    </div>
                </label>

                <button type="submit" class="auth-button">Redefinir senha</button>

                <p class="auth-code__dica">Não chegou? Confira a caixa de spam.</p>

                <div class="auth-code__acoes">
                    <button type="button" data-reenviar></button>
                    <button type="button" data-trocar>Usar outro e-mail</button>
                </div>
            </form>
        </section>

        <p class="auth-switch">
            Lembrou a senha?
            <a href="${destino.login}">Voltar ao login</a>
        </p>
    </main>
  `;

    /* textos via textContent (nada de HTML vindo de fora) */
    app.querySelector('.auth-role').textContent = destino.papel;

    const titulo = document.getElementById('rs-titulo');
    const subtitulo = document.getElementById('rs-subtitulo');
    const formEmail = document.getElementById('rs-email-form');
    const formNova = document.getElementById('rs-nova-form');
    const campoEmail = document.getElementById('rs-email');
    const campoCodigo = document.getElementById('rs-codigo');
    const campoSenha = document.getElementById('rs-senha');
    const campoConfirma = document.getElementById('rs-confirma');
    const botaoEmail = formEmail.querySelector('[type="submit"]');
    const botaoNova = formNova.querySelector('[type="submit"]');
    const reenviar = formNova.querySelector('[data-reenviar]');
    const trocar = formNova.querySelector('[data-trocar]');

    setupPasswordInputs(formNova);

    let emailAtual = '';
    let restante = 0;
    let timer = null;

    const mostrarStatus = (form, depoisDe, texto, erro = false) => {
        form.querySelector('.auth-status')?.remove();

        const status = document.createElement('p');
        status.className = erro ? 'auth-status error' : 'auth-status';
        status.setAttribute('role', erro ? 'alert' : 'status');
        status.textContent = texto;
        depoisDe.after(status);
    };

    function irParaEtapa(etapa) {
        const nova = etapa === 'nova';

        titulo.textContent = TEXTOS[etapa].titulo;
        subtitulo.textContent = TEXTOS[etapa].subtitulo;
        formEmail.style.display = nova ? 'none' : '';
        formNova.style.display = nova ? '' : 'none';
        formEmail.querySelector('.auth-status')?.remove();
        formNova.querySelector('.auth-status')?.remove();

        (nova ? campoCodigo : campoEmail).focus();
    }

    /* "Reenviar código" com espera (mesma regra do cadastro e do login) */
    function atualizarReenvio() {
        reenviar.disabled = restante > 0;
        reenviar.textContent = restante > 0 ? `Reenviar código (${restante}s)` : 'Reenviar código';
    }

    function iniciarEspera() {
        restante = REENVIO_ESPERA_S;
        atualizarReenvio();
        clearInterval(timer);
        timer = setInterval(() => {
            if (!formNova.isConnected) {
                clearInterval(timer); /* a página foi trocada */
                return;
            }
            restante -= 1;
            atualizarReenvio();
            if (restante <= 0) clearInterval(timer);
        }, 1000);
    }

    /* só dígitos, no máximo 6 (vale também para colar) */
    campoCodigo.addEventListener('input', () => {
        campoCodigo.value = campoCodigo.value.replace(/\D/g, '').slice(0, 6);
    });

    /* ---- etapa 1: pedir o código ---- */
    formEmail.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = campoEmail.value.trim();
        if (!email || !campoEmail.checkValidity()) {
            mostrarStatus(formEmail, botaoEmail, 'Informe um e-mail válido.', true);
            campoEmail.focus();
            return;
        }

        const textoOriginal = botaoEmail.textContent;
        botaoEmail.disabled = true;
        botaoEmail.textContent = 'Enviando código…';

        try {
            await comCarregando(
                {
                    titulo: 'Enviando o código',
                    mensagens: [
                        'Procurando a sua conta…',
                        'Enviando o código para o seu e-mail…',
                        'Quase lá…',
                    ],
                },
                () => solicitarRecuperacaoSenha(email)
            );

            emailAtual = email;
            formNova.querySelector('.auth-code__email').textContent = email;
            campoCodigo.value = '';
            irParaEtapa('nova');
            iniciarEspera();
        } catch (error) {
            mostrarStatus(formEmail, botaoEmail, error.message || 'Não foi possível enviar o código agora.', true);
        } finally {
            botaoEmail.disabled = false;
            botaoEmail.textContent = textoOriginal;
        }
    });

    /* ---- etapa 2: código + nova senha ---- */
    formNova.addEventListener('submit', async (event) => {
        event.preventDefault();

        const codigo = campoCodigo.value;
        const novaSenha = campoSenha.value;

        const erro = !/^\d{6}$/.test(codigo)
            ? ['Digite os 6 dígitos do código.', campoCodigo]
            : [...novaSenha].length < SENHA_MINIMA
              ? [`A nova senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`, campoSenha]
              : novaSenha !== campoConfirma.value
                ? ['As senhas não conferem.', campoConfirma]
                : null;

        if (erro) {
            mostrarStatus(formNova, botaoNova, erro[0], true);
            erro[1].focus();
            return;
        }

        const textoOriginal = botaoNova.textContent;
        botaoNova.disabled = true;
        botaoNova.textContent = 'Redefinindo…';

        try {
            await comCarregando(
                {
                    titulo: 'Redefinindo sua senha',
                    mensagens: ['Validando o código…', 'Salvando a nova senha…', 'Quase lá…'],
                },
                () => confirmarRecuperacaoSenha({ email: emailAtual, codigo, novaSenha })
            );

            clearInterval(timer);

            /* o botão fica travado; ao terminar o modal, a pessoa volta ao login para entrar com a nova senha */
            mostrarModalSucesso({
                titulo: 'Senha redefinida!',
                texto: 'Estamos te levando para o login',
                duracao: ATRASO_VOLTA_MS,
                aoConcluir: () => {
                    window.location.hash = destino.login;
                },
            });
        } catch (error) {
            mostrarStatus(formNova, botaoNova, error.message || 'Não foi possível redefinir a senha agora.', true);
            botaoNova.disabled = false;
            botaoNova.textContent = textoOriginal;
            campoCodigo.select();
        }
    });

    reenviar.addEventListener('click', async () => {
        reenviar.disabled = true;

        try {
            await solicitarRecuperacaoSenha(emailAtual);
            campoCodigo.value = '';
            campoCodigo.focus();
            mostrarStatus(formNova, botaoNova, 'Enviamos um novo código para o seu e-mail.');
            iniciarEspera();
        } catch (error) {
            mostrarStatus(formNova, botaoNova, error.message || 'Não foi possível reenviar o código.', true);
            restante = 0;
            atualizarReenvio();
        }
    });

    trocar.addEventListener('click', () => {
        clearInterval(timer);
        campoSenha.value = '';
        campoConfirma.value = '';
        campoEmail.value = emailAtual;
        irParaEtapa('email');
        campoEmail.select();
    });

    irParaEtapa('email');
}
