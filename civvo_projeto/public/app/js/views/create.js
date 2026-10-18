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
  let o = ONGS.find((x) => x.id == ME_ONG) || ONGS[0];
  if (!o) {
    o = {
      id: 0,
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
    ? '<p style="color:var(--mut);font-size:12px;margin-top:10px">O momento fica visível por 24 horas.</p>' 
    : `<label for="cBoost">Impulsionar</label>
       <select id="cBoost" class="in">
         <option value="0">Não impulsionar</option>
         <option value="7">7 dias</option>
         <option value="15">15 dias</option>
         <option value="30">30 dias</option>
       </select>`;

  const submitBtn = t == 'VOLUNTARIO' && ONG_PLANO != 'PRO' 
    ? '' 
    : `<button class="btn full" onclick="publish('${t}', this)">Publicar ${CT[t][0].toLowerCase()}</button>`;

  openModal(
    `<h3>Criar</h3>
     <div class="seg" style="margin-bottom:8px">${segHtml}</div>
     <label for="cTxt">${mom ? 'Legenda' : 'Texto'}</label>
     <textarea id="cTxt" class="in" rows="${mom ? 2 : 4}" placeholder="${CT[t][1]}"></textarea>
     <label for="cMed">${mom ? 'Imagem do momento' : 'Imagens (até 10)'}</label>
     <input id="cMed" type="file" accept="image/*" ${mom ? '' : 'multiple'} class="in" onchange="edAdd(this)">
     <div id="edArea"></div>
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

async function publish(t, btn) {
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

const volFields = () =>
  ONG_PLANO != 'PRO'
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
       </div>`;