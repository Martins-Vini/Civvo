/* Gestão das publicações e campanhas da própria ONG. */

const isoBR = (s) => (s && s.includes('/') ? s.split('/').reverse().join('-') : s || '');

function managePost(id) {
  const p = POSTS.find((x) => x.id == id);
  const c = p.camp;

  const btnToggleCamp = c 
    ? `<button class="btn light" onclick="toggleCamp(${id})">
        ${c.status == 'ENCERRADA' ? 'Reabrir campanha' : 'Encerrar campanha'}
       </button>` 
    : '';

  openModal(
    `<h3>Gerenciar ${c ? 'campanha' : 'publicação'}</h3>
     <div class="mg">
       <button class="btn light" onclick="editPost(${id})">Editar</button>
       ${btnToggleCamp}
       <button class="btn ghost" style="color:var(--bad);border-color:var(--bad)" onclick="askDelete(${id})">Excluir</button>
     </div>`,
    'Gerenciar'
  );
}

function editPost(id) {
  const p = POSTS.find((x) => x.id == id);
  const c = p.camp;
  const v = p.vol;

  const campFields = c ? `
    <div class="row2">
      <div>
        <label for="eMeta">Meta (R$)</label>
        <input id="eMeta" class="in" type="number" min="1" value="${c.meta}">
      </div>
      <div>
        <label for="eLim">Prazo</label>
        <input id="eLim" class="in" type="date" value="${isoBR(c.limite)}">
      </div>
    </div>
  ` : '';

  const volOptions = ['Presencial', 'Remoto', 'Híbrido']
    .map((x) => `<option ${x == v?.local ? 'selected' : ''}>${x}</option>`)
    .join('');

  const volFields = v ? `
    <label for="eNec">O que a ONG precisa</label>
    <textarea id="eNec" class="in" rows="3">${esc(v.necessidades)}</textarea>
    <div class="row2">
      <div>
        <label for="eVag">Vagas</label>
        <input id="eVag" class="in" type="number" min="1" value="${v.vagas}">
      </div>
      <div>
        <label for="eLoc">Modalidade</label>
        <select id="eLoc" class="in">${volOptions}</select>
      </div>
    </div>
  ` : '';

  openModal(
    `<h3>Editar</h3>
     <label for="eTxt" style="margin-top:0">Texto</label>
     <textarea id="eTxt" class="in" rows="4">${esc(p.text)}</textarea>
     ${campFields}
     ${volFields}
     <small style="color:var(--mut)">As imagens não podem ser alteradas depois de publicar.</small>
     <p class="dn-err" id="eeE" role="alert"></p>
     <button class="btn full" onclick="savePostEdit(${id}, this)">Salvar alterações</button>`,
    'Editar'
  );
}


async function savePostEdit(id, btn) {
  const p = POSTS.find((x) => x.id == id);
  const e = $('#eeE');
  const t = $('#eTxt').value.trim();

  if (!t) {
    e.textContent = 'O texto não pode ficar vazio.';
    return;
  }

  if (p.camp) {
    const m = +$('#eMeta').value;
    const l = $('#eLim').value;

    if (!(m > 0)) {
      e.textContent = 'Informe a meta.';
      return;
    }

    if (m < p.camp.atual) {
      e.textContent = `A meta não pode ser menor que o valor já arrecadado (${money(p.camp.atual)}).`;
      return;
    }

    if (!l) {
      e.textContent = 'Informe o prazo.';
      return;
    }

    p.camp.meta = m;
    p.camp.limite = dataBR(l);
  }

  if (p.vol) {
    const n = $('#eNec').value.trim();
    const v = +$('#eVag').value;

    if (!n || !(v > 0)) {
      e.textContent = 'Informe as necessidades e o número de vagas.';
      return;
    }

    Object.assign(p.vol, { 
      necessidades: n, 
      vagas: v, 
      local: $('#eLoc').value 
    });
  }

  const ok = await comEspera(btn, 'Salvando…', () => {
    p.text = t;
    p.edited = true;
    audit('UPDATE', 'posts', `Publicação #${String(id).slice(-4)} editada.`);
  });

  if (!ok) return;

  closeModal();
  toast('Alterações salvas.');
  go();
}

function toggleCamp(id) {
  const c = POSTS.find((x) => x.id == id).camp;

  c.status = c.status == 'ENCERRADA' 
    ? (c.atual >= c.meta ? 'ALCANÇADA' : 'EM_ANDAMENTO') 
    : 'ENCERRADA';

  audit(
    'UPDATE',
    'campaign_details',
    `Campanha ${c.status == 'ENCERRADA' ? 'encerrada' : 'reaberta'}.`
  );

  closeModal();
  toast(
    c.status == 'ENCERRADA'
      ? 'Campanha encerrada. Ela não recebe mais doações.'
      : 'Campanha reaberta.'
  );
  go();
}

function askDelete(id) {
  const p = POSTS.find((x) => x.id == id);

  if (p.camp && p.camp.atual > 0) {
    const btnEncerrar = p.camp.status == 'ENCERRADA' 
      ? '' 
      : `<button class="btn full" onclick="toggleCamp(${id})">Encerrar campanha</button>`;

    openModal(
      `<h3>Não é possível excluir</h3>
       <p style="margin:8px 0 16px">
         Esta campanha já recebeu ${money(p.camp.atual)} em doações aprovadas. Para manter a transparência, encerre a campanha em vez de excluí-la.
       </p>
       ${btnEncerrar}`,
      'Excluir'
    );
    return;
  }

  openModal(
    `<h3>Excluir ${p.camp ? 'campanha' : 'publicação'}?</h3>
     <p style="margin:8px 0 16px">Esta ação não pode ser desfeita. Os comentários também serão removidos.</p>
     <button class="btn full" style="background:var(--bad)" onclick="delPost(${id}, this)">Excluir definitivamente</button>`,
    'Excluir'
  );
}

async function delPost(id, btn) {
  const ok = await comEspera(btn, 'Excluindo…', () => {
    POSTS.splice(
      POSTS.findIndex((x) => x.id == id),
      1
    );

    for (let i = COMMENTS.length - 1; i >= 0; i--) {
      if (COMMENTS[i].post == id) {
        COMMENTS.splice(i, 1);
      }
    }

    audit('DELETE', 'posts', `Publicação #${String(id).slice(-4)} excluída.`);
  });

  if (!ok) return;

  closeModal();
  toast('Excluído.');

  if (location.hash.startsWith('#/post/')) {
    location.hash = '#/feed';
  } else {
    go();
  }
}