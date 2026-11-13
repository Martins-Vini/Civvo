/* Termos de Uso e Política de Privacidade.

   Formato do conteúdo de cada página (LEGAL):
     t           título
     atualizado  (opcional) linha "Última atualização"
     intro       (opcional) lista de parágrafos antes das seções
     s           seções: [título, conteúdo], onde conteúdo é um texto (um parágrafo) ou uma lista de blocos:
                   'texto'                      → parágrafo
                   { h3: 'Subtítulo' }          → subtítulo
                   { ul: ['item', [rótulo, texto]] } → lista (o par vira "rótulo" em negrito + texto) */

const LEGAL = {
  termos: { t: 'Termos de Uso', s: [] },

  privacidade: {
    t: 'Política de Privacidade',
    atualizado: 'Última atualização: novembro de 2026.',
    intro: [
      'A Civvo ("nós", "nosso" ou "plataforma") valoriza profundamente a privacidade e a segurança dos dados de seus usuários, sejam eles Doadores, representantes de ONGs (Organizações Não Governamentais) ou Administradores. Esta Política de Privacidade descreve de forma transparente como coletamos, usamos, armazenamos, compartilhamos e protegemos suas informações pessoais ao utilizar nossa plataforma web e nossos serviços.',
      'Ao acessar ou se cadastrar na Civvo, você concorda com as práticas descritas nesta Política.',
    ],
    s: [
      [
        '1. Informações que Coletamos',
        [
          'Coletamos apenas os dados estritamente necessários para o funcionamento da nossa rede social e ecossistema de doações e voluntariado. Os dados variam conforme o seu tipo de perfil na plataforma:',
          { h3: 'A. Dados de Cadastro e Conta' },
          {
            ul: [
              ['Dados comuns a todos os usuários:', 'E-mail, senha (armazenada de forma criptografada por meio de hash seguro) e tipo de perfil (DOADOR, ONG ou ADMIN).'],
              ['Para Doadores (DOADORES_PROFILES):', 'Nome, sobrenome, apelido único (handle), CPF (opcional), foto de perfil (avatar), biografia, arquivo comprobatório do CadÚnico (quando aplicável para programas sociais), endereços e telefones de contato.'],
              ['Para ONGs (ONGS_PROFILES):', 'CNPJ, razão social, nome fantasia, CNAE, logomarca, banner, histórico da instituição, causas atendidas, chave Pix oficial, nível de transparência e tipo de plano.'],
            ],
          },
          { h3: 'B. Dados de Interação e Conteúdo' },
          {
            ul: [
              ['Doações e Transações:', 'Histórico de doações realizadas, valores, campanhas apoiadas e mensagens opcionais enviadas aos projetos.'],
              ['Publicações e Engajamento:', 'Posts, campanhas, momentos (stories), comentários, curtidas, compartilhamentos e candidaturas a vagas de voluntariado.'],
              ['Comunicação e Chat:', 'Mensagens trocadas no chat da plataforma (criptografadas ponta a ponta para garantir sigilo), mídias compartilhadas (áudios, imagens, vídeos e arquivos) e registros de conexões de seguidores.'],
            ],
          },
        ],
      ],
      [
        '2. Finalidade do Tratamento dos Dados (Para que usamos?)',
        [
          'Utilizamos seus dados pessoais para as seguintes finalidades legítimas:',
          {
            ul: [
              ['Operacionalização da Plataforma:', 'Permitir o cadastro, login seguro (incluindo autenticação de dois fatores por e-mail e OAuth do Google) e gerenciamento de perfis.'],
              ['Conexão Social e Transparência:', 'Viabilizar o sistema de seguidores, a exibição de posts no feed e a interação segura entre doadores e ONGs da Zona Leste de São Paulo e demais localidades.'],
              ['Gestão de Doações e Voluntariado:', 'Processar e registrar doações financeiras ou de recursos materiais, além de intermediar inscrições em programas de voluntariado.'],
              ['Segurança e Conformidade:', 'Cumprir regras de negócio restritivas da plataforma (como a moderação de interações e bloqueio de perfis incompatíveis), além de prevenir fraudes.'],
            ],
          },
        ],
      ],
      [
        '3. Armazenamento e Segurança da Informação',
        [
          'A Civvo adota medidas técnicas e organizacionais rigorosas para proteger seus dados contra acessos não autorizados, perda ou alteração:',
          {
            ul: [
              ['Criptografia:', 'As mensagens trocadas no chat são protegidas por criptografia robusta (AES-256) diretamente em nossa base de dados.'],
              ['Infraestrutura Segura:', 'Nossos servidores e bancos de dados utilizam provedores de nuvem certificados (como Render, Aiven e Vercel), aplicando controles estritos de acesso.'],
              ['Retenção e Exclusão (Soft Delete):', 'Caso você opte por desativar ou excluir sua conta, seus dados de identificação principal são inativados (is_active = FALSE), preservando a integridade histórica de relatórios de transparência e auditoria financeira das ONGs conforme exigido em lei.'],
            ],
          },
        ],
      ],
      [
        '4. Compartilhamento de Dados',
        [
          'A Civvo não vende, aluga ou comercializa dados pessoais de seus usuários. O compartilhamento ocorre apenas nas seguintes hipóteses estritamente necessárias:',
          {
            ul: [
              ['Transparência Institucional:', 'Informações públicas de ONGs (como CNPJ, razão social, causas e chaves Pix oficiais) e posts/campanhas são exibidos publicamente na rede para incentivar o apoio social.'],
              ['Obrigações Legais:', 'Podemos divulgar informações caso exigido por ordem judicial ou por autoridades fiscais e governamentais competentes no âmbito da legislação brasileira.'],
            ],
          },
        ],
      ],
      [
        '5. Seus Direitos como Titular (LGPD - Art. 18)',
        [
          'Em conformidade com a Lei Geral de Proteção de Dados, você possui total autonomia sobre seus dados pessoais. A qualquer momento, você pode solicitar:',
          {
            ul: [
              ['Confirmação e Acesso:', 'Saber se tratamos seus dados e solicitar cópias deles.'],
              ['Correção:', 'Atualizar dados incompletos, inexatos ou desatualizados diretamente em seu perfil ou via suporte.'],
              ['Eliminação ou Anonimização:', 'Solicitar a exclusão de dados desnecessários ou o encerramento da sua conta na plataforma.'],
              ['Revogação do Consentimento:', 'Retirar a autorização para o tratamento de dados baseados em consentimento prévio.'],
            ],
          },
        ],
      ],
      [
        '6. Alterações nesta Política de Privacidade',
        'Podemos atualizar esta Política de Privacidade periodicamente para refletir melhorias tecnológicas ou exigências legais. Recomendamos que você revise esta página regularmente. Modificações significativas serão comunicadas por e-mail ou por avisos em destaque na plataforma.',
      ],
      [
        '7. Como Entrar em Contato (Encarregado de Dados)',
        [
          'Se você tiver dúvidas, comentários ou quiser exercer seus direitos previstos pela LGPD, entre em contato conosco através do canal oficial de atendimento da plataforma:',
          {
            ul: [
              ['E-mail de suporte e privacidade:', 'omoyari199@gmail.com'],
              ['Localização:', 'Cidade Tiradentes, São Paulo – SP, Brasil.'],
            ],
          },
        ],
      ],
    ],
  },
};

/* Texto escapado; e-mails viram link (o endereço escapado não tem caracteres que quebrem o atributo). */
const legalTexto = (t) =>
  esc(t).replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g, '<a href="mailto:$1">$1</a>');

const legalItem = (i) =>
  Array.isArray(i) ? `<li><b>${legalTexto(i[0])}</b> ${legalTexto(i[1])}</li>` : `<li>${legalTexto(i)}</li>`;

const legalBloco = (b) =>
  typeof b == 'string'
    ? `<p>${legalTexto(b)}</p>`
    : b.h3
      ? `<h3>${legalTexto(b.h3)}</h3>`
      : b.ul
        ? `<ul>${b.ul.map(legalItem).join('')}</ul>`
        : '';

const legalSecao = ([h, c]) => `<h2>${legalTexto(h)}</h2>${(Array.isArray(c) ? c : [c]).map(legalBloco).join('')}`;

const legalPage = (k) => {
  const page = LEGAL[k];
  const sectionsHtml = page.s.length ? page.s.map(legalSecao).join('') : '<p class="lg-n">Conteúdo ainda não publicado.</p>';
  const atualizado = page.atualizado ? `<p class="lg-d">${esc(page.atualizado)}</p>` : '';
  const intro = (page.intro || []).map(legalBloco).join('');

  return `
    <div role="main" id="conteudo" class="wl lgl">
      <button class="bkl" onclick="back()" aria-label="Voltar">
        <span class="bk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6"/>
          </svg>
        </span>
        Voltar
      </button>
      <article class="card lg-c">
        <h1>${esc(page.t)}</h1>
        ${atualizado}
        ${intro}
        ${sectionsHtml}
      </article>
    </div>
  `;
};

V.termos = () => legalPage('termos');
V.privacidade = () => legalPage('privacidade');
