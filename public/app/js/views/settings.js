/* Configurações. */

/* Tipos de chave Pix aceitos pelo Banco Central. */
const PIX_T = ['CPF', 'CNPJ', 'E-mail', 'Celular', 'Chave aleatória'];

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

const soDigitos = (v) => String(v || '').replace(/\D/g, '');

/* dígitos verificadores de CPF e CNPJ (uma chave errada manda o dinheiro para o lugar errado) */
function cpfOk(v) {
  const d = soDigitos(v);
  if (d.length != 11 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += +d[i] * (n + 1 - i);
    if (((soma * 10) % 11) % 10 != +d[n]) return false;
  }
  return true;
}

function cnpjOk(v) {
  const d = soDigitos(v);
  if (d.length != 14 || /^(\d)\1+$/.test(d)) return false;
  for (const n of [12, 13]) {
    let soma = 0;
    let pes = n - 7;
    for (let i = 0; i < n; i++) {
      soma += +d[i] * pes--;
      if (pes < 2) pes = 9;
    }
    if (((soma % 11) < 2 ? 0 : 11 - (soma % 11)) != +d[n]) return false;
  }
  return true;
}

/* celular com DDD (10 ou 11 dígitos), com ou sem +55 */
const celularOk = (v) => {
  let d = soDigitos(v);
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  return /^[1-9]{2}9?\d{8}$/.test(d);
};

const pixOk = (t, v) => {
  v = String(v || '').trim();
  if (t == 'CPF') return cpfOk(v);
  if (t == 'CNPJ') return cnpjOk(v);
  if (t == 'E-mail') return /^\S+@\S+\.\S+$/.test(v) && v.length <= 77;
  if (t == 'Celular') return celularOk(v);
  return /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
};

/* descobre o tipo pelo formato (para campos de texto livre); null = chave inválida */
const pixTipo = (v) => PIX_T.find((t) => pixOk(t, v)) || null;

const PIX_ERRO = 'Chave Pix inválida. Use CPF, CNPJ, e-mail, celular com DDD ou chave aleatória.';

/* mostra só o começo e o fim de dados pessoais (comprovante e listas) */
function pixMascara(chave, tipo) {
  const c = String(chave || '');
  if (tipo == 'E-mail') {
    const [u, d] = c.split('@');
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (tipo == 'Chave aleatória') return `${c.slice(0, 8)}…${c.slice(-4)}`;
  const d = soDigitos(c);
  return d.length > 4 ? `${'•'.repeat(d.length - 4)}${d.slice(-4)}` : c;
}

/* Pix da ONG (recebimento): uma chave só, a que o doador vê ao doar. */
const pixDaOng = () => {
  const o = meOng();
  const k = String(o.pix || '').trim();
  return k ? { tipo: pixTipo(k) || 'Chave', chave: k } : null;
};

/* Pix do doador (remetente): lista de chaves de onde ele envia as doações. */
const pixDoDoador = () => USER.pix || [];

function addPix() {
  const ong = ROLE == 'ong';

  /* modo real: a chave vive no perfil (PUT /perfil/me, campo chave_pix); abre a edição já no campo */
  if (!DEMO) return irEditar('epPix');

  const optionsHtml = PIX_T.map((t) => `<option>${t}</option>`).join('');
  const atual = ong ? pixDaOng() : null;

  openModal(
    `<h3>${ong ? (atual ? 'Alterar chave Pix de recebimento' : 'Chave Pix para receber doações') : 'Adicionar chave Pix'}</h3>
     <p style="margin:6px 0 0;color:var(--mut);font-size:13px">
       ${ong
         ? 'É a chave que os doadores veem ao doar por Pix. Confira com atenção: o dinheiro vai para ela.'
         : 'É a chave da conta de onde você envia as doações. Ela identifica de quem veio o Pix.'}
     </p>
     <label for="pxT">Tipo de chave</label>
     <select id="pxT" class="in">${optionsHtml}</select>
     <label for="pxK">Chave</label>
     <input id="pxK" class="in" autocomplete="off" value="${esc(atual ? atual.chave : '')}">
     <p class="dn-err" id="pxE" role="alert"></p>
     <button class="btn full" onclick="savePix(this)">Salvar chave</button>`,
    ong ? 'Pix da ONG' : 'Adicionar Pix'
  );

  if (atual) $('#pxT').value = atual.tipo;
}

async function savePix(btn) {
  const t = $('#pxT').value;
  const k = $('#pxK').value.trim();
  const ong = ROLE == 'ong';

  if (!pixOk(t, k)) {
    $('#pxE').textContent = `Chave inválida para o tipo ${t}.`;
    return;
  }

  if (!ong && pixDoDoador().some((x) => x.chave.toLowerCase() == k.toLowerCase())) {
    $('#pxE').textContent = 'Você já cadastrou esta chave.';
    return;
  }

  const salvou = await comEspera(btn, 'Salvando…', () => {
    if (ong) {
      meOng().pix = k;
    } else {
      (USER.pix = USER.pix || []).push({ id: Date.now(), tipo: t, chave: k });
    }
  });

  if (!salvou) return;

  closeModal();
  toast(ong ? 'Chave Pix de recebimento salva.' : 'Chave Pix adicionada.');
  go();
}

function delPixOng() {
  if (!DEMO) return irEditar('epPix');
  meOng().pix = '';
  toast('Chave Pix removida. Os doadores não poderão doar por Pix até você cadastrar outra.');
  go();
}

function addCard() {
  if (!DEMO) return emBreve('Cadastro de cartões estará disponível em breve.');
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
  if (!DEMO) return emBreve('Meios de pagamento estarão disponíveis em breve.');
  const a = USER[k];
  a.splice(a.findIndex((x) => x.id == id), 1);
  go();
}

const payRow = (k, id, txt, remover = true) => `
  <div class="pm2">
    <span>${txt}</span>
    ${remover ? `<button class="lk" style="margin:0" aria-label="Remover" onclick="${k == 'pixOng' ? 'delPixOng()' : `delPay('${k}', ${id})`}">Remover</button>` : ''}
  </div>
`;

V.config = () => {
  /* Pix do doador foi removido (item 8): para doar via Pix, basta copiar a chave da ONG e
     pagar pelo próprio app do banco — não faz sentido o doador cadastrar uma chave na Civvo. */
  const cardList = (USER.cartoes || []).length ? '' : 'Os dados ficam com o gateway de pagamento, em conformidade com a LGPD.';
  const cardRows = (USER.cartoes || []).map((x) => payRow('cartoes', x.id, `${x.bandeira} final ${x.final} · ${x.validade}`)).join('');

  const doadorHtml = ROLE == 'doador' ? `
    <div class="card set">
      <h4>Meios de pagamento</h4>
      <div class="srow">
        <div>
          <b>Cartão de crédito</b>
          <small>${cardList}</small>
          ${cardRows}
        </div>
        <button class="btn light sm" ${EB()} onclick="addCard()">Adicionar</button>
      </div>
    </div>
    <div class="card set">
      <h4>Plano</h4>
      <div class="srow">
        <div>
          <b>${USER.plano == 'GRATUITO' ? 'Gratuito' : 'Apoiador'}</b>
          <small>O plano Apoiador (${money(PRECOS.APOIADOR)}/mês) libera doação de valor livre e iniciar conversas com ONGs.</small>
        </div>
        <a class="btn sm" href="#/planos">${USER.plano == 'GRATUITO' ? 'Conhecer' : 'Gerenciar'}</a>
      </div>
    </div>
  ` : '';

  const pixOng = ROLE == 'ong' ? pixDaOng() : null;

  const ongHtml = ROLE == 'ong' ? `
    <div class="card set">
      <h4>Recebimento de doações</h4>
      <div class="srow">
        <div>
          <b>Pix da ONG (destino)</b>
          <small>${pixOng ? '' : 'Nenhuma chave cadastrada. Sem ela, os doadores não conseguem doar por Pix.'}</small>
          ${pixOng ? payRow('pixOng', 0, `${pixOng.tipo}: ${esc(pixOng.chave)}`) : ''}
        </div>
        <button class="btn light sm" onclick="addPix()">${pixOng ? 'Alterar' : 'Adicionar'}</button>
      </div>
    </div>
    <div class="card set">
      <h4>Plano da ONG</h4>
      <div class="srow">
        <div>
          <b>${ONG_PLANO == 'PRO' ? 'PRO' : 'Gratuito'}</b>
          <small>${ONG_PLANO == 'PRO'
            ? 'Impulsos, selo PRO, chat com doadores e relatórios avançados.'
            : `O gratuito já cobre divulgação, gerenciamento e doações. O PRO (${money(PRECOS.PRO)}/mês) soma impulsos, chat com doadores e relatórios avançados.`}</small>
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
        <a href="#/config/termos">Termos de Uso</a>
        <a href="#/config/privacidade">Política de Privacidade</a>
      </div>
    </div>
  `;

  return shell(content, 'config', { rightCol: 0 });
};

/* ---------- Páginas legais (#/termos e #/privacidade) ----------
   ATENÇÃO: texto-base. Revise com um(a) advogado(a) e troque os trechos entre [colchetes] antes de publicar. */
const LEGAL_ATUALIZADO = '14/11/2026';

const legalPag = (titulo, secoes) => {
  const corpo = secoes
    .map(
      ([h, ps]) => `
        <h4 style="margin:22px 0 6px">${h}</h4>
        ${ps.map((p) => `<p style="margin:0 0 8px;color:var(--mut);line-height:1.6">${p}</p>`).join('')}`
    )
    .join('');

  return shell(
    `<div class="top">
       <div><h1>${titulo}</h1><small>Última atualização: ${LEGAL_ATUALIZADO}</small></div>
       <a class="btn light sm" href="#/config">← Voltar</a>
     </div>
     <div class="card" style="padding:8px 22px 22px">${corpo}</div>`,
    'config',
    { rightCol: 0 }
  );
};

V.termos = () =>
  legalPag('Termos de Uso', [
    ['1. Aceitação', ['Ao criar uma conta ou usar a Civvo, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.']],
    ['2. O que é a Civvo', ['A Civvo é uma rede social temática que conecta ONGs e doadores. As ONGs divulgam suas ações, publicam campanhas e vagas de voluntariado e gerenciam demandas e transparência; os doadores seguem ONGs, interagem, doam e se voluntariam.']],
    ['3. Conta e cadastro', ['Você deve fornecer informações verdadeiras e manter seus dados atualizados. Você é responsável pelo sigilo da sua senha e por tudo que acontece na sua conta. ONGs declaram ter poderes para representar a organização e dados regulares (CNPJ, documentos e certidões).']],
    ['4. Doações', ['As doações são feitas voluntariamente para campanhas de ONGs. O pagamento é processado por gateway de pagamento certificado; a Civvo não armazena o número completo nem o CVV do seu cartão. A ONG é a responsável pelo uso dos recursos recebidos e pela prestação de contas. Reembolsos seguem a lei e as regras do meio de pagamento.']],
    ['5. Conteúdo e conduta', ['Cada pessoa é responsável pelo que publica, comenta e envia. É proibido publicar conteúdo ilegal, fraudulento, discriminatório, violento, que viole direitos de terceiros ou que se passe por outra pessoa ou organização.', 'Publicações e comentários podem ser denunciados. A Civvo pode remover conteúdo e suspender contas que violem estes Termos, e ONGs podem moderar os comentários feitos nas suas próprias publicações.']],
    ['6. Seguidores e perfis públicos', ['Perfis de ONGs são públicos. A lista de quem segue uma ONG e de quem ela segue pode ser vista por outros usuários da plataforma.']],
    ['7. Voluntariado', ['A candidatura a vagas é uma relação direta entre você e a ONG. A Civvo apenas facilita o contato e não é parte do vínculo de voluntariado.']],
    ['8. Planos', ['Alguns recursos dependem de plano pago (por exemplo, o plano Apoiador para doadores e o plano PRO para ONGs). Valores e condições são informados antes da contratação, e você pode cancelar quando quiser.']],
    ['9. Propriedade intelectual', ['A marca, o design e o software da Civvo pertencem à plataforma. O conteúdo que você publica continua sendo seu, e você nos autoriza a exibi-lo na plataforma para o funcionamento do serviço.']],
    ['10. Limitação de responsabilidade', ['Empenhamo-nos para manter a plataforma disponível e segura, mas não garantimos funcionamento ininterrupto. A Civvo não se responsabiliza por conteúdos de terceiros nem por atos das ONGs, dentro dos limites da lei.']],
    ['11. Encerramento da conta', ['Você pode excluir sua conta quando quiser. Podemos suspender ou encerrar contas que violem estes Termos ou a lei.']],
    ['12. Alterações e foro', ['Podemos atualizar estes Termos e avisaremos sobre mudanças relevantes. Fica eleito o foro do domicílio do consumidor, conforme a legislação brasileira. Dúvidas: [e-mail de contato].']],
  ]);

V.privacidade = () =>
  legalPag('Política de Privacidade', [
    ['1. Quem somos', ['A Civvo é a controladora dos dados pessoais tratados na plataforma, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). Contato do encarregado (DPO): [e-mail do encarregado].']],
    ['2. Dados que coletamos', [
      'Cadastro: nome, e-mail, apelido, senha (armazenada de forma criptografada), CPF quando necessário para doações, e dados da ONG (CNPJ, razão social, endereço, telefone).',
      'Perfil e uso: foto, bio, redes sociais, causas de interesse, publicações, comentários, curtidas, quem você segue e quem segue você, candidaturas de voluntariado e mensagens.',
      'Doações: valor, data, forma de pagamento e dados de identificação do doador. Dados completos de cartão ficam com o gateway de pagamento.',
      'Técnicos: dados de acesso, dispositivo e registros de segurança.',
    ]],
    ['3. Para que usamos', ['Para criar e manter sua conta, exibir seu perfil e conteúdo, processar doações e emitir comprovantes, enviar avisos (como novas publicações de ONGs que você segue), moderar denúncias, prevenir fraudes e cumprir obrigações legais.']],
    ['4. Bases legais', ['Tratamos dados para a execução do contrato com você, cumprimento de obrigação legal, legítimo interesse (segurança e prevenção a fraudes) e, quando necessário, com o seu consentimento.']],
    ['5. Com quem compartilhamos', ['Com as ONGs que você apoia (dados necessários para a doação e o comprovante), com o gateway de pagamento, com provedores de hospedagem e armazenamento de imagens que operam a plataforma, e com autoridades quando houver obrigação legal. Não vendemos seus dados pessoais.']],
    ['6. O que é público', ['Perfis de ONGs, publicações, comentários e listas de seguidores podem ser vistos por outros usuários. Seus dados de CPF, e-mail, pagamento e senha não são exibidos publicamente.']],
    ['7. Por quanto tempo guardamos', ['Mantemos os dados enquanto sua conta existir e pelo prazo necessário para cumprir obrigações legais e fiscais (por exemplo, registros de doações). Ao excluir a conta, removemos ou anonimizamos os dados que não precisamos manter.']],
    ['8. Seus direitos', ['Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamento, exclusão e revogação do consentimento, conforme o art. 18 da LGPD. Fale com o encarregado no contato acima.']],
    ['9. Segurança', ['Usamos medidas técnicas e organizacionais para proteger seus dados, como senhas criptografadas e conexão segura. Nenhum sistema é 100% imune; em caso de incidente relevante, avisaremos você e a autoridade competente.']],
    ['10. Armazenamento no navegador', ['Usamos dados armazenados no seu navegador para manter sua sessão e lembrar preferências como o tema claro ou escuro.']],
    ['11. Crianças e adolescentes', ['A plataforma não é destinada a menores de 18 anos sem a participação de um responsável legal.']],
    ['12. Alterações', ['Podemos atualizar esta Política. Mudanças relevantes serão comunicadas na plataforma.']],
  ]);


/* Termos e Privacidade abertos pelas Configurações: usam a rota #/config/..., que é uma tela do app
   (e por isso respeita o tema claro/escuro escolhido). #/termos e #/privacidade seguem existindo
   como páginas públicas (ex.: links da tela de login). */
const __configBase = V.config;
V.config = (sec) => {
  if (sec === 'termos') return V.termos();
  if (sec === 'privacidade') return V.privacidade();
  return __configBase();
};