
let EP = {};

const F = (id, l, v = '', t = 'text', x = '') => `
  <label for="${id}">${l}</label>
  <input id="${id}" class="in" type="${t}" value="${esc(v)}" ${x}>
`;

const TA = (id, l, v = '', r = 3) => `
  <label for="${id}">${l}</label>
  <textarea id="${id}" class="in" rows="${r}">${esc(v)}</textarea>
`;

const IMG = (id, l, cur) => `
  <label for="${id}">${l}</label>
  ${cur ? `<img class="eprev" src="${esc(cur)}" alt="">` : ''}
  <input id="${id}" class="in" type="file" accept="image/*" onchange="pickImg(this)">
`;

const grp = (h, b) => `
  <div class="card set">
    <h4>${h}</h4>
    ${b}
  </div>
`;

function pickImg(i) {
  const f = i.files[0];
  if (!f) return;

  const W = i.id == 'eBan' ? 1200 : 400;
  const H = i.id == 'eBan' ? 400 : 400;
  const r = new FileReader();

  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;

      const s = Math.max(W / im.width, H / im.height);
      const w = im.width * s;
      const h = im.height * s;

      c.getContext('2d').drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      EP[i.id] = c.toDataURL('image/jpeg', 0.85);

      let p = i.previousElementSibling;
      if (!p || p.tagName != 'IMG') {
        p = document.createElement('img');
        p.className = 'eprev';
        p.alt = '';
        i.before(p);
      }
      p.src = EP[i.id];
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}

V['editar-perfil'] = () => {
  EP = {};
  const ong = ROLE == 'ong';
  const o = ong ? meOng() : null;
  const e = (ong ? o.end : USER.end) || {};
  const t = (ong ? o.tel : USER.tel) || {};
  const s = (ong ? o.social : USER.social) || {};
  const es = ong ? o.estatuto || {} : {};

  const dados = ong
    ? F('eNome', 'Nome fantasia', o.name) +
      F('eRaz', 'Razão social (não editável)', o.razao || '', 'text', 'disabled') +
      F('eCnpj', 'CNPJ (não editável)', o.cnpj || '', 'text', 'disabled') +
      F('eCnae', 'CNAE', o.cnae || '') +
      TA('eBio', 'Nossa história', o.bio || '', 4) +
      F('eCat', 'Causas atendidas (separe por vírgula)', o.cat || '') +
      F('ePix', 'Chave Pix', o.pix || '') +
      IMG('eLogo', 'Logo', o.logo) +
      IMG('eBan', 'Banner (capa)', o.banner)
    : `<div class="row2"><div>${F('eNome', 'Nome', USER.nome)}</div><div>${F('eSob', 'Sobrenome', USER.sobrenome)}</div></div>` +
      F('eApe', 'Apelido único', USER.apelido_unico) +
      TA('eBio', 'Bio', USER.bio) +
      F('eCpf', 'CPF (opcional)', USER.cpf, 'text', 'inputmode="numeric"') +
      IMG('eAva', 'Foto de perfil', USER.avatar_url);

  const estatutoGovHtml = ong 
    ? grp('Estatuto e governança', 
        TA('eMis', 'Missão', es.missao || '', 2) + 
        TA('eObj', 'Objetivos', es.objetivos || '', 2) + 
        F('eGes', 'Gestão', es.gestao || '') + 
        F('eGov', 'Pessoas governadoras (separe por vírgula)', (o.governanca || []).join(', '))
      ) 
    : grp('Causas de interesse', 
        `<div class="chips dk">
          ${CAUSAS.map((c) => `
            <button class="chip ${USER.causas.includes(c) ? 'on' : ''}" aria-pressed="${USER.causas.includes(c)}" onclick="togCausa('${c}', this)">
              ${c}
            </button>
          `).join('')}
         </div>`
      );

  const enderecoHtml = grp('Endereço', `
    <div class="row2">
      <div>${F('eCep', 'CEP', e.cep || '', 'text', 'inputmode="numeric" placeholder="00000-000"')}</div>
      <div>${F('eUf', 'Estado (UF)', e.estado || '', 'text', 'maxlength="2"')}</div>
    </div>
    ${F('eRua', 'Rua', e.rua || '')}
    <div class="row2">
      <div>${F('eBai', 'Bairro', e.bairro || '')}</div>
      <div>${F('eCid', 'Cidade', e.cidade || '')}</div>
    </div>
  `);

  const telefoneHtml = grp('Telefone', `
    <div class="row2">
      <div>${F('eDdd', 'DDD', t.ddd || '', 'text', 'inputmode="numeric" maxlength="2"')}</div>
      <div>${F('eNum', 'Número', t.numero || '', 'text', 'inputmode="numeric"')}</div>
    </div>
    <label class="rd">
      <input type="checkbox" id="eWpp" ${t.whats ? 'checked' : ''}> Este número tem WhatsApp
    </label>
  `);

  const redesSociaisHtml = grp('Redes sociais', NET.map(([k, n]) => F('eS_' + k, n, s[k] || '', 'url', 'placeholder="https://"')).join(''));

  const content = `
    <div class="top"><h1>Editar perfil</h1></div>
    ${grp('Dados', dados)}
    ${estatutoGovHtml}
    ${enderecoHtml}
    ${telefoneHtml}
    ${redesSociaisHtml}
    <p class="dn-err" id="eerr" role="alert"></p>
    <div class="acts">
      <button class="btn" onclick="saveProfile(this)">Salvar alterações</button>
      <a class="btn ghost" href="#/perfil">Cancelar</a>
    </div>
  `;

  return shell(content, 'perfil', { rightCol: 0 });
};

async function saveProfile(btn) {
  const v = (id) => ($('#' + id)?.value || '').trim();
  const e = $('#eerr');
  const ong = ROLE == 'ong';

  if (!v('eNome')) {
    e.textContent = 'Informe o nome.';
    return;
  }
  if (!ong && !v('eApe')) {
    e.textContent = 'Informe o apelido único.';
    return;
  }
  if (v('eCpf') && v('eCpf').replace(/\D/g, '').length != 11) {
    e.textContent = 'O CPF deve ter 11 dígitos.';
    return;
  }
  if (v('eCep') && !/^\d{5}-?\d{3}$/.test(v('eCep'))) {
    e.textContent = 'CEP inválido. Use 8 dígitos.';
    return;
  }
  if (v('eUf') && !/^[A-Za-z]{2}$/.test(v('eUf'))) {
    e.textContent = 'O estado deve ter 2 letras (UF).';
    return;
  }

  const social = {};
  for (const [k, n] of NET) {
    const u = v('eS_' + k);
    if (u && !safeUrl(u)) {
      e.textContent = `Link do ${n} inválido. Comece com https://`;
      return;
    }
    social[k] = u;
  }

  const ok = await comEspera(btn, 'Salvando…', () => {
    const end = {
      cep: v('eCep'),
      estado: v('eUf').toUpperCase(),
      rua: v('eRua'),
      bairro: v('eBai'),
      cidade: v('eCid'),
    };
    const tel = { 
      ddd: v('eDdd'), 
      numero: v('eNum'), 
      whats: $('#eWpp').checked 
    };

    if (ong) {
      const o = meOng();
      Object.assign(o, {
        name: v('eNome'),
        cnae: v('eCnae'),
        bio: v('eBio'),
        cat: v('eCat'),
        pix: v('ePix'),
        end,
        tel,
        social,
        city: end.cidade || o.city,
        estatuto: { 
          missao: v('eMis'), 
          objetivos: v('eObj'), 
          gestao: v('eGes') 
        },
        governanca: v('eGov')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });

      if (EP.eLogo) o.logo = EP.eLogo;
      if (EP.eBan) o.banner = EP.eBan;
    } else {
      Object.assign(USER, {
        nome: v('eNome'),
        sobrenome: v('eSob'),
        apelido_unico: v('eApe'),
        bio: v('eBio'),
        cpf: v('eCpf').replace(/\D/g, ''),
        end,
        tel,
        social,
        avatar_url: EP.eAva || USER.avatar_url,
      });
    }

    audit('UPDATE', ong ? 'ongs_profiles' : 'doadores_profiles', 'Perfil atualizado.');
  });

  if (!ok) return;

  toast('Perfil atualizado.');
  location.hash = '#/perfil';
}


function togCausa(c, b) {
  const i = USER.causas.indexOf(c);
  i < 0 ? USER.causas.push(c) : USER.causas.splice(i, 1);
  b.classList.toggle('on', i < 0);
  b.setAttribute('aria-pressed', i < 0);
}