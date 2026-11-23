/* Voluntariado: candidatura (perfil da ONG ou vaga no feed), vagas publicadas e gestão de candidatos no painel da ONG. */

const isVol = (ongId, postId = null) => {
  return VOLUNT.some(
    (v) => v.ong == ongId && v.post == postId && v.user == USER.apelido_unico
  );
};

async function volunteer(ongId, postId, btn) {
  postId = postId || null;

  if (!DEMO) {
    /* o back só aceita candidatura a uma vaga (post) e não tem rota para cancelar */
    if (!postId) return emBreve('Candidate-se pelas vagas publicadas pela ONG.');
    if (isVol(ongId, postId)) return toast('Você já se candidatou a esta vaga. Para cancelar, fale com a ONG.');
  }
  
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
    await chamar(async () => {
      if (!DEMO) await API.candidatarVoluntariado(postId);
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
    toast(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível concluir. Tente de novo.');
  }
}

const volBox = (p) => {
  const v = p.vol;
  const vagas = v.vagas == null ? 'Vagas abertas' : `${v.vagas} ${v.vagas > 1 ? 'vagas' : 'vaga'}`;
  const resumo = [vagas, v.local && esc(v.local)].filter(Boolean).join(' · ');

  const preenchidas = v.preenchidas || 0;
  const pct = v.vagas ? Math.min(100, Math.round((preenchidas / v.vagas) * 100)) : 0;
  const progresso = v.vagas
    ? `<div class="prog">
         <div class="prog-top"><b>${preenchidas}</b><span>de ${v.vagas} ${v.vagas > 1 ? 'vagas preenchidas' : 'vaga preenchida'}</span><span class="pct">${pct}%</span></div>
         <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><b style="width:${pct}%"></b></div>
       </div>`
    : '';

  return `
  <div class="vol">
    <b>${resumo}</b>
    ${v.necessidades ? `<p>${esc(v.necessidades)}</p>` : ''}
    ${v.ate ? `<small>Inscrições até ${esc(v.ate)}</small>` : ''}
  </div>
  ${progresso}
`;
};

const volBtn = (p, o) => {
  /* ONGs não se candidatam a vaga de voluntariado: pedem parceria com a ONG dona da vaga */
  if (ROLE == 'ong') {
    if (o.id == ME_ONG) return '';
    return `<button class="btn sm" type="button" onclick="pedirParceria(${o.id}, ${p.id})">${lc('handshake', 16)} Solicitar parceria</button>`;
  }

  return `
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
};

/* ---- parceria entre ONGs (substitui "voluntariado" quando quem ajuda é outra ONG) ---- */
function pedirParceria(toOngId, postId = null) {
  openModal(
    `<h3>Solicitar parceria</h3>
     <p style="margin:8px 0;color:var(--mut);font-size:13px">Envie uma mensagem contando como sua ONG pode ajudar. A outra ONG vai receber um aviso para aceitar ou recusar.</p>
     <textarea id="parceria-msg" rows="4" style="width:100%;margin-top:6px" placeholder="Escreva sua proposta de parceria…"></textarea>
     <button class="btn full" style="margin-top:10px" onclick="enviarParceria(${toOngId}, ${postId ?? 'null'}, this)">Enviar solicitação</button>`,
    'Parceria'
  );
}

async function enviarParceria(toOngId, postId, btn) {
  const msg = document.getElementById('parceria-msg')?.value.trim() || '';
  try {
    await comEspera(btn, 'Enviando…', () => API.solicitarParceria(toOngId, postId, msg));
    closeModal();
    toast('Solicitação de parceria enviada.');
  } catch (e) {
    toast(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível enviar a solicitação.');
  }
}

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