/* Termos de Uso e Política de Privacidade. 
*/

const LEGAL = {
  termos: { t: 'Termos de Uso', s: [] },
  privacidade: { t: 'Política de Privacidade', s: [] },
};

const legalPage = (k) => {
  const page = LEGAL[k];
  const sectionsHtml = page.s.length
    ? page.s.map(([h, t]) => `<h2>${esc(h)}</h2><p>${esc(t)}</p>`).join('')
    : '<p class="lg-n">Conteúdo ainda não publicado.</p>';

  return `
    <div role="main" id="conteudo" class="wl lgl">
      <button class="bkl" onclick="back()" aria-label="Voltar">
        <span class="bk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </span>
        Voltar
      </button>
      <article class="card lg-c">
        <h1>${page.t}</h1>
        ${sectionsHtml}
      </article>
    </div>
  `;
};

V.termos = () => legalPage('termos');
V.privacidade = () => legalPage('privacidade');