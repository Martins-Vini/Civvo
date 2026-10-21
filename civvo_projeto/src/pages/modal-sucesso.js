/* Modal de sucesso: ícone de confirmação grande, uma barra de progresso animada e o texto de aviso.
   Fica na tela por `duracao` ms e então chama `aoConcluir` (ex.: entrar no app).
   Se a pessoa mudar de rota enquanto o modal está aberto (ex.: botão voltar), ele é cancelado sem chamar `aoConcluir`. */

export function mostrarModalSucesso({
    titulo = 'Login feito com sucesso!',
    texto = 'Estamos te levando para a página',
    duracao = 2500,
    aoConcluir = () => {},
} = {}) {
    const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const overlay = document.createElement('div');
    overlay.className = 'modal-sucesso';
    overlay.innerHTML = `
        <div class="modal-sucesso__card" role="alertdialog" aria-modal="true"
             aria-labelledby="modal-sucesso-titulo" aria-describedby="modal-sucesso-texto" tabindex="-1">
            <svg class="modal-sucesso__icone" viewBox="0 0 52 52" aria-hidden="true">
                <circle class="modal-sucesso__circulo" cx="26" cy="26" r="24" fill="none" />
                <path class="modal-sucesso__check" fill="none" d="M14 27l8 8 16-17" />
            </svg>
            <h2 class="modal-sucesso__titulo" id="modal-sucesso-titulo"></h2>
            <div class="modal-sucesso__progresso" aria-hidden="true"><span></span></div>
            <p class="modal-sucesso__texto" id="modal-sucesso-texto"></p>
        </div>
    `;

    /* textos via textContent (nada de HTML vindo de fora) */
    overlay.querySelector('.modal-sucesso__titulo').textContent = titulo;
    const paragrafo = overlay.querySelector('.modal-sucesso__texto');
    paragrafo.textContent = texto;

    const pontos = document.createElement('span');
    pontos.className = 'modal-sucesso__pontos';
    pontos.setAttribute('aria-hidden', 'true');
    pontos.innerHTML = '<i>.</i><i>.</i><i>.</i>';
    paragrafo.append(pontos);

    overlay.querySelector('.modal-sucesso__progresso span').style.animationDuration = `${duracao}ms`;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.append(overlay);
    overlay.querySelector('.modal-sucesso__card').focus();

    let fechado = false;
    let timer = null;

    function fechar({ imediato = false } = {}) {
        if (fechado) return;
        fechado = true;
        clearTimeout(timer);
        window.removeEventListener('hashchange', cancelar);
        document.body.style.overflow = overflowAnterior;

        if (imediato || reduzirMovimento) {
            overlay.remove();
            return;
        }
        overlay.classList.add('modal-sucesso--saindo');
        setTimeout(() => overlay.remove(), 350);
    }

    /* rota mudou por outro motivo: fecha na hora e não conclui */
    function cancelar() {
        fechar({ imediato: true });
    }

    window.addEventListener('hashchange', cancelar);

    timer = setTimeout(() => {
        if (fechado) return;
        aoConcluir();
        fechar(); /* o hashchange gerado por aoConcluir cai em cancelar(), que já encontra `fechado` */
    }, duracao);

    return { fechar };
}