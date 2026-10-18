/* Voluntariado: candidatura (perfil da ONG ou vaga no feed), vagas publicadas e gestão de candidatos no painel da ONG. */

const isVol = (ongId, postId = null) => {
  return VOLUNT.some(
    (v) => v.ong == ongId && v.post == postId && v.user == USER.apelido_unico
  );
};

async function volunteer(ongId, postId, btn) {
  postId = postId || null;
  
  const mine = (v) => 
    v.ong == ongId && v.post == postId && v.user == USER.apelido_unico;
  
  const i = VOLUNT.findIndex(mine);
  const antes = i >= 0 ? VOLUNT[i] : null;

  const marca = () => {
    if (btn && btn.isConnected) {
      const on = isVol(ongId, postId);
      btn.textContent = on ? btn.dataset.on : btn.dataset.off;
      btn.setAttribute('aria-pressed', on);
    }
  };

  if (antes) {
    VOLUNT.splice(i, 1);
  } else {
    VOLUNT.push({
      id: Date.now(),
      ong: ongId,
      post: postId,
      user: USER.apelido_unico,
      status: 'PENDENTE',
      data: new Date().toLocaleDateString('pt-BR'),
    });
  }

  marca();

  try {
    await chamar(() => {
      if (!antes) {
        notify(
          'ong',
          'VOLUNTARIO',
          `@${USER.apelido_unico} quer ser voluntário(a).`,
          '#/painel'
        );
      }
    }, 300);

    toast(
      antes
        ? 'Candidatura cancelada.'
        : 'Candidatura enviada. A ONG vai entrar em contato.'
    );
  } catch (e) {
    if (antes) {
      VOLUNT.push(antes);
    } else {
      const k = VOLUNT.findIndex(mine);
      if (k >= 0) VOLUNT.splice(k, 1);
    }
    
    marca();
    toast('Não foi possível concluir. Tente de novo.');
  }
}

const volBox = (p) => `
  <div class="vol">
    <b>${p.vol.vagas} ${p.vol.vagas > 1 ? 'vagas' : 'vaga'} · ${esc(p.vol.local)}</b>
    <p>${esc(p.vol.necessidades)}</p>
  </div>
`;

const volBtn = (p, o) => `
  <button 
    class="btn sm" 
    data-on="Candidatura enviada" 
    data-off="Quero ajudar" 
    aria-pressed="${isVol(o.id, p.id)}" 
    onclick="volunteer(${o.id}, ${p.id}, this)"
  >
    ${isVol(o.id, p.id) ? 'Candidatura enviada' : 'Quero ajudar'}
  </button>
`;

function decideVol(id, st) {
  const v = VOLUNT.find((x) => x.id == id);
  v.status = st;
  audit('UPDATE', 'volunteers', `Candidatura de @${v.user}: ${st}.`);
  go();
}

const volCard = () => {
  const l = VOLUNT.filter((v) => !ME_ONG || v.ong == ME_ONG);
  
  const rows = l
    .map((v) => {
      const p = POSTS.find((x) => x.id == v.post);
      const vagaTexto = p ? esc(p.text.slice(0, 40)) : 'Candidatura geral';
      
      const statusClass = 
        v.status == 'RECUSADO' 
          ? 'bad' 
          : v.status == 'PENDENTE' 
          ? 'warn' 
          : '';

      const acoes = v.status == 'PENDENTE'
        ? `<button class="btn light sm" onclick="decideVol(${v.id}, 'ACEITO')">Aceitar</button> 
           <button class="lk" onclick="decideVol(${v.id}, 'RECUSADO')">Recusar</button>`
        : '';

      return `
        <tr>
          <td>@${esc(v.user)}</td>
          <td>${vagaTexto}</td>
          <td>${esc(v.data)}</td>
          <td>
            <span class="tag ${statusClass}" style="margin:0">${v.status}</span>
          </td>
          <td>${acoes}</td>
        </tr>
      `;
    })
    .join('') || `
      <tr>
        <td colspan="5" style="text-align:center;color:var(--mut);padding:24px">
          Nenhuma candidatura ainda.
        </td>
      </tr>
    `;

  return `
    <div class="card" style="padding:20px;margin-top:16px;overflow-x:auto">
      <h4>Voluntários</h4>
      <table class="tb">
        <tr>
          <th>Candidato</th>
          <th>Vaga</th>
          <th>Data</th>
          <th>Status</th>
          <th></th>
        </tr>
        ${rows}
      </table>
    </div>
  `;
};