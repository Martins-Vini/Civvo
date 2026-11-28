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

/* =====================================================================
   MODO REAL: edição completa do perfil (ONG e doador)
   Dados vêm de GET /perfil/me e são salvos em PUT /perfil/me.
   Fotos vão por upload (POST /perfil/imagem) para o Cloudinary.
   ===================================================================== */
let PERFIL_ME = null; /* meus dados salvos no banco */
let PERFIL_ERRO = '';
let PERFIL_CARR = false;
let EPF = null; /* estado da tela de edição */
let EPF_FOCO = null; /* campo a destacar ao abrir a edição (vem das pendências) */
let RC = null; /* estado do recorte de imagem */

/* 24 cores para a capa do perfil */
const CORES_CAPA = [
  '#39677e', '#2d4f61', '#1f3945', '#4a778b', '#6fa8c7', '#b7e7ff',
  '#0ea5e9', '#2563eb', '#4f46e5', '#7c3aed', '#a21caf', '#db2777',
  '#e11d48', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
  '#16a34a', '#059669', '#0d9488', '#0891b2', '#475569', '#111827',
];

/* resposta do back -> objetos que o app usa (USER / ONGS) */
function aplicarMeuPerfil(p) {
  PERFIL_ME = p;

  if (p.tipo === 'ONG') {
    /* Quem sou eu como ONG: o login nem sempre devolve ongProfileId, mas o perfil sempre traz ong_id.
       Sem isso, ME_ONG fica nulo/0 e a ONG não é reconhecida como dona das próprias publicações
       (some o "Gerenciar" e o botão de excluir comentários de outras pessoas). */
    if (p.ong_id != null && ME_ONG != p.ong_id) {
      const falso = ONGS.findIndex((x) => x.id === 0 && x.name === 'Sua ONG');
      if (falso >= 0) ONGS.splice(falso, 1);
      ME_ONG = p.ong_id;
    }
    const dados = dadosOng(p);
    ONG_PERFIL[p.ong_id] = { dados, ts: Date.now() };
    let o = ONGS.find((x) => x.id == p.ong_id);
    if (!o) {
      o = { id: p.ong_id, h: (p.ong_id * 70) % 360, ver: false, followers: 0, plano: p.plano_tipo || 'GRATUITO' };
      ONGS.push(o);
    }
    Object.assign(o, dados);
    return;
  }

  if (p.tipo === 'DOADOR') {
    const e = p.endereco || {};
    const t = p.telefone || {};
    Object.assign(USER, {
      nome: p.nome,
      sobrenome: p.sobrenome,
      apelido_unico: p.apelido_unico,
      cpf: p.cpf || '',
      bio: p.bio || '',
      avatar_url: imgOk(p.avatar_url),
      banner_url: imgOk(p.banner_url),
      bannerCor: p.banner_cor || '',
      causas: Array.isArray(p.causas) ? p.causas : [],
      social: p.redes || {},
      end: { cep: e.cep || '', estado: e.estado || '', rua: e.rua || '', bairro: e.bairro || '', cidade: e.cidade || '' },
      tel: { ddd: t.ddd || '', numero: t.numero || '', whats: !!t.whats },
      voluntariadosPublicos: p.voluntariados_publicos,
    });
    /* chave Pix do doador (remetente): no modo real o back guarda uma só, em chave_pix */
    if (p.chave_pix !== undefined) {
      USER.pix = p.chave_pix ? [{ id: 1, tipo: pixTipo(p.chave_pix) || 'Chave', chave: p.chave_pix }] : [];
    }
  }
}

function carregarMeuPerfil() {
  if (PERFIL_CARR) return;
  PERFIL_CARR = true;
  PERFIL_ERRO = '';

  API.meuPerfil()
    .then((p) => {
      if (!p || !p.tipo) throw new Error('Resposta inesperada do servidor.');
      aplicarMeuPerfil(p);
    })
    .catch((e) => {
      console.error('Falha ao carregar o perfil:', e);
      PERFIL_ERRO = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar o seu perfil.';
    })
    .finally(() => {
      PERFIL_CARR = false;
      go();
    });
}

function recarregarMeuPerfil() {
  PERFIL_ERRO = '';
  PERFIL_ME = null;
  go();
}

/* ---------- peças de formulário (com ícones e marca de pendência) ---------- */
const pendIcone = (falta) =>
  falta ? `<span class="ep-pend" title="Pendente" aria-label="Pendente">${lc('triangle-alert', 16)}</span>` : '';

const FI = (id, icone, rotulo, valor = '', { t = 'text', x = '', falta = false, dica = '' } = {}) => `
  <label for="${id}" class="ep-l">${lc(icone, 16)}<span>${rotulo}</span>${pendIcone(falta)}</label>
  <input id="${id}" class="in" type="${t}" value="${esc(valor ?? '')}" ${x}>
  ${dica ? `<small style="color:var(--mut)">${dica}</small>` : ''}`;

const TI = (id, icone, rotulo, valor = '', { rows = 3, falta = false, max = 0 } = {}) => `
  <label for="${id}" class="ep-l">${lc(icone, 16)}<span>${rotulo}</span>${pendIcone(falta)}</label>
  <textarea id="${id}" class="in" rows="${rows}" ${max ? `maxlength="${max}"` : ''}>${esc(valor ?? '')}</textarea>`;

const grpI = (icone, titulo, corpo, faltam = 0, id = '') => `
  <div class="card set" ${id ? `id="${id}"` : ''}>
    <h4 class="ep-h">${lc(icone, 18)}<span>${titulo}</span>${faltam ? `<span class="ep-badge">${lc('triangle-alert', 14)}${faltam} ${faltam > 1 ? 'pendências' : 'pendência'}</span>` : ''}</h4>
    ${corpo}
  </div>`;

const splitCausas = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

function chipsCausas() {
  const todas = [...new Set([...CAUSAS, ...EPF.causas])];
  return `<div class="chips dk" id="epCausas">${todas
    .map((c) => `<button type="button" class="chip ${EPF.causas.has(c) ? 'on' : ''}" aria-pressed="${EPF.causas.has(c)}" data-c="${esc(c)}" onclick="epCausa(this)">${esc(c)}</button>`)
    .join('')}</div>`;
}

function epCausa(b) {
  const c = b.dataset.c;
  EPF.causas.has(c) ? EPF.causas.delete(c) : EPF.causas.add(c);
  b.classList.toggle('on', EPF.causas.has(c));
  b.setAttribute('aria-pressed', EPF.causas.has(c));
}

function epVol(mostrar, b) {
  EPF.vol = mostrar;
  b.parentElement.querySelectorAll('button').forEach((x) => {
    x.classList.toggle('on', x === b);
    x.setAttribute('aria-pressed', x === b);
  });
}

/* ---------- identidade do perfil que está sendo editado ---------- */
const epIdentidade = () => {
  const p = PERFIL_ME;
  if (p.tipo === 'ONG') return { nome: $('#epNome')?.value.trim() || p.nome_fantasia, h: (p.ong_id * 70) % 360, url: imgOk(p.logo_url) };
  const nome = `${$('#epNome')?.value.trim() || p.nome} ${$('#epSob')?.value.trim() || p.sobrenome}`.trim();
  return { nome, h: 200, url: imgOk(p.avatar_url) };
};

function epAtualizarAvatar() {
  const el = $('#epAv');
  if (!el) return;
  const { nome, h, url } = epIdentidade();
  el.innerHTML = av(nome, h, 96, url);
  const rm = $('#epAvRm');
  if (rm) rm.hidden = !url;
}

/* ---------- capa: cor ou foto ---------- */
function epPintarCapa() {
  const el = $('#epCoverPrev');
  if (!el || !EPF) return;

  const foto = EPF.fotoCapa && !EPF.removerFoto ? imgOk(PERFIL_ME.banner_url) : '';
  if (foto) {
    el.style.background = `url("${String(foto).replace(/"/g, '%22')}") center/cover`;
  } else if (EPF.cor) {
    el.style.background = EPF.cor;
  } else {
    el.style.background = 'linear-gradient(135deg,#2d4f61,#39677e)'; /* padrão: azul do Civvo */
  }

  document.querySelectorAll('.ep-cor[data-cor]').forEach((b) => {
    const on = !foto && !!EPF.cor && b.dataset.cor === EPF.cor;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });

  const rm = $('#epCapaRm');
  if (rm) rm.hidden = !foto;
}

function epCor(c) {
  if (!/^#[0-9a-f]{6}$/i.test(c)) return;
  EPF.cor = c.toLowerCase();
  if (EPF.fotoCapa) EPF.removerFoto = true; /* escolher uma cor substitui a foto ao salvar */
  const livre = $('#epCorLivre');
  if (livre) livre.value = EPF.cor;
  epPintarCapa();
}

function epRemoverCapaFoto() {
  EPF.removerFoto = true;
  epPintarCapa();
}

/* ---------- escolher e enviar fotos ---------- */
function epEscolherFoto(alvo) {
  EPF.alvo = alvo;
  const inp = $('#epFile');
  if (!inp) return;
  inp.value = '';
  inp.click();
}

function epArquivoEscolhido(inp) {
  const f = inp.files && inp.files[0];
  if (!f) return;
  const alvo = EPF.alvo;

  if (!/^image\//.test(f.type)) {
    toast('Escolha um arquivo de imagem.');
    return;
  }

  abrirRecorte({
    arquivo: f,
    aspecto: alvo == 'avatar' ? 1 : 1500 / 400,
    saida: alvo == 'avatar' ? [512, 512] : [1500, 400],
    circular: alvo == 'avatar',
    titulo: alvo == 'avatar' ? 'Ajustar foto de perfil' : 'Ajustar capa do perfil',
    aoConfirmar: (blob) => epEnviarImagem(alvo, blob),
  });
}

async function epEnviarImagem(alvo, blob) {
  const fd = new FormData();
  fd.append('tipo', alvo);
  fd.append('image', blob, alvo + '.jpg');

  const r = await API.enviarImagemPerfil(fd);
  if (!r || !r.url) throw new Error('O servidor não devolveu a imagem.');

  if (alvo == 'avatar') {
    if (PERFIL_ME.tipo === 'ONG') PERFIL_ME.logo_url = r.url;
    else PERFIL_ME.avatar_url = r.url;
  } else {
    PERFIL_ME.banner_url = r.url;
    EPF.fotoCapa = true;
    EPF.removerFoto = false;
  }

  aplicarMeuPerfil(PERFIL_ME);
  epAtualizarAvatar();
  epPintarCapa();
  toast(alvo == 'avatar' ? 'Foto de perfil atualizada.' : 'Capa atualizada.');
}

async function epRemoverFotoPerfil(btn) {
  const ehOng = PERFIL_ME.tipo === 'ONG';
  const ok = await comEspera(btn, 'Removendo…', async () => {
    await API.atualizarMeuPerfil(ehOng ? { logo_url: null } : { avatar_url: null });
    if (ehOng) PERFIL_ME.logo_url = null;
    else PERFIL_ME.avatar_url = null;
    aplicarMeuPerfil(PERFIL_ME);
  });
  if (!ok) return;
  epAtualizarAvatar();
  toast('Foto removida.');
}

/* ---------- recorte de imagem (arrastar + zoom) ---------- */
function abrirRecorte({ arquivo, aspecto, saida, circular, titulo, aoConfirmar }) {
  const url = URL.createObjectURL(arquivo);
  const img = new Image();

  img.onerror = () => {
    URL.revokeObjectURL(url);
    toast('Não foi possível abrir esta imagem.');
  };

  img.onload = () => {
    const larg = Math.max(200, Math.min(aspecto >= 1.5 ? 520 : 340, window.innerWidth - 64));
    const fw = larg;
    const fh = Math.round(fw / aspecto);
    const s0 = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);

    RC = {
      img, url, fw, fh, s0, zoom: 1, s: s0, saida, aoConfirmar, drag: null,
      ox: (fw - img.naturalWidth * s0) / 2,
      oy: (fh - img.naturalHeight * s0) / 2,
    };

    document.getElementById('rc')?.remove();
    const d = document.createElement('div');
    d.id = 'rc';
    d.className = 'rc';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    d.setAttribute('aria-label', titulo);
    d.innerHTML = `
      <div class="rc-card">
        <h3 class="ep-h">${lc('image', 18)}<span>${esc(titulo)}</span></h3>
        <div class="rc-frame ${circular ? 'circ' : ''}" id="rcFrame" style="width:${fw}px;height:${fh}px"><img id="rcImg" alt="" draggable="false"></div>
        <div class="rc-zoom">${lc('zoom-in', 18)}<input type="range" id="rcZ" min="1" max="4" step="0.01" value="1" aria-label="Zoom" oninput="rcZoom(+this.value)"></div>
        <small style="color:var(--mut)">Arraste a imagem para posicionar e use o controle para ampliar.</small>
        <p class="dn-err" id="rcErr" role="alert"></p>
        <div class="rc-acts">
          <button class="btn ghost" onclick="rcFechar()">${lc('x', 16)} Cancelar</button>
          <button class="btn" id="rcOk" onclick="rcConfirmar(this)">${lc('check', 16)} Usar esta foto</button>
        </div>
      </div>`;
    document.body.appendChild(d);

    const im = d.querySelector('#rcImg');
    im.src = url;
    rcPintar();

    const fr = d.querySelector('#rcFrame');
    fr.addEventListener('pointerdown', (e) => {
      RC.drag = { x: e.clientX, y: e.clientY, ox: RC.ox, oy: RC.oy };
      fr.setPointerCapture(e.pointerId);
      fr.classList.add('arrastando');
    });
    fr.addEventListener('pointermove', (e) => {
      if (!RC || !RC.drag) return;
      RC.ox = RC.drag.ox + (e.clientX - RC.drag.x);
      RC.oy = RC.drag.oy + (e.clientY - RC.drag.y);
      rcLimitar();
      rcPintar();
    });
    const soltar = () => {
      if (RC) RC.drag = null;
      fr.classList.remove('arrastando');
    };
    fr.addEventListener('pointerup', soltar);
    fr.addEventListener('pointercancel', soltar);
    fr.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const z = Math.max(1, Math.min(4, RC.zoom + (e.deltaY < 0 ? 0.12 : -0.12)));
        $('#rcZ').value = z;
        rcZoom(z);
      },
      { passive: false }
    );

    document.addEventListener('keydown', rcTecla);
    d.querySelector('#rcOk').focus();
  };

  img.src = url;
}

const rcTecla = (e) => {
  if (e.key === 'Escape') rcFechar();
};

function rcLimitar() {
  const w = RC.img.naturalWidth * RC.s;
  const h = RC.img.naturalHeight * RC.s;
  RC.ox = Math.min(0, Math.max(RC.fw - w, RC.ox));
  RC.oy = Math.min(0, Math.max(RC.fh - h, RC.oy));
}

function rcPintar() {
  const im = document.getElementById('rcImg');
  if (!im || !RC) return;
  im.style.width = RC.img.naturalWidth * RC.s + 'px';
  im.style.height = RC.img.naturalHeight * RC.s + 'px';
  im.style.left = RC.ox + 'px';
  im.style.top = RC.oy + 'px';
}

function rcZoom(z) {
  if (!RC) return;
  /* amplia mantendo o centro da moldura no mesmo ponto da imagem */
  const cx = (RC.fw / 2 - RC.ox) / RC.s;
  const cy = (RC.fh / 2 - RC.oy) / RC.s;
  RC.zoom = z;
  RC.s = RC.s0 * z;
  RC.ox = RC.fw / 2 - cx * RC.s;
  RC.oy = RC.fh / 2 - cy * RC.s;
  rcLimitar();
  rcPintar();
}

function rcFechar() {
  document.removeEventListener('keydown', rcTecla);
  if (RC) URL.revokeObjectURL(RC.url);
  RC = null;
  document.getElementById('rc')?.remove();
}

async function rcConfirmar(btn) {
  if (!RC) return;
  const { img, s, ox, oy, fw, fh, saida, aoConfirmar } = RC;
  const err = document.getElementById('rcErr');
  err.textContent = '';

  const c = document.createElement('canvas');
  c.width = saida[0];
  c.height = saida[1];
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -ox / s, -oy / s, fw / s, fh / s, 0, 0, saida[0], saida[1]);

  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
  if (!blob) {
    err.textContent = 'Não foi possível preparar a imagem.';
    return;
  }

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    await aoConfirmar(blob);
    rcFechar();
  } catch (e) {
    err.textContent = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível enviar a imagem. Tente de novo.';
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

/* ---------- foco nos campos pendentes ---------- */
function epFoco(campo) {
  const el = document.getElementById(campo);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (el.focus) el.focus({ preventScroll: true });
  const caixa = el.closest('.card') || el;
  caixa.classList.remove('ep-flash');
  void caixa.offsetWidth;
  caixa.classList.add('ep-flash');
}

/* ---------- a tela ---------- */
function editarPerfilReal() {
  const topo = (c) => shell(`<div class="top"><h1>Editar perfil</h1></div>${c}`, 'perfil', { rightCol: 0 });

  if (PERFIL_ERRO) {
    return topo(`<div class="card emp" role="alert"><p>${esc(PERFIL_ERRO)}</p><button class="btn sm" onclick="recarregarMeuPerfil()">Tentar de novo</button></div>`);
  }
  if (!PERFIL_ME) {
    carregarMeuPerfil();
    return topo('<div class="card emp" role="status">Carregando seu perfil…</div>');
  }

  const p = PERFIL_ME;
  const ehOng = p.tipo === 'ONG';

  if (!EPF || EPF.ref !== p) {
    EPF = {
      ref: p,
      alvo: 'avatar',
      cor: p.banner_cor || '',
      fotoCapa: !!imgOk(p.banner_url),
      removerFoto: false,
      causas: new Set(ehOng ? splitCausas(p.causas_atendidas) : Array.isArray(p.causas) ? p.causas : []),
      vol: p.voluntariados_publicos !== false,
    };
  }

  const pend = new Set(ehOng ? pendenciasOng().map((x) => x.campo) : []);
  const cont = (...ids) => ids.filter((i) => pend.has(i)).length;
  const e = p.endereco || {};
  const t = p.telefone || {};
  const s = p.redes || {};
  const { nome, h, url } = epIdentidade();

  /* --- aparência: foto de perfil e capa --- */
  const swatches = CORES_CAPA.map(
    (c) => `<button type="button" class="ep-cor" data-cor="${c}" style="background:${c}" aria-label="Cor ${c}" aria-pressed="false" onclick="epCor('${c}')">${lc('check', 16)}</button>`
  ).join('');

  const aparencia = grpI(
    'palette',
    'Aparência',
    `<div class="ep-prev">
       <div class="ep-cover" id="epCoverPrev"></div>
       <div class="ep-avwrap" id="epFoto">
         <div id="epAv">${av(nome, h, 96, url)}</div>
         <button class="ep-cam" type="button" aria-label="Trocar foto de perfil" title="Trocar foto de perfil" onclick="epEscolherFoto('avatar')">${lc('camera', 18)}</button>
       </div>
     </div>
     <div class="ep-acts">
       <button class="btn light sm" type="button" onclick="epEscolherFoto('avatar')">${lc('camera', 16)} Trocar foto de perfil</button>
       <button class="btn ghost sm" type="button" id="epAvRm" ${url ? '' : 'hidden'} onclick="epRemoverFotoPerfil(this)">${lc('trash-2', 16)} Remover foto</button>
     </div>
     <label class="ep-l" id="epCapaL">${lc('palette', 16)}<span>Capa do perfil</span>${pendIcone(pend.has('epCapa'))}</label>
     <div class="ep-cores" role="group" aria-label="Cor da capa">
       ${swatches}
       <label class="ep-cor ep-custom" title="Escolher outra cor" aria-label="Escolher outra cor">${lc('plus', 16)}<input type="color" id="epCorLivre" value="${EPF.cor || '#39677e'}" oninput="epCor(this.value)"></label>
     </div>
     <div class="ep-acts">
       <button class="btn light sm" type="button" onclick="epEscolherFoto('banner')">${lc('image', 16)} Enviar foto de capa</button>
       <button class="btn ghost sm" type="button" id="epCapaRm" hidden onclick="epRemoverCapaFoto()">${lc('trash-2', 16)} Remover foto da capa</button>
     </div>
     <small style="color:var(--mut)">${lc('info', 13)} Tamanho ideal da foto de capa: 1500 × 400 px (formato largo). Você ajusta o enquadramento antes de enviar.</small>
     <input type="file" id="epFile" accept="image/*" hidden onchange="epArquivoEscolhido(this)">`,
    cont('epFoto', 'epCapa'),
    'epCapa'
  ).replace('id="epCapa"', 'id="epCapa"');

  /* --- campos por tipo de conta --- */
  const dados = ehOng
    ? grpI(
        'building-2',
        'Identidade da ONG',
        FI('epNome', 'building-2', 'Nome fantasia', p.nome_fantasia) +
          FI('epRaz', 'lock', 'Razão social (não editável)', p.razao_social, { x: 'disabled' }) +
          FI('epCnpj', 'lock', 'CNPJ (não editável)', p.cnpj, { x: 'disabled' }) +
          FI('epCnae', 'building-2', 'CNAE', p.cnae, { falta: pend.has('epCnae') }) +
          TI('epBio', 'file-text', 'Nossa história', p.historia, { rows: 4, falta: pend.has('epBio'), max: 5000 }) +
          FI('epPix', 'wallet', 'Chave Pix para receber doações', p.chave_pix, {
          falta: pend.has('epPix'),
          dica: 'CPF, CNPJ, e-mail, celular com DDD ou chave aleatória. É a chave que os doadores veem ao doar por Pix.',
        }),
        cont('epCnae', 'epBio', 'epPix')
      ) +
      grpI(
        'heart',
        'Causas atendidas',
        `<span id="epCausasL" class="ep-l" style="margin-top:0">${lc('heart', 16)}<span>Escolha as causas que a ONG atende</span>${pendIcone(pend.has('epCausas'))}</span>${chipsCausas()}`,
        cont('epCausas')
      ) +
      grpI(
        'target',
        'Estatuto e governança',
        TI('epMis', 'target', 'Missão', p.missao, { rows: 2, falta: pend.has('epMis'), max: 2000 }) +
          TI('epObj', 'target', 'Objetivos', p.objetivos, { rows: 2, falta: pend.has('epObj'), max: 2000 }) +
          FI('epGes', 'users', 'Gestão', p.gestao, { falta: pend.has('epGes') }) +
          FI('epGov', 'users', 'Pessoas governadoras (separe por vírgula)', p.governanca, { falta: pend.has('epGov') }),
        cont('epMis', 'epObj', 'epGes', 'epGov')
      )
    : grpI(
        'user',
        'Dados pessoais',
        `<div class="row2"><div>${FI('epNome', 'user', 'Nome', p.nome)}</div><div>${FI('epSob', 'user', 'Sobrenome', p.sobrenome)}</div></div>` +
          FI('epApe', 'user', 'Apelido único', p.apelido_unico, { dica: 'Letras, números, ponto ou sublinhado (3 a 30 caracteres).' }) +
          TI('epBio', 'file-text', 'Bio', p.bio, { rows: 4, max: 1000 }) +
          FI('epCpf', 'lock', 'CPF (opcional)', p.cpf, { x: 'inputmode="numeric" maxlength="14"', dica: 'Usado para identificar suas doações no comprovante e no IRPF.' })
      ) +
      grpI('heart', 'Causas de interesse', chipsCausas()) +
      grpI(
        'wallet',
        'Pix (remetente)',
        FI('epPix', 'wallet', 'Chave Pix', p.chave_pix, {
          dica: 'A chave da conta de onde você envia as doações (CPF, e-mail, celular com DDD ou chave aleatória). Deixe vazio se não quiser cadastrar.',
        })
      );

  const endereco = grpI(
    'map-pin',
    'Endereço',
    `<div class="row2">
       <div>${FI('epCep', 'map-pin', 'CEP', e.cep, { x: 'inputmode="numeric" placeholder="00000-000" maxlength="9"', falta: pend.has('epCep') })}</div>
       <div>${FI('epUf', 'map-pin', 'Estado (UF)', e.estado, { x: 'maxlength="2"' })}</div>
     </div>` +
      FI('epRua', 'map-pin', 'Rua', e.rua) +
      `<div class="row2"><div>${FI('epBai', 'map-pin', 'Bairro', e.bairro)}</div><div>${FI('epCid', 'map-pin', 'Cidade', e.cidade)}</div></div>`,
    cont('epCep')
  );

  const telefone = grpI(
    'phone',
    'Telefone',
    `<div class="row2">
       <div>${FI('epDdd', 'phone', 'DDD', t.ddd, { x: 'inputmode="numeric" maxlength="2"', falta: pend.has('epDdd') })}</div>
       <div>${FI('epNum', 'phone', 'Número', t.numero, { x: 'inputmode="numeric" maxlength="10"' })}</div>
     </div>
     <label class="rd"><input type="checkbox" id="epWpp" ${t.whats ? 'checked' : ''}> Este número tem WhatsApp</label>`,
    cont('epDdd')
  );

  const redes = grpI(
    'link',
    'Redes sociais',
    NET.map(([k, n]) => FI('epS_' + k, 'link', n, s[k] || '', { t: 'url', x: 'placeholder="https://"', falta: k === 'instagram' && pend.has('epS_instagram') })).join(''),
    cont('epS_instagram')
  );

  const privacidade = ehOng
    ? ''
    : grpI(
        'eye',
        'Privacidade',
        `<span class="ep-l" style="margin-top:0">${lc('eye', 16)}<span>Voluntariados no perfil público</span></span>
         <div class="seg" role="group" aria-label="Voluntariados no perfil público">
           <button type="button" class="${EPF.vol ? 'on' : ''}" aria-pressed="${EPF.vol}" onclick="epVol(true, this)">${lc('eye', 16)} Mostrar</button>
           <button type="button" class="${EPF.vol ? '' : 'on'}" aria-pressed="${!EPF.vol}" onclick="epVol(false, this)">Ocultar</button>
         </div>`
      );

  const resumo = ehOng && pend.size ? pendCard('epFoco') : '';

  const conteudo = `
    ${resumo}
    ${aparencia}
    ${dados}
    ${endereco}
    ${telefone}
    ${redes}
    ${privacidade}
    <p class="dn-err" id="eerr" role="alert"></p>
    <div class="acts">
      <button class="btn" onclick="saveProfile(this)">${lc('save', 16)} Salvar alterações</button>
      <a class="btn ghost" href="#/perfil" onclick="EPF = null">${lc('x', 16)} Cancelar</a>
    </div>`;

  /* depois de desenhar: pinta a prévia da capa e, se veio de uma pendência, vai até o campo */
  setTimeout(() => {
    epPintarCapa();
    if (EPF_FOCO) {
      const c = EPF_FOCO;
      EPF_FOCO = null;
      epFoco(c);
    }
  }, 60);

  return topo(conteudo);
}

/* ---------- salvar ---------- */
async function saveProfileReal(btn) {
  const p = PERFIL_ME;
  const e = $('#eerr');
  const v = (id) => ($('#' + id)?.value || '').trim();
  const falha = (msg, campo) => {
    e.textContent = msg;
    if (campo) epFoco(campo);
  };
  e.textContent = '';

  const ehOng = p.tipo === 'ONG';
  const d = {};

  if (v('epPix') && !pixTipo(v('epPix'))) return falha(PIX_ERRO, 'epPix');

  if (ehOng) {
    if (!v('epNome')) return falha('Informe o nome da ONG.', 'epNome');
    Object.assign(d, {
      nome_fantasia: v('epNome'),
      cnae: v('epCnae'),
      historia: v('epBio'),
      causas_atendidas: [...EPF.causas].join(', '),
      chave_pix: v('epPix'),
      missao: v('epMis'),
      objetivos: v('epObj'),
      gestao: v('epGes'),
      governanca: v('epGov'),
    });
  } else {
    if (!v('epNome')) return falha('Informe o seu nome.', 'epNome');
    if (!v('epSob')) return falha('Informe o seu sobrenome.', 'epSob');
    if (!/^[A-Za-z0-9._]{3,30}$/.test(v('epApe'))) {
      return falha('O apelido deve ter de 3 a 30 caracteres: letras, números, ponto ou sublinhado.', 'epApe');
    }
    const cpf = v('epCpf').replace(/\D/g, '');
    if (cpf && cpf.length != 11) return falha('O CPF deve ter 11 dígitos.', 'epCpf');
    Object.assign(d, {
      nome: v('epNome'),
      sobrenome: v('epSob'),
      apelido_unico: v('epApe'),
      cpf,
      bio: v('epBio'),
      causas: [...EPF.causas],
      voluntariados_publicos: EPF.vol,
      chave_pix: v('epPix'),
    });
  }

  const end = { cep: v('epCep'), estado: v('epUf').toUpperCase(), rua: v('epRua'), bairro: v('epBai'), cidade: v('epCid') };
  if (Object.values(end).some(Boolean)) {
    if (!end.rua || !end.bairro || !end.cidade) return falha('Endereço: preencha rua, bairro e cidade.', !end.rua ? 'epRua' : !end.bairro ? 'epBai' : 'epCid');
    if (!/^[A-Z]{2}$/.test(end.estado)) return falha('Endereço: o estado deve ter 2 letras (UF).', 'epUf');
    if (end.cep.replace(/\D/g, '').length != 8) return falha('Endereço: o CEP deve ter 8 dígitos.', 'epCep');
    d.endereco = end;
  }

  const tel = { ddd: v('epDdd'), numero: v('epNum'), whats: !!$('#epWpp')?.checked };
  if (tel.ddd || tel.numero) {
    if (tel.ddd.replace(/\D/g, '').length != 2) return falha('Telefone: o DDD deve ter 2 dígitos.', 'epDdd');
    const n = tel.numero.replace(/\D/g, '').length;
    if (n < 8 || n > 9) return falha('Telefone: o número deve ter 8 ou 9 dígitos.', 'epNum');
    d.telefone = tel;
  }

  const redes = {};
  for (const [k, n] of NET) {
    const u = v('epS_' + k);
    if (u && !safeUrl(u)) return falha(`Link do ${n} inválido. Comece com https://`, 'epS_' + k);
    redes[k] = u;
  }
  d.redes = redes;

  d.banner_cor = EPF.cor || null;
  if (EPF.removerFoto) d.banner_url = null;

  const ok = await comEspera(btn, 'Salvando…', async () => {
    try {
      const r = await API.atualizarMeuPerfil(d);
      /* GET /perfil/me devolve o perfil "cru" (sem envelope); aceita os dois formatos aqui também,
         senão o Pix (e o resto) salva certinho no banco mas não atualiza na tela até recarregar tudo */
      const perfilAtualizado = r && r.perfil ? r.perfil : r;
      if (perfilAtualizado && perfilAtualizado.tipo) aplicarMeuPerfil(perfilAtualizado);
    } catch (err) {
      e.textContent = err.name == 'ApiError' && err.message ? err.message : 'Não foi possível salvar. Tente de novo.';
      throw err;
    }
  });

  if (!ok) return;

  EPF = null;
  toast('Perfil atualizado.');
  location.hash = '#/perfil';
}

/* estilos da tela de edição, do recorte e dos destaques */
(() => {
  if (document.getElementById('civvo-ep-css')) return;
  const st = document.createElement('style');
  st.id = 'civvo-ep-css';
  st.textContent = `
    .ep-l{display:flex;align-items:center;gap:6px}
    .ep-l .lc{color:var(--mut)}
    .ep-pend{color:#f59e0b;display:inline-flex;margin-left:2px}
    .ep-pend .lc{color:#f59e0b}
    .ep-h{display:flex;align-items:center;gap:8px}
    .ep-badge{margin-left:auto;display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:#f59e0b;background:rgba(245,158,11,.13);padding:3px 9px;border-radius:999px}
    .ep-badge .lc{color:#f59e0b}
    .ep-prev{position:relative;margin-bottom:60px}
    .ep-cover{height:150px;border-radius:12px;background:linear-gradient(135deg,#2d4f61,#39677e)}
    .ep-avwrap{position:absolute;left:18px;bottom:-52px}
    .ep-avwrap #epAv{border-radius:50%;border:4px solid var(--bg,#000);display:inline-block;line-height:0}
    .ep-cam{position:absolute;right:-2px;bottom:-2px;width:34px;height:34px;border-radius:50%;border:2px solid var(--bg,#000);background:#b7e7ff;color:#0b1a22;display:grid;place-items:center;cursor:pointer;padding:0}
    .ep-cores{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 12px}
    .ep-cor{position:relative;width:34px;height:34px;border-radius:50%;border:2px solid rgba(127,127,127,.4);cursor:pointer;display:grid;place-items:center;color:#fff;padding:0}
    .ep-cor .lc{opacity:0;filter:drop-shadow(0 0 2px rgba(0,0,0,.6))}
    .ep-cor.on{outline:3px solid #b7e7ff;outline-offset:2px}
    .ep-cor.on .lc{opacity:1}
    .ep-custom{background:conic-gradient(#f43f5e,#f59e0b,#84cc16,#06b6d4,#6366f1,#d946ef,#f43f5e)}
    .ep-custom .lc{opacity:1}
    .ep-custom input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
    .ep-acts{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
    .ep-acts [hidden]{display:none}
    .ep-flash{animation:epFlash 1.6s ease}
    @keyframes epFlash{0%,60%{box-shadow:0 0 0 3px rgba(245,158,11,.75)}100%{box-shadow:0 0 0 3px rgba(245,158,11,0)}}

    .rc{position:fixed;inset:0;z-index:2100;display:grid;place-items:center;background:rgba(0,0,0,.82);padding:16px}
    .rc-card{background:#161618;color:#fff;border-radius:16px;padding:18px;width:min(580px,100%);max-height:96vh;overflow:auto}
    .rc-frame{position:relative;overflow:hidden;margin:14px auto;border-radius:10px;background:#000;touch-action:none;cursor:grab;user-select:none}
    .rc-frame.arrastando{cursor:grabbing}
    .rc-frame img{position:absolute;max-width:none;user-select:none;-webkit-user-drag:none;pointer-events:none}
    .rc-frame.circ::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:0 0 0 999px rgba(0,0,0,.6);pointer-events:none}
    .rc-zoom{display:flex;align-items:center;gap:10px;margin:6px 0 8px}
    .rc-zoom input{flex:1}
    .rc-acts{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}
    .rc-acts .btn{display:inline-flex;align-items:center;gap:6px}
  `;
  document.head.appendChild(st);
})();

V['editar-perfil'] = () => {
  if (!DEMO) return editarPerfilReal();

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
      F('ePix', 'Chave Pix para receber doações', o.pix || '') +
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
  if (!DEMO) return saveProfileReal(btn);

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

  if (ong && v('ePix') && !pixTipo(v('ePix'))) {
    e.textContent = PIX_ERRO;
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