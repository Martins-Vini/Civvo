import { cadastrarUser } from '../services/api.js';
import logoCivvoSvg from '../assets/logo-civvo.svg';
import { setupPasswordInputs } from './password-inputs.js';

const apenasDigitos = (valor) => String(valor || '').replace(/\D/g, '');

export function renderCadastroUser() {
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
    <p class="auth-role">Usuário</p>
        <h1 class="titulo-auth">Registre-se agora.</h1>
        <p class="auth-subtitle">Cadastre suas informações <span class="span-auth">abaixo.</span></p>

      <section class="auth-card">
        <form id="cadastro-user-form" class="auth-form">
          <label class="auth-field" for="nome">
            <span>Nome</span>
            <input id="nome" name="nome" type="text" placeholder="Seu nome" autocomplete="given-name" required />
          </label>

          <label class="auth-field" for="sobrenome">
            <span>Sobrenome</span>
            <input id="sobrenome" name="sobrenome" type="text" placeholder="Seu sobrenome" autocomplete="family-name" required />
          </label>

          <label class="auth-field" for="email">
            <span>E-mail</span>
            <input id="email" name="email" type="email" placeholder="seu@email.com" autocomplete="email" required />
          </label>

          <label class="auth-field" for="password">
            <span>Senha</span>
            <div class="password-input-wrapper" data-password-field>
              <input id="password" name="password" type="password" placeholder="Crie uma senha" autocomplete="new-password" aria-describedby="password-strength-text" data-password-strength-input required />
              <button class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button>
            </div>
            <div class="password-strength" data-password-strength data-strength="none">
              <div class="password-strength-track" role="meter" aria-label="Força da senha" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0" aria-valuetext="Sem avaliação">
                <span class="password-strength-fill"></span>
              </div>
              <p class="password-strength-text" id="password-strength-text" aria-live="polite">Digite uma senha para ver a força.</p>
            </div>
          </label>

          <label class="auth-field" for="confirmPassword">
            <span>Confirmar senha</span>
            <div class="password-input-wrapper" data-password-field>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita sua senha" autocomplete="new-password" required />
              <button class="password-toggle" type="button" aria-label="Mostrar senha" aria-pressed="false">Mostrar</button>
            </div>
          </label>

          <label class="auth-field" for="apelido_unico">
            <span>Apelido único</span>
            <input id="apelido_unico" name="apelido_unico" type="text" placeholder="Seu apelido" autocomplete="username" required />
          </label>

          <label class="auth-field" for="cpf">
            <span>CPF (Opcional)</span>
            <input id="cpf" name="cpf" type="text" inputmode="numeric" maxlength="14" placeholder="12345678999" autocomplete="off" />
          </label>

          <label class="auth-field" for="cadunico">
            <span>CadÚnico (Opcional)</span>
            <input id="cadunico" name="cadunico" type="text" inputmode="numeric" placeholder="123456789" autocomplete="off" />
          </label>

          <button type="submit" class="auth-button">Cadastrar</button>
          <div class="divider">
            <span>Ou prosseguir com</span>
          </div>
          <button type="button" class="google-button">
            <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.4 14.7 2.5 12 2.5 6.9 2.5 2.8 6.7 2.8 12s4.1 9.5 9.2 9.5c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.2-.2-1.7H12Z"/>
              <path fill="#4285F4" d="M3.9 7.5l3.4 2.5c.9-1.7 2.9-2.9 4.7-2.9 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.7 3.4 14.7 2.5 12 2.5c-3.3 0-6.1 1.9-8.1 4.9Z"/>
              <path fill="#FBBC05" d="M3.9 16.5A9.5 9.5 0 0 1 3.4 12c0-1 .2-2 .6-2.9L.9 6.5A12.2 12.2 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l2.6-1.4Z"/>
              <path fill="#34A853" d="M12 21.5c2.5 0 4.6-.8 6.2-2.3l-2.9-2.4c-.8.6-1.8 1-3.3 1-2.6 0-4.8-1.7-5.5-4l-3 2.3A9.4 9.4 0 0 0 12 21.5Z"/>
            </svg>
            <span>Cadastrar com o Google</span>
          </button>
        </form>
      </section>
      <p class="auth-switch">
          Já tem uma conta?
          <a href="#/login-user">Faça login</a>
        </p>
    </main>
  `;

    const form = document.getElementById('cadastro-user-form');
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

        const valores = Object.fromEntries(new FormData(form).entries());

        if (valores.password !== valores.confirmPassword) {
            mostrarStatus('As senhas não conferem.', true);
            return;
        }

        const cpf = apenasDigitos(valores.cpf);
        if (cpf && cpf.length !== 11) {
            mostrarStatus('O CPF deve ter 11 dígitos.', true);
            return;
        }

        /* O back usa estes nomes de campo. cpf e cadunico_file vão como null quando vazios
           (o model do back não aceita undefined nesses campos). */
        const payload = {
            email: valores.email.trim(),
            password: valores.password,
            nome: valores.nome.trim(),
            sobrenome: valores.sobrenome.trim(),
            apelido_unico: valores.apelido_unico.trim(),
            cpf: cpf || null,
            cadunico_file: apenasDigitos(valores.cadunico) || null,
        };

        const submitButton = form.querySelector('[type="submit"]');
        const textoOriginal = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = 'Cadastrando…';

        try {
            await cadastrarUser(payload);

            mostrarStatus('Cadastro realizado com sucesso! Redirecionando para o login…');

            /* o back não devolve token no cadastro, então o próximo passo é entrar */
            setTimeout(() => {
                if (window.location.hash === '#/cadastro-user') {
                    window.location.hash = '#/login-user';
                }
            }, 1500);
        } catch (error) {
            mostrarStatus(error.message || 'Não foi possível cadastrar agora.', true);
            submitButton.disabled = false;
            submitButton.textContent = textoOriginal;
        }
    });
}
