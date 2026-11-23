/* Tela: busca de ONGs e Doadores, com abas separadas (item 9). */

let BUSCA_TIPO = 'ONG';
let BUSCA_TMR = 0;

const ongCardHtml = (o) => `
  <a href="#/ong/${o.id}" class="gi" style="color:inherit">
    ${av(o.name, o.h, 56)}
    <b>${esc(o.name)}</b>
    ${o.ver ? VER : ''}
    <br>
    <small style="color:var(--mut)">${esc(o.cat)} · ${o.followers}</small>
  </a>`;

/* resultado vindo da API real (/buscar), tanto para ONG quanto para doador */
const resultadoCardHtml = (r) => {
  const href = r.tipo == 'ONG' ? `#/ong/${r.ong_id}` : `#/doador/${r.user_id}`;
  const sub = [r.subtitulo, r.cidade].filter(Boolean).join(' · ');
  return `
    <a href="${href}" class="gi" style="color:inherit">
      ${av(r.nome, (r.ong_id || r.user_id || 0) * 70, 56, r.avatar)}
      <b>${esc(r.nome)}</b>
      ${r.is_verified ? VER : ''}
      <br>
      <small style="color:var(--mut)">${esc(sub)}</small>
    </a>`;
};

function buscaTabsHtml() {
  return `
    <div class="seg" role="tablist" aria-label="Tipo de busca" style="margin-bottom:14px">
      <button class="mt ${BUSCA_TIPO == 'ONG' ? 'on' : ''}" role="tab" aria-selected="${BUSCA_TIPO == 'ONG'}" onclick="buscaMudarTipo('ONG')">ONGs</button>
      <button class="mt ${BUSCA_TIPO == 'DOADOR' ? 'on' : ''}" role="tab" aria-selected="${BUSCA_TIPO == 'DOADOR'}" onclick="buscaMudarTipo('DOADOR')">Doadores</button>
    </div>`;
}

function buscaMudarTipo(tipo) {
  BUSCA_TIPO = tipo;
  go();
  setTimeout(() => $('#buscaIn')?.focus(), 0);
}

async function buscaResultados(v) {
  const alvo = $('#rs');
  if (!alvo) return;
  const q = (v || '').trim();

  if (DEMO) {
    alvo.innerHTML = BUSCA_TIPO == 'ONG' ? ongCards(q) : '<p class="emp">Busca de doadores estará disponível em breve nesta prévia.</p>';
    return;
  }

  alvo.innerHTML = '<p class="emp" role="status">Buscando…</p>';
  try {
    const lista = await API.buscar(q, BUSCA_TIPO);
    alvo.innerHTML = lista.length
      ? lista.map(resultadoCardHtml).join('')
      : `<p class="emp">Nenhum${BUSCA_TIPO == 'ONG' ? 'a ONG encontrada' : ' doador encontrado'}${q ? ` para “${esc(q)}”` : ''}.</p>`;
  } catch (e) {
    alvo.innerHTML = '<p class="emp">Não foi possível buscar agora. Tente de novo.</p>';
  }
}

function buscaDigitou(v) {
  clearTimeout(BUSCA_TMR);
  BUSCA_TMR = setTimeout(() => buscaResultados(v), DEMO ? 0 : 300);
}

const ongCards = (v) => {
  if (!ONGS.length) return '<p class="emp">Nenhuma ONG cadastrada ainda.</p>';

  const query = (v || '').toLowerCase();
  const l = ONGS.filter((o) => (o.name + o.cat + o.city).toLowerCase().includes(query));

  if (!l.length) return `<p class="emp">Nenhuma ONG encontrada para “${esc(v)}”. Tente outro nome ou causa.</p>`;

  return l.map(ongCardHtml).join('');
};

V.buscar = () => {
  const content = `
    <div class="top"><h1>Explorar</h1></div>
    ${buscaTabsHtml()}
    <input 
      id="buscaIn"
      class="in" 
      aria-label="Buscar ${BUSCA_TIPO == 'ONG' ? 'ONGs' : 'doadores'}" 
      placeholder="Buscar por nome, causa ou cidade" 
      oninput="buscaDigitou(this.value)" 
      style="margin-bottom:18px"
    >
    <div 
      id="rs" 
      class="grid3" 
      style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); margin-top:0"
    >
      ${DEMO && BUSCA_TIPO == 'ONG' ? ongCards('') : '<p class="emp" role="status">Carregando…</p>'}
    </div>
  `;

  setTimeout(() => buscaResultados($('#buscaIn')?.value || ''), 0);

  return shell(content, 'buscar');
};
