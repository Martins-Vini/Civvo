/* Tela: busca de ONGs. */

const ongCards = (v) => {
  if (!ONGS.length) {
    return '<p class="emp">Nenhuma ONG cadastrada ainda.</p>';
  }

  const query = (v || '').toLowerCase();
  const l = ONGS.filter((o) =>
    (o.name + o.cat + o.city).toLowerCase().includes(query)
  );

  if (!l.length) {
    return `<p class="emp">Nenhuma ONG encontrada para “${esc(v)}”. Tente outro nome ou causa.</p>`;
  }

  return l
    .map((o) => `
      <a href="#/ong/${o.id}" class="gi" style="color:inherit">
        ${av(o.name, o.h, 56)}
        <b>${esc(o.name)}</b>
        ${o.ver ? VER : ''}
        <br>
        <small style="color:var(--mut)">${esc(o.cat)} · ${o.followers}</small>
      </a>
    `)
    .join('');
};

V.buscar = () => {
  const content = `
    <div class="top"><h1>Explorar</h1></div>
    <input 
      class="in" 
      aria-label="Buscar ONGs" 
      placeholder="Buscar por nome, causa ou cidade" 
      oninput="$('#rs').innerHTML=ongCards(this.value)" 
      style="margin-bottom:18px"
    >
    <div 
      id="rs" 
      class="grid3" 
      style="grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); margin-top:0"
    >
      ${ongCards('')}
    </div>
  `;

  return shell(content, 'buscar');
};