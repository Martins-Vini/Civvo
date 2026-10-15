import { loginOng } from '../services/api.js';
import logoCivvoSvg from '../assets/logo-civvo.svg';
import { setupPasswordInputs } from './password-inputs.js';

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

          <div class="divider">
            <span>Ou entrar com</span>
          </div>

          <button type="button" class="google-button">
            <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.4 14.7 2.5 12 2.5 6.9 2.5 2.8 6.7 2.8 12s4.1 9.5 9.2 9.5c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.2-.2-1.7H12Z"/>
              <path fill="#4285F4" d="M3.9 7.5l3.4 2.5c.9-1.7 2.9-2.9 4.7-2.9 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.4 14.7 2.5 12 2.5c-3.3 0-6.1 1.9-8.1 4.9Z"/>
              <path fill="#FBBC05" d="M3.9 16.5A9.5 9.5 0 0 1 3.4 12c0-1 .2-2 .6-2.9L.9 6.5A12.2 12.2 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l2.6-1.4Z"/>
              <path fill="#34A853" d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.6-1.8 1-3.3 1-2.6 0-4.8-1.7-5.5-4l-3 2.3A9.4 9.4 0 0 0 12 21.5Z"/>
            </svg>
            <span>Entrar com o Google</span>
          </button> 
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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = Object.fromEntries(new FormData(form).entries());
        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;

        try {
            await loginOng(payload);
            window.location.hash = '#/confirmacao-login-ong';
        } catch (error) {
            const status = document.createElement('p');
            status.className = 'auth-status error';
            status.textContent = error.message || 'Não foi possível entrar agora.';

            const oldStatus = form.querySelector('.auth-status');
            if (oldStatus) oldStatus.remove();

            form.appendChild(status);
        } finally {
            submitButton.disabled = false;
        }
    });
}
