/* Planos: Doador (Gratuito / Apoiador) e ONG (Gratuito / PRO).

   REGRA DO PRODUTO
   - O plano GRATUITO da ONG cobre sozinho os pilares do Civvo: divulgação (publicações, perfil e comunidade),
     gerenciamento (finanças, demandas e recursos) e receber doações das campanhas. Nada disso é cobrado.
   - O plano pago é só "boost" desses pilares: mais alcance, mais contato com doadores e mais análise.
   - Chat: quem tem plano pago INICIA conversas; quem é gratuito sempre pode RESPONDER. Assim a conversa
     acontece quando pelo menos um dos lados é pago, e ninguém perde mensagens por estar no gratuito.

   PREÇOS
   Cada benefício tem um valor avulso de referência (v, em R$/mês). O plano custa menos que a soma deles.
   Para mudar preço ou benefício, edite só este arquivo e PRECOS / PRECOS_ANUAL em data/store.js. */

const PLANOS = {
  doador: [
    {
      k: 'GRATUITO',
      nome: 'Gratuito',
      desc: 'Tudo para apoiar as ONGs em que você acredita.',
      grupos: [
        {
          h: 'Doar',
          l: [
            'Doar R$ 20, 50, 100 ou 200 por Pix ou cartão',
            'Cadastrar suas chaves Pix e cartões',
            'Histórico de doações e comprovantes',
          ],
        },
        {
          h: 'Comunidade',
          l: [
            'Seguir ONGs, curtir, comentar e compartilhar',
            'Candidatar-se a vagas de voluntariado',
            'Responder mensagens que as ONGs enviarem',
          ],
        },
      ],
    },
    {
      k: 'APOIADOR',
      nome: 'Apoiador',
      desc: 'Mais liberdade para ajudar e conversar.',
      beneficios: [
        { h: 'Doar', t: 'Doação de valor livre', d: 'Doe o valor que quiser, a partir de R$ 1.', v: 4.9 },
        { h: 'Comunidade', t: 'Chat com ONGs', d: 'Inicie conversas e envie fotos, arquivos e áudios.', v: 6.9 },
      ],
    },
  ],
  ong: [
    {
      k: 'GRATUITO',
      nome: 'Gratuito',
      desc: 'Tudo o que a ONG precisa para divulgar, gerir e receber doações.',
      grupos: [
        {
          h: 'Divulgação e comunidade',
          l: [
            'Publicações, campanhas, vagas de voluntariado e Momentos',
            'Perfil completo: história, causas, estatuto, governança e redes',
            'Seguidores, comentários e moderação nas suas publicações',
            'Responder mensagens de doadores',
          ],
        },
        {
          h: 'Gerenciamento',
          l: [
            'Finanças: lançamento de receitas e despesas',
            'Demandas e relatórios de transparência',
            'Estoque e gerenciamento de recursos',
            'Painel com total arrecadado e histórico de doações',
          ],
        },
        {
          h: 'Doações',
          l: [
            'Receber doações das campanhas por Pix e cartão',
            'Chave Pix da ONG exibida ao doador',
            'Comprovante e aviso a cada nova doação',
          ],
        },
      ],
    },
    {
      k: 'PRO',
      nome: 'PRO',
      desc: 'Mais alcance, mais contato com doadores e mais análise.',
      beneficios: [
        {
          h: 'Divulgação',
          t: '4 impulsos de publicação por mês',
          d: 'Cada impulso destaca uma publicação no feed por 7 dias (15 dias = 2 impulsos; 30 dias = 4).',
          v: 31.6,
        },
        {
          h: 'Divulgação',
          t: 'Selo PRO e destaque na busca',
          d: 'Seu perfil aparece primeiro nas sugestões e nos resultados de busca.',
          v: 7.9,
        },
        {
          h: 'Comunidade',
          t: 'Chat com doadores',
          d: 'Inicie conversas e envie fotos, arquivos e áudios.',
          v: 12.9,
        },
        {
          h: 'Gerenciamento',
          t: 'Relatórios avançados e planilhas',
          d: 'Doações por dia, semana e mês, comparativo entre campanhas e envio/exportação em Excel.',
          v: 9.9,
        },
      ],
    },
  ],
};

const planoAtual = () => (ROLE == 'ong' ? ONG_PLANO : USER.plano);

/* plano pago de cada perfil */
const PLANO_PAGO = { ong: 'PRO', doador: 'APOIADOR' };
const NOME_PLANO = { PRO: 'PRO', APOIADOR: 'Apoiador', GRATUITO: 'Gratuito' };

const totalAvulso = (plano) => plano.beneficios.reduce((t, b) => t + b.v, 0);

/* Recursos que dependem de plano pago e quem pode usar cada um.
   Igual a vagas e impulso hoje: a trava só vale no demo, porque o back ainda não devolve o plano nem cobra.
   Quando o back tiver assinatura, troque `!DEMO` por "o plano veio do back" e o resto continua igual. */
const RECURSOS = {
  chat: { ong: 'PRO', doador: 'APOIADOR' },
  impulso: { ong: 'PRO' },
  relatorios: { ong: 'PRO' },
  valorLivre: { doador: 'APOIADOR' },
};

const temRecurso = (r) => !DEMO || (RECURSOS[r] || {})[ROLE] === planoAtual();

/* Aviso padrão quando alguém tenta usar um recurso que o plano dele não inclui. */
const UPSELL = {
  chat: () =>
    `Iniciar conversas com ${ROLE == 'ong' ? 'doadores' : 'ONGs'} é um recurso do plano ${NOME_PLANO[PLANO_PAGO[ROLE]]}.
     Você continua podendo <b>responder</b> a quem escrever para você.`,
  impulso: () => 'Impulsionar publicações é um recurso do plano PRO (4 impulsos de 7 dias por mês).',
  relatorios: () => 'Relatórios por dia, semana e mês e envio de planilhas são recursos do plano PRO.',
  valorLivre: () => 'Doar um valor livre é um recurso do plano Apoiador.',
};

function upsell(recurso) {
  const pago = PLANO_PAGO[ROLE];
  openModal(
    `<h3>Recurso do plano ${NOME_PLANO[pago]}</h3>
     <p style="margin:8px 0 6px">${UPSELL[recurso]()}</p>
     <p style="margin:0 0 16px;color:var(--mut);font-size:13px">
       ${NOME_PLANO[pago]}: ${money(PRECOS[pago])} por mês, sem fidelidade.
     </p>
     <a class="btn full" href="#/planos" onclick="closeModal()">Conhecer o plano ${NOME_PLANO[pago]}</a>`,
    'Plano ' + NOME_PLANO[pago]
  );
}

/* ---- cota de impulsos do plano PRO (demo): 4 por mês; 7 dias = 1, 15 dias = 2, 30 dias = 4 ---- */
const IMPULSOS_MES = 4;
const impulsosDe = (dias) => ({ 7: 1, 15: 2, 30: 4 })[dias] || 0;

function impulsosUsados() {
  const mes = hoje().slice(0, 7);
  if (ONG_IMPULSOS.mes !== mes) ONG_IMPULSOS = { mes, usados: 0 };
  return ONG_IMPULSOS.usados;
}

const impulsosRestantes = () => Math.max(0, IMPULSOS_MES - impulsosUsados());

const gastarImpulsos = (dias) => {
  impulsosUsados();
  ONG_IMPULSOS.usados += impulsosDe(dias);
};

/* ---------- tela ---------- */

const linhaPreco = (v) => `<span class="bv" title="Valor avulso de referência">${money(v)}</span>`;

function cardPlano(pl) {
  const k = pl.k;
  const n = pl.nome;
  const on = planoAtual() == k;
  const pr = PRECOS[k];
  const pago = k != 'GRATUITO';

  const tagAtual = on ? '<span class="tag" style="margin:0 0 0 6px">Plano atual</span>' : '';

  const preco = pago
    ? `<b class="pr">${money(pr)} <small>/ mês</small></b>
       <small class="pr2">ou ${money(PRECOS_ANUAL[k])} por ano (2 meses grátis)</small>`
    : '<b class="pr">Grátis</b><small class="pr2">Sem prazo e sem cartão</small>';

  let corpo = '';

  if (pl.grupos) {
    corpo = pl.grupos
      .map(
        (g) => `
        <h5 class="pg">${g.h}</h5>
        <ul>${g.l.map((x) => `<li>${x}</li>`).join('')}</ul>`
      )
      .join('');
  } else {
    const total = totalAvulso(pl);
    corpo = `
      <p class="pi">Tudo do plano gratuito, mais:</p>
      <ul class="bn">
        ${pl.beneficios
          .map(
            (b) => `
          <li>
            <span class="bt"><i>${b.h}</i><b>${b.t}</b><small>${b.d}</small></span>
            ${linhaPreco(b.v)}
          </li>`
          )
          .join('')}
      </ul>
      <p class="pt2">
        Somando os benefícios: <s>${money(total)}</s> · você paga <b>${money(pr)}</b>
        <span class="eco">economia de ${Math.round((1 - pr / total) * 100)}%</span>
      </p>`;
  }

  let actionBtn = '';
  if (!on) {
    actionBtn =
      k == 'GRATUITO'
        ? `<button class="btn ghost full" ${EB()} onclick="setPlano('GRATUITO', this)">Voltar ao gratuito</button>`
        : `<button class="btn full" ${EB()} onclick="assinar('${k}', '${n}')">Assinar ${n}</button>`;
  }

  return `
    <div class="card plan ${on ? 'on' : ''}">
      <h4>${n} ${tagAtual}</h4>
      ${preco}
      <small class="pd">${pl.desc}</small>
      ${corpo}
      ${actionBtn}
    </div>
  `;
}

V.planos = () => {
  if (ROLE == 'admin') {
    return shell('<div class="card emp">Planos não se aplicam ao Admin.</div>', 'config', {
      rightCol: 0,
    });
  }

  const subtitulo =
    ROLE == 'ong'
      ? 'Para ONGs · o plano gratuito já cobre divulgação, gerenciamento e doações'
      : 'Para doadores';

  const content = `
    <div class="top">
      <div>
        <h1>Planos</h1>
        <small>${subtitulo}</small>
      </div>
    </div>
    <div class="plans">
      ${PLANOS[ROLE].map(cardPlano).join('')}
    </div>
  `;

  return shell(content, 'config', { rightCol: 0, wide: 1 });
};

function assinar(k, n) {
  if (!DEMO) return emBreve('Assinaturas estarão disponíveis em breve.');

  openModal(
    `<h3>Assinar ${n}</h3>
     <p style="margin:8px 0">Valor: <b>${money(PRECOS[k])} / mês</b> ou <b>${money(PRECOS_ANUAL[k])} / ano</b> (2 meses grátis).</p>
     <p style="color:var(--mut);font-size:13px">
       O pagamento é processado pelo gateway certificado (PCI DSS). Você pode cancelar quando quiser.
     </p>
     <button class="btn full" style="margin-top:16px" onclick="setPlano('${k}', this)">Confirmar assinatura</button>`,
    'Assinar plano'
  );
}

async function setPlano(k, btn) {
  if (!DEMO) return emBreve('Assinaturas estarão disponíveis em breve.');

  const ok = await comEspera(btn, 'Processando…', () => {
    if (ROLE == 'ong') {
      ONG_PLANO = k;
    } else {
      USER.plano = k;
    }
  });

  if (!ok) return;

  closeModal();
  toast(k == 'GRATUITO' ? 'Você voltou ao plano gratuito.' : 'Plano ativado.');
  go();
}
