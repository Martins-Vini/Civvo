/* Etapa "digite o código de 6 dígitos" usada no cadastro e no login do doador.
   Esconde o formulário da página, mostra o painel do código no mesmo cartão e devolve { fechar }
   (que volta para o formulário com os campos como estavam). */

/* segundos até liberar "Reenviar código" */
export const REENVIO_ESPERA_S = 30;

export function mostrarEtapaCodigo({
    form,
    email,
    titulo = 'Confirme seu e-mail',
    textoBotao = 'Confirmar',
    aoConfirmar, /* async (codigo) => void; se lançar erro, a mensagem aparece no painel */
    aoReenviar,  /* async () => void */
}) {
    const painel = document.createElement('section');
    painel.className = 'auth-code';
    painel.setAttribute('aria-labelledby', 'auth-code-titulo');
    painel.innerHTML = `
        <h2 class="auth-code__titulo" id="auth-code-titulo"></h2>
        <p class="auth-code__texto">
            Enviamos um código de 6 dígitos para <strong class="auth-code__email"></strong>.
            Ele vale por 10 minutos.
        </p>

        <form class="auth-code__form" novalidate>
            <label class="auth-field" for="codigo">
                <span>Código de verificação</span>
                <input id="codigo" name="codigo" class="auth-code__input" type="text" inputmode="numeric"
                       autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000" required />
            </label>
            <button type="submit" class="auth-button"></button>
        </form>

        <p class="auth-code__dica">Não chegou? Confira a caixa de spam.</p>

        <div class="auth-code__acoes">
            <button type="button" data-reenviar></button>
            <button type="button" data-voltar>Voltar</button>
        </div>
    `;

    /* textos via textContent (nada de HTML vindo de fora) */
    painel.querySelector('.auth-code__titulo').textContent = titulo;
    painel.querySelector('.auth-code__email').textContent = email;

    const formCodigo = painel.querySelector('.auth-code__form');
    const campo = painel.querySelector('#codigo');
    const botao = formCodigo.querySelector('[type="submit"]');
    const reenviar = painel.querySelector('[data-reenviar]');
    const voltar = painel.querySelector('[data-voltar]');
    botao.textContent = textoBotao;

    function mostrarStatus(texto, erro = false) {
        formCodigo.querySelector('.auth-status')?.remove();

        const status = document.createElement('p');
        status.className = erro ? 'auth-status error' : 'auth-status';
        status.setAttribute('role', erro ? 'alert' : 'status');
        status.textContent = texto;
        formCodigo.appendChild(status);
    }

    /* só dígitos, no máximo 6 (vale também para colar) */
    campo.addEventListener('input', () => {
        campo.value = campo.value.replace(/\D/g, '').slice(0, 6);
    });

    formCodigo.addEventListener('submit', async (event) => {
        event.preventDefault();

        const codigo = campo.value;
        if (!/^\d{6}$/.test(codigo)) {
            mostrarStatus('Digite os 6 dígitos do código.', true);
            campo.focus();
            return;
        }

        botao.disabled = true;
        botao.textContent = 'Verificando…';

        try {
            await aoConfirmar(codigo);
            /* sucesso: o botão continua travado, a página segue sozinha (modal de sucesso) */
        } catch (error) {
            mostrarStatus(error.message || 'Não foi possível verificar o código.', true);
            botao.disabled = false;
            botao.textContent = textoBotao;
            campo.select();
        }
    });

    /* "Reenviar código" com espera */
    let restante = 0;
    let timer = null;

    function atualizarReenvio() {
        reenviar.disabled = restante > 0;
        reenviar.textContent = restante > 0 ? `Reenviar código (${restante}s)` : 'Reenviar código';
    }

    function iniciarEspera() {
        restante = REENVIO_ESPERA_S;
        atualizarReenvio();
        clearInterval(timer);
        timer = setInterval(() => {
            if (!painel.isConnected) {
                clearInterval(timer); /* a página foi trocada */
                return;
            }
            restante -= 1;
            atualizarReenvio();
            if (restante <= 0) clearInterval(timer);
        }, 1000);
    }

    reenviar.addEventListener('click', async () => {
        reenviar.disabled = true;
        try {
            await aoReenviar();
            campo.value = '';
            campo.focus();
            mostrarStatus('Enviamos um novo código para o seu e-mail.');
            iniciarEspera();
        } catch (error) {
            mostrarStatus(error.message || 'Não foi possível reenviar o código.', true);
            restante = 0;
            atualizarReenvio();
        }
    });

    function fechar() {
        clearInterval(timer);
        painel.remove();
        form.style.display = '';
        form.querySelector('input')?.focus();
    }

    voltar.addEventListener('click', fechar);

    form.style.display = 'none';
    form.after(painel);
    iniciarEspera();
    campo.focus();

    return { fechar };
}
