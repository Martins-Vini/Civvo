import { loginOng } from '../services/api.js';
import { criarSessao, salvarSessao, rotaInicial } from '../services/sessao.js';
import { mostrarModalSucesso } from './modal-sucesso.js';
import logoCivvoSvg from '../assets/logo-civvo.svg';
import { setupPasswordInputs } from './password-inputs.js';

/* tempo (ms) que o modal de sucesso fica visível antes de entrar no app */
const ATRASO_ENTRADA_MS = 2500;

export function renderLoginOng() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <header class="topbar">
            <a href="#/inicio" class="back-link" aria-label="Voltar para a página inicial">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                </svg>
            </a>
            <img class="logo-civvo" src="${logoCivvoSvg}" alt="Logo Civvo" />
        </header>

    <main class="auth-page">

    <p class="auth-role">ONG</p>
        <h1 class="titulo-auth">Vamos entrar</h1>
        <p class="auth-subtitle-ong">Com sua organização social.</p>

        <p class="auth-desciption">Preencha as informações <span class="span-auth">abaixo.</span></p>
      <section class="auth-card">

        <form id="login-ong-form" class="auth-form">
          <label class="auth-field" for="email">
            <span>E-mail institucional</span>
            <input id="email" name="email" type="email" placeholder="contato@ong.com.br" required />
          </label>

          <label class="auth-field" for="password">
            <span>Senha</span>
            <div class="password-input-wrapper" data-password-field>
              <input id="password" name="password" type="password" placeholder="Digite sua senha" autocomplete="current-password" required />
              <button class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button>
            </div>
          </label>

          <a href="#" class="forgot-password">Esqueceu sua senha?</a>

          <button type="submit" class="auth-button">Entrar</button>
        </form>

      </section>

      <p class="auth-switch">
          Ainda não cadastrou a ONG?
          <a href="#/cadastro-ong">Cadastre-se</a>
        </p>
    </main>
  `;

    const form = document.getElementById('login-ong-form');
    setupPasswordInputs(form);

    const mostrarStatus = (texto, erro = false) => {
        form.querySelector('.auth-status')?.remove();

        const status = document.createElement('p');
        status.className = erro ? 'auth-status error' : 'auth-status';
        status.setAttribute('role', erro ? 'alert' : 'status');
        status.textContent = texto;
        form.appendChild(status);
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const { email, password } = Object.fromEntries(new FormData(form).entries());
        const submitButton = form.querySelector('[type="submit"]');
        const textoOriginal = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = 'Entrando…';

        try {
            const resposta = await loginOng({ email: email.trim(), password });
            const sessao = criarSessao('ong', resposta, { email: email.trim() });

            /* o botão fica travado; o modal mostra o sucesso e, ao terminar, grava a sessão e entra no app.
               Se a pessoa sair da tela nesse intervalo, o modal é cancelado e nada é gravado. */
            mostrarModalSucesso({
                duracao: ATRASO_ENTRADA_MS,
                aoConcluir: () => {
                    salvarSessao(sessao);
                    window.location.hash = rotaInicial(sessao);
                },
            });
        } catch (error) {
            mostrarStatus(error.message || 'Não foi possível entrar agora.', true);
            submitButton.disabled = false;
            submitButton.textContent = textoOriginal;
        }
    });
}
