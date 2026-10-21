import { cadastrarOng } from '../services/api.js';
import logoCivvoSvg from '../assets/logo-civvo.svg';
import { setupPasswordInputs } from './password-inputs.js';

const apenasDigitos = (valor) => String(valor || '').replace(/\D/g, '');

function mascararCnpj(valor) {
    return apenasDigitos(valor)
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

export function renderCadastroOng() {
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
        <h1 class="titulo-auth">Registre sua ONG</h1>
        <p class="auth-subtitle">Preencha as informações <span class="span-auth">abaixo.</span> </p>
      <section class="auth-card">

        <form id="cadastro-ong-form" class="auth-form">
          <label class="auth-field" for="cnpj">
            <span>CNPJ</span>
            <input id="cnpj" name="cnpj" type="text" inputmode="numeric" maxlength="18" placeholder="00.000.000/0000-00" autocomplete="off" aria-describedby="cnpj-ajuda" required />
            <small class="auth-help" id="cnpj-ajuda">Razão social, nome fantasia e endereço são preenchidos automaticamente pela Receita Federal.</small>
          </label>

          <label class="auth-field" for="email">
            <span>E-mail institucional</span>
            <input id="email" name="email" type="email" placeholder="contato@ong.com.br" autocomplete="email" required />
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

          <div class="auth-field">
            <span>Telefone de contato</span>
            <div class="auth-phone">
              <input id="ddd" name="ddd" type="text" inputmode="numeric" maxlength="2" placeholder="DDD" aria-label="DDD" autocomplete="tel-area-code" required />
              <input id="telefone" name="telefone" type="text" inputmode="numeric" maxlength="10" placeholder="Número" aria-label="Número de telefone" autocomplete="tel-local" required />
            </div>
          </div>

          <label class="auth-check" for="is_whatsapp">
            <input id="is_whatsapp" name="is_whatsapp" type="checkbox" />
            <span>Este número tem WhatsApp</span>
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
          Já tem conta da ONG?
          <a href="#/login-ong">Faça login</a>
        </p>
    </main>
  `;

    const form = document.getElementById('cadastro-ong-form');
    setupPasswordInputs(form);

    const campoCnpj = form.querySelector('#cnpj');
    campoCnpj.addEventListener('input', () => {
        campoCnpj.value = mascararCnpj(campoCnpj.value);
    });

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

        const cnpj = apenasDigitos(valores.cnpj);
        if (cnpj.length !== 14) {
            mostrarStatus('O CNPJ deve ter 14 dígitos.', true);
            return;
        }

        const ddd = apenasDigitos(valores.ddd);
        const numero = apenasDigitos(valores.telefone);
        if (ddd.length !== 2) {
            mostrarStatus('Informe o DDD com 2 dígitos.', true);
            return;
        }
        if (numero.length < 8 || numero.length > 9) {
            mostrarStatus('O telefone deve ter 8 ou 9 dígitos.', true);
            return;
        }

        /* Razão social, nome fantasia, CNAE e endereço o back busca na Receita Federal pelo CNPJ. */
        const payload = {
            email: valores.email.trim(),
            password: valores.password,
            cnpj,
            telefone: {
                ddd,
                numero,
                is_whatsapp: form.elements.is_whatsapp.checked,
            },
        };

        const submitButton = form.querySelector('[type="submit"]');
        const textoOriginal = submitButton.textContent;

        submitButton.disabled = true;
        submitButton.textContent = 'Validando CNPJ…'; /* o back consulta a Receita, pode levar alguns segundos */

        try {
            await cadastrarOng(payload);

            mostrarStatus('ONG cadastrada e validada pela Receita Federal! Redirecionando para o login…');

            /* o back não devolve token no cadastro, então o próximo passo é entrar */
            setTimeout(() => {
                if (window.location.hash === '#/cadastro-ong') {
                    window.location.hash = '#/login-ong';
                }
            }, 2000);
        } catch (error) {
            mostrarStatus(error.message || 'Não foi possível cadastrar agora.', true);
            submitButton.disabled = false;
            submitButton.textContent = textoOriginal;
        }
    });
}
