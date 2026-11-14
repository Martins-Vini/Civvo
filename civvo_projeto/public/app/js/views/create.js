/* Criação de conteúdo pela ONG: publicação e campanha (POSTS + CAMPAIGN_DETAILS, até 10 fotos em carrossel) e Momento (MOMENTS, 24 h).
   Editor de imagem: zoom e enquadramento por foto; o resultado é recortado no formato do destino (16:10 no feed, 9:16 no Momento). */

let ED = { list: [], cur: 0, W: 1280, H: 800, multi: true, pend: 0, mom: false };

const CT = {
  POST: ['Publicação', 'O que você quer compartilhar com os doadores?'],
  CAMPANHA: ['Campanha', 'Descreva o objetivo e para onde vai o dinheiro.'],
  VOLUNTARIO: ['Voluntariado', 'Descreva a vaga e como a pessoa pode ajudar.'],
  MOMENTO: ['Momento', 'Legenda (opcional)'],
};

const meOng = () => {
  /* ME_ONG definido (sessão real) = nunca usar outra ONG como substituta; só o demo cai na primeira */
  let o = ONGS.find((x) => x.id == ME_ONG) || (ME_ONG == null ? ONGS[0] : undefined);
  if (!o) {
    o = {
      id: ME_ONG ?? 0,
      name: 'Sua ONG',
      cat: '',
      city: '',
      bio: '',
      followers: 0,
      h: 200,
      ver: 0,
      plano: 'GRATUITO',
      transp: '',
    };
    ONGS.push(o);
  }
  ME_ONG = o.id;
  return o;
};

function openCreate(t = 'POST') {
  const mom = t == 'MOMENTO';
  ED = { 
    list: [], 
    cur: 0, 
    W: mom ? 720 : 1280, 
    H: mom ? 1280 : 800, 
    multi: !mom, 
    pend: 0, 
    mom 
  };

  const segHtml = Object.keys(CT)
    .map((k) => `<button class="${k == t ? 'on' : ''}" onclick="openCreate('${k}')">${CT[k][0]}</button>`)
    .join('');

  const campFields = t == 'CAMPANHA' ? `
    <div class="row2">
      <div>
        <label for="cMeta">Meta (R$)</label>
        <input id="cMeta" class="in" type="number" min="1">
      </div>
      <div>
        <label for="cLim">Prazo</label>
        <input id="cLim" class="in" type="date" min="${hoje()}">
      </div>
    </div>
  ` : '';

  const extraFields = (t == 'VOLUNTARIO' ? volFields() : '') + campFields;

 const bottomContent = mom 
    ? (DEMO
        ? '<p style="color:var(--mut);font-size:12px;margin-top:10px">O momento fica visível por 24 horas.</p>'
        : `<label for="cDur">Duração</label>
           <select id="cDur" class="in">
             <option value="24">24 horas</option>
             <option value="36">36 horas</option>
             <option value="48">48 horas</option>
           </select>`)
    : `<label for="cBoost">Impulsionar</label>
       <select id="cBoost" class="in">
         <option value="0">Não impulsionar</option>
         <option value="7">7 dias</option>
         <option value="15">15 dias</option>
         <option value="30">30 dias</option>
       </select>`;

  const submitBtn = t == 'VOLUNTARIO' && semPro() 
    ? '' 
    : `<button class="btn full" onclick="publish('${t}', this)">Publicar ${CT[t][0].toLowerCase()}</button>`;

  // Publicação/Campanha/Voluntariado: upload de arquivo de verdade (igual Instagram — no celular, o próprio
  // input já abre a galeria). As fotos vão para o Cloudinary na hora de publicar, nunca por link colado.
  // Momento: ainda por link por enquanto — a rota de criação de Momento no backend só aceita media_url
  // (isso muda quando mexermos nos Momentos/Stories).
  const mediaField = mom
    ? (DEMO
        ? `<label for="cMed">Imagem do momento</label>
           <input id="cMed" type="file" accept="image/*" class="in" onchange="edAdd(this)">
           <div id="edArea"></div>`
        : `<label for="cUrl">Link da imagem do momento</label>
           <input id="cUrl" class="in" type="url" placeholder="https://…">
           <small style="color:var(--mut)">Upload de arquivo para Momentos chega em breve: por enquanto, cole o link (https) de uma imagem já hospedada.</small>`)
    : `<label for="cMed">Imagens (até 10)</label>
       <input id="cMed" type="file" accept="image/*" multiple class="in" onchange="edAdd(this)">
       <div id="edArea"></div>`;

  openModal(
    `<h3>Criar</h3>
     <div class="seg" style="margin-bottom:8px">${segHtml}</div>
     <label for="cTxt">${mom ? 'Legenda' : 'Texto'}</label>
     <textarea id="cTxt" class="in" rows="${mom ? 2 : 4}" placeholder="${CT[t][1]}"></textarea>
     ${mediaField}
     ${extraFields}
     ${bottomContent}
     <div id="upc"></div>
     <p class="dn-err" id="cerr" role="alert"></p>
     ${submitBtn}`,
    'Criar conteúdo'
  );
}

/* editor de imagem */
const edGeom = (it, fw, fh) => {
  const iw = it.el.naturalWidth;
  const ih = it.el.naturalHeight;
  const s = Math.max(fw / iw, fh / ih) * it.zoom;
  const w = iw * s;
  const h = ih * s;

  return {
    w,
    h,
    l: (fw - w) / 2 + ((it.px / 100) * (w - fw)) / 2,
    t: (fh - h) / 2 + ((it.py / 100) * (h - fh)) / 2,
  };
};

function edAdd(inp) {
  if (!ED.multi) {
    ED.list = [];
    ED.cur = 0;
  }

  [...inp.files].slice(0, ED.multi ? 10 - ED.list.length : 1).forEach((f) => {
    ED.pend++;
    const r = new FileReader();
    
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        ED.list.push({ el: im, zoom: 1, px: 0, py: 0 });
        ED.cur = ED.list.length - 1;
        ED.pend--;
        edRender();
      };
      im.onerror = () => ED.pend--;
      im.src = r.result;
    };
    r.readAsDataURL(f);
  });
  
  inp.value = '';
}

function edRender() {
  const a = $('#edArea');
  if (!a) return;

  const it = ED.list[ED.cur];
  if (!it) {
    a.innerHTML = '';
    return;
  }

  const thumbsHtml = ED.multi ? `
    <div class="thumbs">
      ${ED.list.map((x, i) => `
        <div class="th ${i == ED.cur ? 'on' : ''}">
          <button aria-label="Ajustar foto ${i + 1}" onclick="edSel(${i})">
            <img src="${x.el.src}" alt="">
          </button>
          <button class="rm" aria-label="Remover foto ${i + 1}" onclick="edDel(${i})">✕</button>
        </div>
      `).join('')}
    </div>
    <small style="color:var(--mut)">${ED.list.length} de 10 fotos. Com mais de uma, aparecem em carrossel no feed.</small>
  ` : '';

  a.innerHTML = `
    <div class="ed ${ED.mom ? 'mom' : ''}" id="edF">
      <img id="edI" alt="Prévia ajustável">
    </div>
    <div class="edc">
      <span>Zoom</span>
      <input type="range" id="edZ" aria-label="Zoom" min="1" max="3" step="0.01" value="${it.zoom}" oninput="edSet()">
      <span>Horizontal</span>
      <input type="range" id="edX" aria-label="Posição horizontal" min="-100" max="100" value="${it.px}" oninput="edSet()">
      <span>Vertical</span>
      <input type="range" id="edY" aria-label="Posição vertical" min="-100" max="100" value="${it.py}" oninput="edSet()">
    </div>
    ${thumbsHtml}
  `;

  $('#edI').src = it.el.src;
  edPaint();
}

function edPaint() {
  const f = $('#edF');
  const it = ED.list[ED.cur];
  if (!f || !it) return;

  const g = edGeom(it, f.clientWidth, f.clientHeight);
  Object.assign($('#edI').style, {
    width: g.w + 'px',
    height: g.h + 'px',
    left: g.l + 'px',
    top: g.t + 'px',
  });
}

function edSet() {
  const it = ED.list[ED.cur];
  it.zoom = +$('#edZ').value;
  it.px = +$('#edX').value;
  it.py = +$('#edY').value;
  edPaint();
}

function edSel(i) {
  ED.cur = i;
  edRender();
}

function edDel(i) {
  ED.list.splice(i, 1);
  ED.cur = Math.max(0, Math.min(ED.cur, ED.list.length - 1));
  edRender();
}

function edOut(it) {
  const c = document.createElement('canvas');
  c.width = ED.W;
  c.height = ED.H;
  const g = edGeom(it, ED.W, ED.H);
  c.getContext('2d').drawImage(it.el, g.l, g.t, g.w, g.h);
  return c.toDataURL('image/jpeg', 0.85);
}

/* Converte a prévia recortada (dataURL) em Blob, pronta para ir num FormData de verdade. */
function dataURLtoBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/* Formatos de data do MySQL. Os prazos (só data) vão ao meio-dia para o dia não mudar por fuso horário ao voltar do back. */
const sqlDia = (iso) => `${iso} 12:00:00`;
const sqlAgora = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/* Publicação real: monta o payload do back e envia (ver criarPost em src/services/api.js). */
async function publishReal(t, btn) {
  const txt = $('#cTxt').value.trim();
  const e = $('#cerr');

  if (t == 'MOMENTO') {
    // Momento ainda usa link (ver comentário em mediaField).
    const momUrl = ($('#cUrl')?.value || '').trim();
    if (!momUrl || !/^https:\/\/\S+$/i.test(momUrl) || momUrl.length > 255) {
      e.textContent = 'Informe o link da imagem do momento, começando com https://.';
      return;
    }
  } else {
    if (ED.pend) {
      e.textContent = 'Aguarde o carregamento das imagens.';
      return;
    }
    if (!txt) {
      e.textContent = 'Escreva o texto da publicação.';
      return;
    }
  }

  let caption = txt;
  let campaignData = null;
  let volunteerData = null;

  if (t == 'VOLUNTARIO') {
    const n = $('#cNec').value.trim();
    const v = +$('#cVag').value;
    const l = $('#cLimV').value;

    if (!n) {
      e.textContent = 'Descreva o que a ONG precisa.';
      return;
    }
    if (!(v > 0)) {
      e.textContent = 'Informe o número de vagas.';
      return;
    }
    if (!l || l < hoje()) {
      e.textContent = 'Escolha o fim das inscrições a partir de hoje.';
      return;
    }

    /* o back não tem campos para "necessidades" e "modalidade": vão junto da legenda para não se perderem */
    caption = `${txt}\n\nO que a ONG precisa: ${n}\nModalidade: ${$('#cLoc').value}`;
    volunteerData = { vagas_disponiveis: v, data_limite_inscricao: sqlDia(l), google_forms_url: null };
  }

  if (t == 'CAMPANHA') {
    const m = +$('#cMeta').value;
    const l = $('#cLim').value;

    if (!(m > 0)) {
      e.textContent = 'Informe a meta da campanha.';
      return;
    }
    if (!l || l < hoje()) {
      e.textContent = 'Escolha um prazo a partir de hoje.';
      return;
    }
    campaignData = { meta_valor: m, data_limite: sqlDia(l) };
  }

  const dias = t == 'MOMENTO' ? 0 : +$('#cBoost').value;

  const ok = await comEspera(
    btn,
    'Publicando…',
    async () => {
      if (t == 'MOMENTO') {
        const momUrl = $('#cUrl').value.trim();
        await API.criarMomento({ media_url: momUrl, caption: txt, duracao_horas: +$('#cDur').value });
      } else {
        // multipart/form-data: as fotos vão como arquivos de verdade, não como link.
        const fd = new FormData();
        fd.append('type', t == 'VOLUNTARIO' ? 'VOLUNTARIADO' : t);
        fd.append('caption', caption);
        fd.append('is_boosted', dias > 0);
        if (dias > 0) fd.append('boosted_until', sqlAgora(Date.now() + dias * 864e5));
        if (campaignData) fd.append('campaignData', JSON.stringify(campaignData));
        if (volunteerData) fd.append('volunteerData', JSON.stringify(volunteerData));

        ED.list.forEach((it, i) => {
          fd.append('images', dataURLtoBlob(edOut(it)), `foto-${i + 1}.jpg`);
        });

        await API.criarPost(fd);
      }

      /* já publicou: se só a releitura falhar, o conteúdo aparece ao recarregar a página */
      await atualizarFeedReal().catch((err) => console.error('Falha ao atualizar o feed:', err));
    },
    0
  );

  if (!ok) return;

  closeModal();
  toast(t == 'MOMENTO' ? 'Momento publicado.' : 'Publicado no feed.');
  location.hash = '#/feed';
  go();
}

async function publish(t, btn) {
  if (!DEMO) return publishReal(t, btn);

  const txt = $('#cTxt').value.trim();
  const e = $('#cerr');

  if (ED.pend) {
    e.textContent = 'Aguarde o carregamento das imagens.';
    return;
  }

  if (t == 'MOMENTO') {
    if (!ED.list.length) {
      e.textContent = 'Escolha uma imagem para o momento.';
      return;
    }
  } else if (!txt) {
    e.textContent = 'Escreva o texto da publicação.';
    return;
  }

  let camp = null;
  let vol = null;

  if (t == 'VOLUNTARIO') {
    const n = $('#cNec').value.trim();
    const v = +$('#cVag').value;

    if (!n) {
      e.textContent = 'Descreva o que a ONG precisa.';
      return;
    }
    if (!(v > 0)) {
      e.textContent = 'Informe o número de vagas.';
      return;
    }
    vol = { necessidades: n, vagas: v, local: $('#cLoc').value };
  }

  if (t == 'CAMPANHA') {
    const m = +$('#cMeta').value;
    const l = $('#cLim').value;

    if (!(m > 0)) {
      e.textContent = 'Informe a meta da campanha.';
      return;
    }
    if (!l || l < hoje()) {
      e.textContent = 'Escolha um prazo a partir de hoje.';
      return;
    }
    camp = { meta: m, atual: 0, limite: dataBR(l), status: 'EM_ANDAMENTO' };
  }

  const ok = await comEspera(
    btn,
    'Publicando…',
    async () => {
      const imgs = ED.list.map(edOut);
      if (
        imgs.length &&
        !(await upload(
          $('#upc'),
          imgs.map((s) => ({ size: s.length })),
          `Enviando ${imgs.length} ${imgs.length > 1 ? 'imagens' : 'imagem'}…`
        ))
      ) {
        throw new DOMException('cancelado', 'AbortError');
      }

      const o = meOng();
      if (t == 'MOMENTO') {
        const it = { src: imgs[0], caption: txt, exp: Date.now() + 864e5 };
        const s = STORIES.find((x) => x.o == o.id);
        s ? s.imgs.push(it) : STORIES.unshift({ o: o.id, imgs: [it] });
      } else {
        POSTS.unshift({
          id: Date.now(),
          ong: o.id,
          kind: t,
          text: txt,
          title: '',
          imgs,
          likes: 0,
          comments: 0,
          time: 'agora',
          boosted: +$('#cBoost').value > 0,
          camp,
          vol,
        });
      }
    },
    0
  );

  if (!ok) return;

  closeModal();
  toast(t == 'MOMENTO' ? 'Momento publicado por 24 horas.' : 'Publicado no feed.');
  location.hash = '#/feed';
  go();
}

/* O login da ONG não traz o plano e o back não exige PRO para publicar vagas: a trava só vale no demo. */
const semPro = () => DEMO && ONG_PLANO != 'PRO';

const volFields = () =>
  semPro()
    ? `<div class="lock">
         <b>Vagas de voluntariado</b>
         Publicar vagas com as necessidades da ONG é um recurso do plano PRO.<br>
         <a class="btn light sm" href="#/planos" onclick="closeModal()">Conhecer o plano</a>
       </div>`
    : `<label for="cNec">O que a ONG precisa</label>
       <textarea id="cNec" class="in" rows="3" placeholder="Habilidades, materiais, dias e horários…"></textarea>
       <div class="row2">
         <div>
           <label for="cVag">Vagas</label>
           <input id="cVag" class="in" type="number" min="1">
         </div>
         <div>
           <label for="cLoc">Modalidade</label>
           <select id="cLoc" class="in">
             <option>Presencial</option>
             <option>Remoto</option>
             <option>Híbrido</option>
           </select>
         </div>
       </div>
       ${DEMO ? '' : `<label for="cLimV">Inscrições até</label>
       <input id="cLimV" class="in" type="date" min="${hoje()}">`}`;