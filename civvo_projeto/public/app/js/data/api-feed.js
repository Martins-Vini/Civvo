/* Dados reais do back-end (modo não-DEMO): feed e momentos → POSTS / ONGS / VOLUNT / STORIES.
   O back devolve linhas de GET /posts/feed (type, caption, ong_nome, media, meta_valor...), que aqui viram o formato que as telas usam.
   Campos que o back ainda não manda (contagem de curtidas/comentários, id da campanha) são lidos se existirem:
   likes_count, comments_count, campaign_id. Enquanto não existirem, ficam 0 / null. */

const TIPO_POST = { POST: 'POST', CAMPANHA: 'CAMPANHA', VOLUNTARIADO: 'VOLUNTARIO' };

let FEED_PROMISE = null;
let FEED_ERRO = '';

function tempoRelativo(v) {
  const t = new Date(v).getTime();
  if (!t) return '';

  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} d`;
  return dia(String(v));
}

const adaptApi = {
  /* O feed só traz nome, logo e CNPJ da ONG; o resto fica vazio até existir rota de perfil público. */
  ong: (r) => ({
    id: r.ong_id,
    name: r.ong_nome || 'ONG',
    logo: r.ong_logo || '',
    cnpj: r.ong_cnpj || '',
    cat: '',
    city: '',
    bio: '',
    plano: 'GRATUITO',
    transp: '',
    followers: 0,
    social: {},
    estatuto: {},
    governanca: [],
    certidoes: {},
    h: (r.ong_id * 70) % 360,
    ver: false,
  }),

  /* Linha de MOMENTS → item do visualizador (exp em ms, para o app descartar os expirados). */
  momento: (r) => ({
    src: r.media_url,
    caption: r.caption || '',
    exp: r.expires_at ? new Date(r.expires_at).getTime() : 0,
  }),

  post: (r, curtidos) => {
    const kind = TIPO_POST[r.type] || 'POST';
    const liked = curtidos.has(r.id);
    const ativoImpulso = !!r.is_boosted && (!r.boosted_until || new Date(r.boosted_until) > new Date());

    return {
      id: r.id,
      ong: r.ong_id,
      kind,
      text: r.caption || '',
      title: '',
      imgs: (r.media || []).filter((m) => m.media_type != 'VIDEO').map((m) => m.file_url),
      /* sem a contagem do back, quem curtiu aparece pelo menos com 1 */
      likes: Math.max(+(r.likes_count ?? r.likes) || 0, liked ? 1 : 0),
      comments: +(r.comments_count ?? r.comments) || 0,
      liked,
      time: tempoRelativo(r.created_at),
      boosted: ativoImpulso,
      boostEnd: r.boosted_until ? dia(r.boosted_until) : '',
      camp:
        r.meta_valor != null
          ? {
              id: r.campaign_id ?? null,
              meta: +r.meta_valor,
              atual: +r.valor_atual || 0,
              limite: dia(r.data_limite),
              status: r.campanha_status || 'EM_ANDAMENTO',
            }
          : null,
      /* o back não guarda "local" nem "necessidades" da vaga: a descrição fica na legenda (text) */
      vol:
        kind == 'VOLUNTARIO'
          ? {
              vagas: r.vagas_disponiveis ?? null,
              local: '',
              necessidades: '',
              ate: r.data_limite_inscricao ? dia(r.data_limite_inscricao) : '',
            }
          : null,
    };
  },
};

function aplicarFeedReal(feed, curtidas, candidaturas, momentos = []) {
  const curtidos = new Set(curtidas.map((p) => p.id));

  /* a ONG logada pode ainda não ter posts: preserva o objeto dela (dados da sessão) em vez de perdê-lo */
  const meu = ME_ONG != null ? ONGS.find((o) => o.id == ME_ONG) : null;

  /* as ONGs vêm de quem tem post ou momento ativo (o back ainda não tem listagem de ONGs) */
  const porId = new Map();
  [...feed, ...momentos].forEach((r) => {
    if (!porId.has(String(r.ong_id))) porId.set(String(r.ong_id), adaptApi.ong(r));
  });
  if (meu) porId.set(String(meu.id), Object.assign(meu, porId.get(String(meu.id)) || {}));

  ONGS.length = 0;
  ONGS.push(...porId.values());

  POSTS.length = 0;
  POSTS.push(...feed.map((r) => adaptApi.post(r, curtidos)));

  /* momentos: o back manda uma lista só (mais novos primeiro); aqui agrupa por ONG, com os itens do mais antigo ao mais novo */
  STORIES.length = 0;
  const grupos = new Map();
  momentos.forEach((r) => {
    const k = String(r.ong_id);
    if (!grupos.has(k)) {
      const g = { o: r.ong_id, imgs: [] };
      grupos.set(k, g);
      STORIES.push(g);
    }
    grupos.get(k).imgs.unshift(adaptApi.momento(r));
  });

  /* candidaturas da própria pessoa (a ONG não recebe candidatos: não existe rota no back) */
  VOLUNT.length = 0;
  candidaturas.forEach((p) =>
    VOLUNT.push({ id: 'a' + p.id, ong: p.ong_id, post: p.id, user: USER.apelido_unico, status: 'APROVADO', data: '' })
  );

  FEED = 1;
  FEED_N = PAG;
}

/* Busca tudo de uma vez. Históricos e momentos são secundários: se falharem, o feed aparece sem eles. */
async function buscarFeedReal() {
  const opcional = (p) => p.catch(() => []);
  const [feed, curtidas, candidaturas, momentos] = await Promise.all([
    API.listarFeed(),
    opcional(API.historicoCurtidas()),
    ROLE == 'doador' ? opcional(API.historicoVoluntariado()) : Promise.resolve([]),
    opcional(API.listarMomentos()),
  ]);

  if (!Array.isArray(feed)) throw new Error('Resposta inesperada do servidor.');

  /* secundários com formato inesperado viram lista vazia em vez de derrubar o feed */
  const lista = (x) => (Array.isArray(x) ? x : []);
  aplicarFeedReal(feed, lista(curtidas), lista(candidaturas), lista(momentos));
}

/* Recarrega os dados sem mostrar esqueleto (depois de publicar, excluir...). Lança erro se falhar. */
const atualizarFeedReal = buscarFeedReal;

/* Primeira carga (com esqueleto na tela) e nova tentativa depois de erro. */
function carregarFeedReal() {
  FEED_PROMISE ??= (async () => {
    try {
      await buscarFeedReal();
      FEED_ERRO = '';
    } catch (e) {
      console.error('Falha ao carregar o feed:', e);
      FEED_ERRO = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar o feed.';
      FEED_PROMISE = null; /* permite tentar de novo */
    } finally {
      go();
    }
  })();

  return FEED_PROMISE;
}

function recarregarFeed() {
  FEED = 0;
  FEED_ERRO = '';
  FEED_PROMISE = null;
  go();
}
