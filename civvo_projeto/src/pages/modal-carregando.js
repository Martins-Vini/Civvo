/* Modal de carregamento: spinner, barra de progresso e uma série de mensagens que vão trocando enquanto a espera dura.

   - Só aparece se a espera passar de `atraso` ms, para não "piscar" em respostas rápidas.
   - A barra é estimada (o back não informa progresso): avança rápido e vai desacelerando até ~92%;
     ao terminar, completa os 100% antes de sumir.
   - As mensagens avançam em ordem e a última fica fixa (use algo como "Quase lá…" nela).
   - Se a pessoa mudar de rota (ex.: botão voltar), o modal é fechado. */

const DURACAO_SAIDA_MS = 220;

export function mostrarModalCarregando({
    titulo = 'Carregando',
    mensagens = ['Aguarde um instante…'],
    intervalo = 2200, /* ms entre uma mensagem e a próxima */
    atraso = 350,     /* ms de espera antes de o modal aparecer */
} = {}) {
    const reduzirMovimento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lista = mensagens.length ? mensagens : ['Aguarde um instante…'];

    let overlay = null;
    let barra = null;
    let texto = null;
    let progresso = 0;
    let indice = 0;
    let fechado = false;
    let timerAparecer = null;
    let timerBarra = null;
    let timerMensagem = null;
    let overflowAnterior = '';

    function aparecer() {
        if (fechado) return;

        overlay = document.createElement('div');
        overlay.className = 'modal-carregando';
        overlay.innerHTML = `
            <div class="modal-carregando__card" role="dialog" aria-modal="true" aria-busy="true"
                 aria-labelledby="modal-carregando-titulo" aria-describedby="modal-carregando-texto" tabindex="-1">
                <span class="modal-carregando__spinner" aria-hidden="true"></span>
                <h2 class="modal-carregando__titulo" id="modal-carregando-titulo"></h2>
                <div class="modal-carregando__progresso" aria-hidden="true"><span></span></div>
                <p class="modal-carregando__texto" id="modal-carregando-texto" aria-live="polite"></p>
            </div>
        `;

        /* textos via textContent (nada de HTML vindo de fora) */
        overlay.querySelector('.modal-carregando__titulo').textContent = titulo;
        texto = overlay.querySelector('.modal-carregando__texto');
        texto.textContent = lista[0];
        barra = overlay.querySelector('.modal-carregando__progresso span');

        overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.append(overlay);

        const card = overlay.querySelector('.modal-carregando__card');
        card.focus();

        /* enquanto carrega, o foco fica preso no próprio modal */
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') e.preventDefault();
        });

        timerBarra = setInterval(() => {
            progresso += (92 - progresso) * 0.07;
            barra.style.width = `${progresso.toFixed(1)}%`;
        }, 120);

        if (lista.length > 1) {
            timerMensagem = setInterval(trocarMensagem, intervalo);
        }
    }

    function trocarMensagem() {
        if (indice >= lista.length - 1) {
            clearInterval(timerMensagem);
            return;
        }

        indice += 1;

        if (reduzirMovimento) {
            texto.textContent = lista[indice];
            return;
        }

        texto.classList.add('modal-carregando__texto--trocando');
        setTimeout(() => {
            if (fechado) return;
            texto.textContent = lista[indice];
            texto.classList.remove('modal-carregando__texto--trocando');
        }, 180);
    }

    function fechar() {
        if (fechado) return;
        fechado = true;

        clearTimeout(timerAparecer);
        clearInterval(timerBarra);
        clearInterval(timerMensagem);
        window.removeEventListener('hashchange', fechar);

        if (!overlay) return; /* nunca chegou a aparecer */

        /* completa a barra antes de sumir */
        barra.style.width = '100%';

        const remover = () => {
            overlay.remove();
            document.body.style.overflow = overflowAnterior;
        };

        if (reduzirMovimento) {
            remover();
            return;
        }

        setTimeout(() => {
            overlay.classList.add('modal-carregando--saindo');
            setTimeout(remover, DURACAO_SAIDA_MS);
        }, 160);
    }

    window.addEventListener('hashchange', fechar);
    timerAparecer = setTimeout(aparecer, atraso);

    return { fechar };
}

/* Atalho: abre o modal, executa a ação e garante o fechamento (com sucesso ou erro). */
export async function comCarregando(opcoes, acao) {
    const carregando = mostrarModalCarregando(opcoes);
    try {
        return await acao();
    } finally {
        carregando.fechar();
    }
}
