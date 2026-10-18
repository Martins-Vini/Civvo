/* Perfis. Doador: causas, ONGs apoiadas e histórico de doações. ONG: abas Sobre, Ações sociais, Objetivos e Publicações. */

const nomeDoador = () => `${USER.nome} ${USER.sobrenome}`.trim();

const toggleSet = async (S, id) => {
  const had = S.has(id);
  had ? S.delete(id) : S.add(id);
  go();
  
  try {
    await chamar(() => {
      if (!had && S === FOLLOW) {
        notify('ong', 'SEGUIDOR', `@${USER.apelido_unico} começou a seguir sua ONG.`);
      }
    }, 250);
  } catch (e) {
    had ? S.add(id) : S.delete(id);
    go();
    toast('Não foi possível concluir. Tente de novo.');
  }
};

const SECS = [
  ['sobre', 'Sobre'],
  ['acoes', 'Ações sociais'],
  ['objetivos', 'Objetivos'],
  ['publicacoes', 'Publicações'],
];

const tags = (s) =>
  String(s || '')
    .split(',')
    .filter((x) => x.trim())
    .map((c) => `<span class="tag" style="margin:0 6px 6px 0">${esc(c.trim())}</span>`)
    .join('');

const kv = (k, v) =>
  `<div class="kv"><small>${k}</small><b>${v ? esc(v) : 'Não informado'}</b></div>`;

function profile(name, h, bio, meta, sections, owner, social, cover, avatar) {
  const coverStyle = cover ? `style="background:url('${esc(cover)}') center/cover"` : '';
  const verifiedBadge = (ONGS.find((x) => x.name == name) || {}).ver ? VER : '';
  
  const metaHtml = meta
    .map((m) => `<div><b>${m[0]}</b><small>${m[1]}</small></div>`)
    .join('');

  const sectionsHtml = sections
    .map((s) => {
      const titleHtml = s[0] ? `<h4 style="margin-top:20px">${s[0]}</h4>` : '';
      const gridClass = s[2] ? 'grid3' : '';
      return `${titleHtml}<div class="${gridClass}">${s[1]}</div>`;
    })
    .join('');

  return `
    <div class="card">
      <div class="cover" ${coverStyle}></div>
      <div class="pf">
        ${av(name, h, 104, avatar)}
        <h1>${esc(name)}${verifiedBadge}</h1>
        <p style="color:var(--mut);margin-top:6px">${esc(bio)}</p>
        <div class="meta">${metaHtml}</div>
        ${owner}
        ${socials(social, name)}
        ${sectionsHtml}
      </div>
    </div>
  `;
}

V.perfil = () => {
  if (ROLE == 'ong') return V.ong(meOng().id);

  const ap = DONATIONS.filter((d) => d.status == 'APROVADO').length;

  const causasContent = tags(USER.causas.join(',')) || 
    '<p class="emp">Você ainda não escolheu causas. <a href="#/editar-perfil">Escolher agora</a></p>';

  const apoiosContent = USER.apoios
    .map((id) => ong(id))
    .filter(Boolean)
    .map((o) => `
      <a href="#/ong/${o.id}" class="gi" style="color:inherit">
        ${av(o.name, o.h, 52)}
        <b style="font-size:13px">${esc(o.name)}</b>
      </a>
    `)
    .join('') || '<p class="emp">Você ainda não apoia nenhuma ONG.</p>';

  const doacoesContent = DONATIONS.map((d) => `
    <a class="lnk" href="#/recibo/${d.id}" style="color:inherit">
      <span>${esc(d.ong)} · ${money(d.valor)}</span>
      <span class="tag ${d.status == 'PENDENTE' ? 'warn' : d.status == 'REJEITADO' ? 'bad' : ''}">${d.status}</span>
    </a>
  `).join('') || '<p class="emp">Você ainda não fez nenhuma doação.</p>';

  const sections = [
    ['Causas de interesse', causasContent, 0],
    ['ONGs apoiadas', apoiosContent, 1],
    ['Histórico de doações', doacoesContent, 0],
  ];

  const meta = [
    [ap, 'doações aprovadas'],
    [USER.apoios.length, 'ONGs apoiadas'],
  ];

  const owner = '<div class="acts"><a class="btn ghost sm" href="#/editar-perfil">Editar perfil</a></div>';

  return shell(
    profile(
      nomeDoador(),
      200,
      USER.bio || 'Ainda sem bio.',
      meta,
      sections,
      owner,
      USER.social,
      '',
      USER.avatar_url
    ),
    'perfil',
    { rightCol: 0, wide: 1 }
  );
};

function ongTab(o, sec, ps) {
  if (sec == 'acoes') {
    const cps = ps.filter((p) => p.camp);
    const dm = DEMANDS.filter((d) => d.ong == o.id || (!d.ong && o.id == ME_ONG));

    const campanhasHtml = cps.map((p) => `
      <a class="lnk" href="#/doar/${p.id}" style="color:inherit">
        <span>${esc(p.text.slice(0, 60))}</span>
        <span>${money(p.camp.atual)} / ${money(p.camp.meta)}</span>
      </a>
    `).join('') || '<p class="emp">Nenhuma campanha ativa.</p>';

    const demandasHtml = dm.map((d) => `
      <div class="lnk">
        <span>${esc(d.titulo)}</span>
        <span class="tag ${d.status == 'CONCLUÍDO' ? '' : 'warn'}" style="margin:0">${esc(d.status)}</span>
      </div>
    `).join('') || '<p class="emp">Nenhuma demanda pública.</p>';

    return `
      <h4>Campanhas</h4>
      ${campanhasHtml}
      <h4 style="margin-top:20px">Demandas</h4>
      ${demandasHtml}
    `;
  }

  if (sec == 'objetivos') {
    const e = o.estatuto || {};
    return kv('Missão', e.missao) + kv('Objetivos', e.objetivos) + kv('Gestão', e.gestao);
  }

  if (sec == 'publicacoes') {
    return ps.map(postH).join('') || '<p class="emp">Nenhuma publicação ainda.</p>';
  }

  const c = o.certidoes || {};
  const regulariedades = [
    ['federal', 'Regularidade federal'],
    ['estadual', 'Regularidade estadual'],
    ['trabalhista', 'Regularidade trabalhista'],
    ['fgts', 'FGTS'],
  ]
    .map(([k, l]) => kv(l, c[k]))
    .join('');

  const ataHtml = o.ata && safeUrl(o.ata) 
    ? `<a class="btn light sm" style="margin-top:12px" href="${esc(o.ata)}" target="_blank" rel="noopener noreferrer">Ver ata de eleição</a>` 
    : kv('Ata de eleição', '');

  return `
    <h4>Nossa história</h4>
    <p>${esc(o.bio || 'Não informado.')}</p>
    <h4 style="margin:20px 0 8px">Causas atendidas</h4>
    ${tags(o.cat) || '<p class="emp">Não informado.</p>'}
    <h4 style="margin:20px 0 4px">Transparência e governança</h4>
    ${kv('Razão social', o.razao)}
    ${kv('CNPJ', o.cnpj)}
    ${kv('CNAE', o.cnae)}
    ${kv('Pessoas governadoras', (o.governanca || []).join(', '))}
    ${regulariedades}
    ${ataHtml}
  `;
}

V.ong = (id, sec = 'sobre') => {
  const o = ong(id);
  if (!o) {
    return shell('<div class="card emp">ONG não encontrada.</div>', 'buscar', {
      rightCol: 0,
      wide: 1,
    });
  }

  const ps = POSTS.filter((p) => p.ong == o.id);
  const cps = ps.filter((p) => p.camp);
  const op = cps.find((p) => p.camp.status != 'ENCERRADA');
  const f = FOLLOW.has(o.id);
  const v = isVol(o.id);
  const me = o.id == ME_ONG;

  const acts = me
    ? '<div class="acts"><a class="btn ghost sm" href="#/editar-perfil">Editar perfil</a></div>'
    : `<div class="acts">
         <a class="btn sm" href="${op ? '#/doar/' + op.id : '#'}" ${op ? '' : 'aria-disabled="true"'}>Doar</a>
         <button class="btn light sm" aria-pressed="${f}" onclick="toggleSet(FOLLOW, ${o.id})">${f ? 'Seguindo' : 'Seguir'}</button>
         <button class="btn ghost sm" data-on="Candidatura enviada" data-off="Quero ser voluntário" aria-pressed="${v}" onclick="volunteer(${o.id}, null, this)">${v ? 'Candidatura enviada' : 'Quero ser voluntário'}</button>
         <a class="btn ghost sm" href="#/chats">Mensagem</a>
       </div>`;

  const tabs = `<nav class="tabs" aria-label="Seções do perfil">${SECS.map(([k, n]) => `<a href="#/ong/${o.id}/${k}" class="${sec == k ? 'on' : ''}">${n}</a>`).join('')}</nav>`;

  const meta = [
    [o.followers, 'seguidores'],
    [cps.length, 'campanhas'],
    [o.transp || '—', 'transparência'],
  ];

  const sections = [
    ['', tabs + `<div class="tabc">${ongTab(o, sec, ps)}</div>`, 0],
  ];

  return shell(
    profile(
      o.name,
      o.h,
      [o.cat, o.city].filter(Boolean).join(' · ') || 'Sem descrição',
      meta,
      sections,
      acts,
      o.social,
      o.banner
    ),
    me ? 'perfil' : 'buscar',
    { rightCol: 0, wide: 1 }
  );
};