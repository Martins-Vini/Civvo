/* Configurações. */

const PIX_T = ['CPF', 'E-mail', 'Celular', 'Chave aleatória'];

const bandeira = (n) => {
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return 'Cartão';
};

const luhn = (n) => {
  let s = 0;
  let d = 0;
  
  for (let i = n.length - 1; i >= 0; i--) {
    let x = +n[i];
    if (d % 2) {
      x *= 2;
      if (x > 9) x -= 9;
    }
    s += x;
    d++;
  }
  
  return s % 10 == 0;
};

const pixOk = (t, v) => {
  if (t == 'CPF') return v.replace(/\D/g, '').length == 11;
  if (t == 'E-mail') return /^\S+@\S+\.\S+$/.test(v);
  if (t == 'Celular') return /^\d{10,11}$/.test(v.replace(/\D/g, ''));
  return /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
};

function addPix() {
  const optionsHtml = PIX_T.map((t) => `<option>${t}</option>`).join('');
  
  openModal(
    `<h3>Adicionar chave Pix</h3>
     <label for="pxT">Tipo de chave</label>
     <select id="pxT" class="in">${optionsHtml}</select>
     <label for="pxK">Chave</label>
     <input id="pxK" class="in" autocomplete="off">
     <p class="dn-err" id="pxE" role="alert"></p>
     <button class="btn full" onclick="savePix(this)">Salvar chave</button>`,
    'Adicionar Pix'
  );
}

async function savePix(btn) {
  const t = $('#pxT').value;
  const k = $('#pxK').value.trim();
  
  if (!pixOk(t, k)) {
    $('#pxE').textContent = 'Chave inválida para o tipo escolhido.';
    return;
  }
  
  const salvou = await comEspera(btn, 'Salvando…', () => {
    (USER.pix = USER.pix || []).push({ 
      id: Date.now(), 
      tipo: t, 
      chave: k 
    });
  });

  if (!salvou) return;
  
  closeModal();
  toast('Chave Pix adicionada.');
  go();
}

function addCard() {
  openModal(
    `<h3>Adicionar cartão de crédito</h3>
     <label for="cdN">Nome no cartão</label>
     <input id="cdN" class="in" autocomplete="cc-name">
     <label for="cdC">Número</label>
     <input id="cdC" class="in" inputmode="numeric" autocomplete="cc-number" maxlength="23" placeholder="0000 0000 0000 0000">
     <div class="row2">
       <div>
         <label for="cdV">Validade</label>
         <input id="cdV" class="in" autocomplete="cc-exp" maxlength="5" placeholder="MM/AA">
       </div>
       <div>
         <label for="cdS">CVV</label>
         <input id="cdS" class="in" type="password" inputmode="numeric" autocomplete="cc-csc" maxlength="4">
       </div>
     </div>
     <small style="color:var(--mut)">
       Guardamos apenas a bandeira, o final e a validade. O número completo e o CVV são enviados ao gateway de pagamento e não ficam no Civvo.
     </small>
     <p class="dn-err" id="cdE" role="alert"></p>
     <button class="btn full" onclick="saveCard(this)">Salvar cartão</button>`,
    'Adicionar cartão'
  );
}

async function saveCard(btn) {
  const e = $('#cdE');
  const n = $('#cdC').value.replace(/\D/g, '');
  const v = $('#cdV').value.trim();
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  const nome = $('#cdN').value.trim();
  
  if (!nome) {
    e.textContent = 'Informe o nome impresso no cartão.';
    return;
  }
  
  if (n.length < 13 || n.length > 19 || !luhn(n)) {
    e.textContent = 'Número de cartão inválido.';
    return;
  }
  
  const now = new Date();
  if (!m || +m[1] < 1 || +m[1] > 12 || new Date(2000 + +m[2], +m[1], 0, 23, 59) < now) {
    e.textContent = 'Validade inválida ou vencida.';
    return;
  }
  
  if (!/^\d{3,4}$/.test($('#cdS').value)) {
    e.textContent = 'CVV inválido.';
    return;
  }
  
  const novo = { 
    id: Date.now(), 
    bandeira: bandeira(n), 
    final: n.slice(-4), 
    validade: v, 
    nome 
  };
  
  $('#cdC').value = $('#cdS').value = '';
  
  const salvou = await comEspera(btn, 'Salvando…', () => {
    (USER.cartoes = USER.cartoes || []).push(novo);
  });

  if (!salvou) return;
  
  closeModal();
  toast('Cartão adicionado.');
  go();
}

function delPay(k, id) {
  const a = USER[k];
  a.splice(a.findIndex((x) => x.id == id), 1);
  go();
}

const payRow = (k, id, txt) => `
  <div class="pm2">
    <span>${txt}</span>
    <button class="lk" style="margin:0" aria-label="Remover" onclick="delPay('${k}', ${id})">Remover</button>
  </div>
`;

V.config = () => {
  const pixList = (USER.pix || []).length ? '' : 'Nenhuma chave cadastrada';
  const pixRows = (USER.pix || []).map((x) => payRow('pix', x.id, `${x.tipo}: ${esc(x.chave)}`)).join('');
  
  const cardList = (USER.cartoes || []).length ? '' : 'Os dados ficam com o gateway de pagamento, em conformidade com a LGPD.';
  const cardRows = (USER.cartoes || []).map((x) => payRow('cartoes', x.id, `${x.bandeira} final ${x.final} · ${x.validade}`)).join('');

  const doadorHtml = ROLE == 'doador' ? `
    <div class="card set">
      <h4>Meios de pagamento</h4>
      <div class="srow">
        <div>
          <b>Pix</b>
          <small>${pixList}</small>
          ${pixRows}
        </div>
        <button class="btn light sm" onclick="addPix()">Adicionar</button>
      </div>
      <div class="srow">
        <div>
          <b>Cartão de crédito</b>
          <small>${cardList}</small>
          ${cardRows}
        </div>
        <button class="btn light sm" onclick="addCard()">Adicionar</button>
      </div>
    </div>
    <div class="card set">
      <h4>Plano</h4>
      <div class="srow">
        <div>
          <b>${USER.plano == 'GRATUITO' ? 'Gratuito' : 'Apoiador'}</b>
          <small>O plano apoiador libera doações de valor livre.</small>
        </div>
        <a class="btn sm" href="#/planos">${USER.plano == 'GRATUITO' ? 'Conhecer' : 'Gerenciar'}</a>
      </div>
    </div>
  ` : '';

  const ongHtml = ROLE == 'ong' ? `
    <div class="card set">
      <h4>Plano da ONG</h4>
      <div class="srow">
        <div>
          <b>${ONG_PLANO == 'PRO' ? 'PRO' : 'Gratuito'}</b>
          <small>PRO libera relatórios por dia, semana e mês, envio de planilhas, gerenciamento de recursos e vagas de voluntariado.</small>
        </div>
        <a class="btn sm" href="#/planos">${ONG_PLANO == 'PRO' ? 'Gerenciar' : 'Conhecer o PRO'}</a>
      </div>
    </div>
  ` : '';

  const content = `
    <div class="top"><h1>Configurações</h1></div>
    ${cardTema()}
    ${doadorHtml}
    ${ongHtml}
    <div class="card set">
      <h4>Legal</h4>
      <div class="srow">
        <a href="#/termos">Termos de Uso</a>
        <a href="#/privacidade">Política de Privacidade</a>
      </div>
    </div>
  `;

  return shell(content, 'config', { rightCol: 0 });
};