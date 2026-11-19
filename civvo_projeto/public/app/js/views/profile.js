/* Perfis. Doador: causas, ONGs apoiadas e histórico de doações. ONG: abas Sobre, Ações sociais, Objetivos e Publicações. */

const nomeDoador = () => `${USER.nome} ${USER.sobrenome}`.trim();

const SEG_BUSY = new Set();

/* contadores de seguidores/seguindo vindos do banco, por ONG (para não depender só do feed) */
const ONG_CONT = {};
const CONT_BUSY = new Set();
/* "geração" por ONG: sobe a cada follow/unfollow, para ignorar respostas antigas que chegam atrasadas */
const CONT_GEN = {};

function carregarContagens(id) {
  if (CONT_BUSY.has(id)) return;
  CONT_BUSY.add(id);
  const gen = CONT_GEN[id] || 0;

  API.contagensOng(id)
    .then((r) => {
      if ((CONT_GEN[id] || 0) !== gen) return; /* houve follow/unfollow no meio: esta resposta é velha */
      ONG_CONT[id] = { seguidores: +r.seguidores || 0, seguindo: +r.seguindo || 0, ts: Date.now() };
      const o = ong(id);
      if (o) o.followers = ONG_CONT[id].seguidores;
    })
    .catch((e) => {
      console.error('Falha ao carregar contadores:', e);
      if ((CONT_GEN[id] || 0) !== gen) return;
      const o = ong(id);
      /* marca o horário mesmo no erro, para não ficar tentando em loop */
      ONG_CONT[id] = { ...(ONG_CONT[id] || { seguidores: o ? o.followers || 0 : 0, seguindo: 0 }), ts: Date.now() };
    })
    .finally(() => {
      CONT_BUSY.delete(id);
      if (/^#\/(ong|perfil)/.test(location.hash)) go();
    });
}

/* ---- Listas no estilo Instagram (Seguidores / Seguindo / Campanhas) ---- */
const listaItem = (u) => {
  const ehOng = u.ong_id != null;
  const sub = ehOng ? 'ONG' : u.apelido ? '@' + esc(u.apelido) : 'Doador';
  const corpo = `
    ${av(u.nome, ((u.ong_id || u.user_id) * 70) % 360, 44, u.avatar)}
    <div style="flex:1;min-width:0">
      <b>${esc(u.nome)}</b>
      <small style="display:block;color:var(--mut)">${sub}</small>
    </div>`;
  const estilo = 'display:flex;align-items:center;gap:12px;padding:8px 0;color:inherit';
  return ehOng
    ? `<a class="fl-it" data-n="${esc(u.nome.toLowerCase())}" href="#/ong/${u.ong_id}" onclick="closeModal()" style="${estilo}">${corpo}</a>`
    : `<div class="fl-it" data-n="${esc(u.nome.toLowerCase())}" style="${estilo}">${corpo}</div>`;
};

function filtraLista(v) {
  const q = (v || '').trim().toLowerCase();
  document.querySelectorAll('.fl-it').forEach((el) => {
    el.style.display = !q || el.dataset.n.includes(q) ? 'flex' : 'none';
  });
}

/* tipo: 'seguidores' | 'seguindo'; ongId null = a lista da minha conta (doador) */
async function abrirLista(tipo, ongId) {
  if (DEMO) return emBreve('As listas de seguidores estarão disponíveis em breve.');

  const titulo = tipo == 'seguidores' ? 'Seguidores' : 'Seguindo';
  openModal(
    `<h3>${titulo}</h3>
     <input class="in" aria-label="Buscar na lista" placeholder="Buscar" oninput="filtraLista(this.value)" style="margin:10px 0">
     <div id="flb" style="max-height:60vh;overflow:auto" role="status">Carregando…</div>`,
    titulo
  );

  try {
    const lista = await (ongId == null ? API.minhaListaSeguindo() : API.listaOng(ongId, tipo));
    const el = $('#flb');
    if (!el) return; /* o modal foi fechado */
    el.removeAttribute('role');
    el.innerHTML = (Array.isArray(lista) && lista.length)
      ? lista.map(listaItem).join('')
      : `<p class="emp">${tipo == 'seguidores' ? 'Ninguém segue por aqui ainda.' : 'Ainda não segue ninguém.'}</p>`;
  } catch (e) {
    const el = $('#flb');
    if (el) el.innerHTML = `<p class="emp" role="alert">${esc(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar a lista.')}</p>`;
  }
}

function abrirCampanhas(ongId) {
  const l = POSTS.filter((p) => p.ong == ongId && p.kind == 'CAMPANHA');
  const itens = l
    .map(
      (p) => `
      <a href="#/post/${p.id}" onclick="closeModal()" style="display:block;padding:10px 0;color:inherit;border-bottom:1px solid var(--bd, rgba(255,255,255,.08))">
        <b>${esc((p.text || 'Campanha').slice(0, 70))}${(p.text || '').length > 70 ? '…' : ''}</b>
        <small style="display:block;color:var(--mut)">${esc(p.time || '')}</small>
      </a>`
    )
    .join('');

  openModal(
    `<h3>Campanhas</h3>
     <div style="max-height:60vh;overflow:auto;margin-top:8px">${itens || '<p class="emp">Nenhuma campanha publicada ainda.</p>'}</div>`,
    'Campanhas'
  );
}

/* atualiza todos os botões "Seguir/Seguindo" daquela ONG sem recarregar a tela (feed, sugestões, perfil) */
const pintaSeguir = (id) => {
  const f = FOLLOW.has(id);
  document.querySelectorAll(`[data-fo="${id}"]`).forEach((b) => {
    /* o botão do card tem ícone; os demais (perfil, sugestões) só texto */
    if (b.classList.contains('fo')) b.innerHTML = f ? `${lc('check', 13)} Seguindo` : `${lc('plus', 13)} Seguir`;
    else b.textContent = f ? 'Seguindo' : 'Seguir';
    b.setAttribute('aria-pressed', f);
    b.classList.toggle('following', f);
  });
};

/* modo real: persiste no banco; atualiza na hora e desfaz se o back recusar */
async function seguirReal(id) {
  if (SEG_BUSY.has(id)) return;
  SEG_BUSY.add(id);

  const o = ong(id);
  const had = FOLLOW.has(id);
  CONT_GEN[id] = (CONT_GEN[id] || 0) + 1;
  had ? FOLLOW.delete(id) : FOLLOW.add(id);
  if (o) o.followers = Math.max(0, (o.followers || 0) + (had ? -1 : 1));
  pintaSeguir(id);

  try {
    const r = await API.toggleSeguirOng(id);
    if (typeof r.following == 'boolean') r.following ? FOLLOW.add(id) : FOLLOW.delete(id);
    if (o && r.seguidores != null) o.followers = +r.seguidores;
    CONT_GEN[id] = (CONT_GEN[id] || 0) + 1; /* invalida buscas que estavam em andamento */
    if (r.seguidores != null) {
      /* o número devolvido pelo back ao seguir/deixar de seguir é o valor oficial */
      ONG_CONT[id] = { seguindo: 0, ...(ONG_CONT[id] || {}), seguidores: +r.seguidores, ts: ONG_CONT[id] ? Date.now() : 0 };
    }
    if (ROLE == 'ong') delete ONG_CONT[ME_ONG]; /* o "seguindo" da minha ONG mudou: busca de novo */
  } catch (e) {
    had ? FOLLOW.add(id) : FOLLOW.delete(id);
    if (o) o.followers = Math.max(0, (o.followers || 0) + (had ? 1 : -1));
    toast(e.name == 'ApiError' && e.message ? e.message : 'Não foi possível concluir. Tente de novo.');
  } finally {
    SEG_BUSY.delete(id);
    pintaSeguir(id);
    if (location.hash.startsWith('#/ong/')) go(); /* atualiza o contador de seguidores do perfil */
  }
}

/* usado pelos botões do feed, das sugestões e do perfil */
const seguirOngClick = (id) => toggleSet(FOLLOW, id);

const toggleSet = async (S, id) => {
  if (!DEMO && S === FOLLOW) return seguirReal(id);

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
  ['publicacoes', 'Publicações'],
  ['sobre', 'Sobre'],
  ['acoes', 'Ações sociais'],
  ['objetivos', 'Objetivos'],
];

const tags = (s) =>
  String(s || '')
    .split(',')
    .filter((x) => x.trim())
    .map((c) => `<span class="tag" style="margin:0 6px 6px 0">${esc(c.trim())}</span>`)
    .join('');

/* =====================================================================
   PERFIL REAL: dados completos da ONG, ampliar foto e pendências
   ===================================================================== */
const ONG_PERFIL = {}; /* id da ONG -> { dados, ts } (dados vindos do banco) */
const PERFIL_BUSY = new Set();

/* resposta do back (ONG) -> campos que o app usa nos objetos de ONG */
function dadosOng(p) {
  const e = p.endereco || {};
  const d = {
    name: p.nome_fantasia,
    razao: p.razao_social,
    cnpj: p.cnpj,
    cnae: p.cnae || '',
    bio: p.historia || '',
    cat: p.causas_atendidas || '',
    city: p.cidade || e.cidade || '',
    logo: imgOk(p.logo_url),
    banner: imgOk(p.banner_url),
    bannerCor: p.banner_cor || '',
    estatuto: { missao: p.missao || '', objetivos: p.objetivos || '', gestao: p.gestao || '' },
    governanca: String(p.governanca || '').split(',').map((x) => x.trim()).filter(Boolean),
    transp: p.nivel_transparencia || '',
    social: p.redes || {},
  };
  if (p.chave_pix !== undefined) d.pix = p.chave_pix || '';
  if (p.endereco !== undefined) d.end = { cep: e.cep || '', estado: e.estado || '', rua: e.rua || '', bairro: e.bairro || '', cidade: e.cidade || '' };
  return d;
}

function carregarPerfilOng(id) {
  if (PERFIL_BUSY.has(id)) return;
  PERFIL_BUSY.add(id);

  API.perfilOngPublico(id)
    .then((r) => {
      ONG_PERFIL[id] = { dados: dadosOng(r), ts: Date.now() };
    })
    .catch((e) => {
      console.error('Falha ao carregar o perfil da ONG:', e);
      /* marca o horário mesmo no erro, para não tentar em loop */
      ONG_PERFIL[id] = { dados: (ONG_PERFIL[id] && ONG_PERFIL[id].dados) || {}, ts: Date.now() };
    })
    .finally(() => {
      PERFIL_BUSY.delete(id);
      if (/^#\/(ong|perfil)/.test(location.hash)) go();
    });
}

/* ---- pendências do perfil da ONG ---- */
const PEND_TOTAL = 13;

function pendenciasOng(p = typeof PERFIL_ME !== 'undefined' ? PERFIL_ME : null) {
  if (!p || p.tipo !== 'ONG') return [];
  const vazio = (v) => !String(v ?? '').trim();
  const temRede = Object.values(p.redes || {}).some((u) => String(u || '').trim());

  return [
    ['epFoto', 'camera', 'Foto de perfil', !imgOk(p.logo_url)],
    ['epCapa', 'palette', 'Capa do perfil', !imgOk(p.banner_url) && !p.banner_cor],
    ['epBio', 'file-text', 'Nossa história', vazio(p.historia)],
    ['epCausas', 'heart', 'Causas atendidas', vazio(p.causas_atendidas)],
    ['epCnae', 'building-2', 'CNAE', vazio(p.cnae)],
    ['epPix', 'wallet', 'Chave Pix', vazio(p.chave_pix)],
    ['epMis', 'target', 'Missão', vazio(p.missao)],
    ['epObj', 'target', 'Objetivos', vazio(p.objetivos)],
    ['epGes', 'users', 'Gestão', vazio(p.gestao)],
    ['epGov', 'users', 'Pessoas governadoras', vazio(p.governanca)],
    ['epCep', 'map-pin', 'Endereço', !p.endereco],
    ['epDdd', 'phone', 'Telefone', !p.telefone],
    ['epS_instagram', 'link', 'Redes sociais', !temRede],
  ]
    .filter((i) => i[3])
    .map(([campo, icone, rotulo]) => ({ campo, icone, rotulo }));
}

function pendCard(acao = 'irEditar') {
  if (typeof PERFIL_ME === 'undefined' || !PERFIL_ME) return '';
  const lista = pendenciasOng();

  if (!lista.length) {
    return `<div class="pend ok" role="status">${lc('circle-check', 22)}<div><b>Perfil completo!</b><small>Sua ONG está com todas as informações preenchidas.</small></div></div>`;
  }

  const feitos = PEND_TOTAL - lista.length;
  const pct = Math.round((feitos / PEND_TOTAL) * 100);

  return `
    <div class="pend" role="alert">
      <div class="pend-top">
        ${lc('triangle-alert', 24)}
        <div>
          <b>Perfil incompleto: ${lista.length} ${lista.length > 1 ? 'pendências' : 'pendência'}</b>
          <small>Perfis completos passam mais confiança para quem quer doar.</small>
        </div>
        <span class="pend-pct">${pct}%</span>
      </div>
      <div class="pend-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><b style="width:${pct}%"></b></div>
      <div class="pend-chips">
        ${lista.map((i) => `<button class="pend-chip" onclick="${acao}('${i.campo}')">${lc(i.icone, 15)}<span>${i.rotulo}</span></button>`).join('')}
      </div>
    </div>`;
}

/* abre a edição já focando no campo pendente */
function irEditar(campo) {
  EPF_FOCO = campo;
  location.hash = '#/editar-perfil';
}

/* ---- ampliar foto (perfil e capa) ---- */
function abrirFoto(url, titulo, circular) {
  if (!url) return;
  document.getElementById('fx')?.remove();

  const d = document.createElement('div');
  d.id = 'fx';
  d.className = 'fx';
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', titulo || 'Foto');
  d.innerHTML = `<button class="fx-x" aria-label="Fechar" title="Fechar">${lc('x', 26)}</button><img alt="">`;

  const img = d.querySelector('img');
  img.src = url;
  img.alt = titulo || '';
  if (circular) img.classList.add('circ');

  const fechar = () => {
    document.removeEventListener('keydown', tecla);
    d.remove();
  };
  const tecla = (e) => {
    if (e.key === 'Escape') fechar();
  };

  d.addEventListener('click', (e) => {
    if (e.target !== img) fechar();
  });
  document.addEventListener('keydown', tecla);
  document.body.appendChild(d);
  d.querySelector('.fx-x').focus();
}

function abrirFotoEl(el) {
  abrirFoto(el.dataset.foto, el.dataset.nome, el.dataset.circ === '1');
}

(() => {
  if (document.getElementById('civvo-pf-css')) return;
  const st = document.createElement('style');
  st.id = 'civvo-pf-css';
  st.textContent = `
    .pf-zoom{display:contents}
    .pf-zoom > *{cursor:zoom-in}
    .fx{position:fixed;inset:0;z-index:2200;display:grid;place-items:center;background:rgba(0,0,0,.92);animation:mvIn .18s ease;padding:16px}
    .fx img{max-width:min(94vw,1100px);max-height:90vh;object-fit:contain;border-radius:10px;box-shadow:0 12px 48px rgba(0,0,0,.6)}
    .fx img.circ{width:min(86vw,520px);height:min(86vw,520px);object-fit:cover;border-radius:50%}
    .fx-x{position:fixed;top:14px;right:16px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center;cursor:pointer}
    .fx-x:hover{background:rgba(255,255,255,.28)}

    .pend{margin-top:16px;border:1px solid rgba(245,158,11,.55);background:rgba(245,158,11,.09);border-radius:14px;padding:14px 16px}
    .pend.ok{display:flex;gap:12px;align-items:center;border-color:rgba(34,197,94,.5);background:rgba(34,197,94,.09);color:#22c55e}
    .pend.ok small{display:block;color:var(--mut);font-weight:400}
    .pend-top{display:flex;align-items:center;gap:12px;color:#f59e0b}
    .pend-top svg{flex:none}
    .pend-top div{flex:1;min-width:0}
    .pend-top b{display:block;color:inherit}
    .pend-top small{display:block;color:var(--mut);font-weight:400;margin-top:2px}
    .pend-pct{font-weight:700;font-size:18px}
    .pend-bar{height:6px;border-radius:6px;background:rgba(127,127,127,.25);overflow:hidden;margin:12px 0}
    .pend-bar b{display:block;height:100%;background:#f59e0b;border-radius:6px}
    .pend-chips{display:flex;flex-wrap:wrap;gap:8px}
    .pend-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(245,158,11,.6);background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
    .pend-chip svg{color:#f59e0b}
    .pend-chip:hover{background:rgba(245,158,11,.16)}
  `;
  document.head.appendChild(st);
})();

const kv = (k, v) =>
  `<div class="kv"><small>${k}</small><b>${v ? esc(v) : 'Não informado'}</b></div>`;

function profile(name, h, bio, meta, sections, owner, social, cover, avatar, momOng, capaCor) {
  cover = imgOk(cover);
  avatar = imgOk(avatar);
  const corOk = /^#[0-9a-f]{6}$/i.test(capaCor || '') ? capaCor : '';
  const coverStyle = cover
    ? `style="background:url('${esc(cover)}') center/cover;cursor:zoom-in" data-foto="${esc(cover)}" data-nome="${esc(name)}" onclick="abrirFotoEl(this)" role="button" tabindex="0" aria-label="Ampliar capa de ${esc(name)}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirFotoEl(this)}"`
    : corOk
    ? `style="background:${corOk}"`
    : 'style="background:linear-gradient(135deg,#2d4f61,#39677e)"'; /* capa padrão: azul do Civvo */
  const verifiedBadge = (ONGS.find((x) => x.name == name) || {}).ver ? VER : '';
  
  const metaHtml = meta
    .map((m) =>
      m[2]
        ? `<div role="button" tabindex="0" style="cursor:pointer" onclick="${m[2]}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${m[2]}}"><b>${m[0]}</b><small>${m[1]}</small></div>`
        : `<div><b>${m[0]}</b><small>${m[1]}</small></div>`
    )
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
        ${
          momOng
            ? `<div class="pf-story ${momOng.vistos ? 'seen' : ''}" role="button" tabindex="0" aria-label="Ver momentos de ${esc(name)}" onclick="abrirMomentos(${momOng.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirMomentos(${momOng.id})}">${av(name, h, 104, avatar)}</div>`
            : avatar
            ? `<div class="pf-zoom" data-foto="${esc(avatar)}" data-nome="${esc(name)}" data-circ="1" onclick="abrirFotoEl(this)">${av(name, h, 104, avatar)}</div>`
            : av(name, h, 104, avatar)
        }
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

  /* garante os dados salvos no banco (caso a carga junto com o feed tenha falhado) */
  if (!DEMO && !PERFIL_ME && !PERFIL_CARR && !PERFIL_ERRO) carregarMeuPerfil();

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

  /* modo real: o back não guarda causas de interesse nem lista doações do usuário */
  const sections = DEMO
    ? [
        ['Causas de interesse', causasContent, 0],
        ['ONGs apoiadas', apoiosContent, 1],
        ['Histórico de doações', doacoesContent, 0],
      ]
    : [
        ['Causas de interesse', causasContent, 0],
        ['Histórico de doações', '<p class="emp">O histórico de doações estará disponível em breve.</p>', 0],
      ];

  sections.push(['', blocoExcluirConta(), 0]);

  const meta = [
    [ap, 'doações aprovadas'],
    [USER.apoios.length, 'ONGs apoiadas'],
    [FOLLOW.size, 'seguindo', "abrirLista('seguindo', null)"],
  ];

  const owner = `<div class="acts"><a class="btn ghost sm" href="#/editar-perfil">${lc('pencil', 16)} Editar perfil</a></div>`;

  return shell(
    profile(
      nomeDoador(),
      200,
      USER.bio || 'Ainda sem bio.',
      meta,
      sections,
      owner,
      USER.social,
      USER.banner_url || '',
      USER.avatar_url,
      null,
      USER.bannerCor || ''
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
    const tile = (p) => {
      const img = (p.imgs || [])[0];
      const rot = p.kind == 'CAMPANHA' ? 'Campanha' : p.kind == 'VOLUNTARIADO' ? 'Voluntariado' : '';
      return `
        <div role="button" tabindex="0" aria-label="Abrir publicação" onclick="openPost(${p.id})"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPost(${p.id})}"
             style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:8px;background:#39677e;cursor:pointer">
          ${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ''}
          <span style="position:absolute;left:0;right:0;bottom:0;padding:18px 8px 6px;font-size:12px;line-height:1.25;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff">${esc((p.text || '').slice(0, 50))}</span>
          ${rot ? `<span class="tag" style="position:absolute;top:6px;left:6px;margin:0">${rot}</span>` : ''}
        </div>`;
    };
    return ps.length
      ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">${ps.map(tile).join('')}</div>`
      : '<p class="emp">Nenhuma publicação ainda.</p>';
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

V.ong = (id, sec = 'publicacoes') => {
  const o = ong(id);
  if (!o) {
    return shell('<div class="card emp">ONG não encontrada.</div>', 'buscar', {
      rightCol: 0,
      wide: 1,
    });
  }

  /* dados completos da ONG (história, causas, capa, redes…) vindos do banco */
  const pf = ONG_PERFIL[o.id];
  if (pf) Object.assign(o, pf.dados);
  if (!DEMO && (!pf || Date.now() - pf.ts > 60000)) carregarPerfilOng(o.id);

  const ps = POSTS.filter((p) => p.ong == o.id);
  const cps = ps.filter((p) => p.camp);
  const op = cps.find((p) => p.camp.status != 'ENCERRADA');
  const f = FOLLOW.has(o.id);
  const v = isVol(o.id);
  const me = o.id == ME_ONG;

  const acts = me
    ? `<div class="acts"><a class="btn ghost sm" href="#/editar-perfil">${lc('pencil', 16)} Editar perfil</a></div>${!DEMO && ROLE == 'ong' ? pendCard() : ''}`
    : `<div class="acts">
         <a class="btn sm" href="${op ? '#/doar/' + op.id : '#'}" ${op ? '' : 'aria-disabled="true"'}>Doar</a>
         <button class="btn light sm" data-fo="${o.id}" ${EB()} aria-pressed="${f}" onclick="toggleSet(FOLLOW, ${o.id})">${f ? 'Seguindo' : 'Seguir'}</button>
         <button class="btn ghost sm" ${EB()} data-on="Candidatura enviada" data-off="Quero ser voluntário" aria-pressed="${v}" onclick="volunteer(${o.id}, null, this)">${v ? 'Candidatura enviada' : 'Quero ser voluntário'}</button>
         <a class="btn ghost sm" href="#/chats">Mensagem</a>
       </div>`;

  const tabs = `<nav class="tabs" aria-label="Seções do perfil">${SECS.map(([k, n]) => `<a href="#/ong/${o.id}/${k}" class="${sec == k ? 'on' : ''}">${n}</a>`).join('')}</nav>`;

  const camps = ps.filter((p) => p.kind == 'CAMPANHA');
  const cont = ONG_CONT[o.id];
  if (!DEMO && (!cont || Date.now() - cont.ts > 20000)) carregarContagens(o.id);

  const nSeguidores = cont ? cont.seguidores : o.followers || 0;
  const nSeguindo = cont ? cont.seguindo : me ? FOLLOW.size : 0;

  const meta = [
    [nSeguidores, 'seguidores', `abrirLista('seguidores', ${o.id})`],
    [nSeguindo, 'seguindo', `abrirLista('seguindo', ${o.id})`],
    [camps.length, 'campanhas', `abrirCampanhas(${o.id})`],
    [o.transp || '—', 'transparência'],
  ];

  const sections = [
    ['', tabs + `<div class="tabc">${ongTab(o, sec, ps)}</div>`, 0],
  ];

  if (me && ROLE == 'ong') sections.push(['', blocoExcluirConta(), 0]);

  /* ONG com momentos no ar: a foto vira o botão que abre os momentos (com moldura) */
  const gm = momGroups().find((g) => g.o == o.id);
  const momOng = gm ? { id: o.id, vistos: gm.vistos } : null;

  return shell(
    profile(
      o.name,
      o.h,
      [o.cat, o.city].filter(Boolean).join(' · ') || 'Sem descrição',
      meta,
      sections,
      acts,
      o.social,
      o.banner,
      o.logo,
      momOng,
      o.bannerCor || ''
    ),
    me ? 'perfil' : 'buscar',
    { rightCol: 0, wide: 1 }
  );
};