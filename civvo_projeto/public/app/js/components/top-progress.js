/* Barra fina no topo durante a troca de sessão (efeito de transição, como no Instagram web).
   TopBar.start() é chamado quando a rota muda (router.js) e TopBar.done() quando a tela termina de ser desenhada.
   A barra fica visível por pelo menos MIN ms, para a transição ser percebida mesmo em telas instantâneas. */

const TopBar = (() => {
  const MIN = 380;
  const LIMITE = 8000;
  let el = null;
  let bar = null;
  let ativo = false;
  let inicio = 0;
  let timers = [];

  const agendar = (fn, ms) => timers.push(setTimeout(fn, ms));

  const limpar = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  function montar() {
    if (el && el.isConnected) return;
    el = document.createElement('div');
    el.className = 'nprog';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<b></b>';
    document.body.appendChild(el);
    bar = el.firstElementChild;
  }

  function mover(largura, duracao) {
    bar.style.transitionDuration = duracao;
    bar.style.width = largura;
  }

  function start() {
    montar();
    limpar();
    ativo = true;
    inicio = Date.now();

    /* volta ao zero sem animar */
    el.classList.remove('on');
    mover('0%', '0s');
    void bar.offsetWidth;

    el.classList.add('on');
    mover('72%', '.28s');
    agendar(() => mover('90%', '6s'), 300); /* depois do salto inicial, avança devagar */
    agendar(done, LIMITE); /* garantia: nunca fica presa na tela */
  }

  function done() {
    if (!ativo) return;
    ativo = false;
    limpar();

    const resta = Math.max(0, MIN - (Date.now() - inicio));

    agendar(() => {
      mover('100%', '.16s');
      agendar(() => el.classList.remove('on'), 190);
      agendar(() => mover('0%', '0s'), 500);
    }, resta);
  }

  return { start, done };
})();
