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
  if (!DEMO) return emBreve('Cadastro de chaves Pix estará disponível em breve.');
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
        <button class="btn light sm" ${EB()} onclick="addPix()">Adicionar</button>
      </div>
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