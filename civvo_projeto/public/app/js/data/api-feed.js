/* Dados reais do back-end (modo não-DEMO): feed e momentos → POSTS / ONGS / VOLUNT / STORIES. */

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
    followers: +r.ong_seguidores || 0,
    social: {},
    estatuto: {},
    governanca: [],
    certidoes: {},
    h: (r.ong_id * 70) % 360,
    ver: false,
  }),

  momento: (r) => ({
    src: r.media_url,
    caption: r.caption || '',
    exp: r.expires_at ? new Date(r.expires_at).getTime() : 0,
  }),

  post: (r, curtidos) => {
    const kind = TIPO_POST[r.type] || 'POST';
    const liked = curtidos.has(r.id || r.post_id);
    const ativoImpulso = !!r.is_boosted && (!r.boosted_until || new Date(r.boosted_until) > new Date());
    const postId = r.id || r.post_id;

    return {
      id: postId,
      ong: r.ong_id,
      kind,
      text: r.caption || r.content || '',
      title: '',
      imgs: (r.media || []).filter((m) => m.media_type != 'VIDEO').map((m) => m.file_url),
      likes: Math.max(+(r.total_likes ?? r.likes_count ?? r.likes) || 0, liked ? 1 : 0),
      comments: +(r.total_comments ?? r.comments_count ?? r.comments) || 0,
      liked,
      edited: !!r.is_edited,
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
  const curtidos = new Set(curtidas.map((p) => p.id || p.post_id));

  const meu = ME_ONG != null ? ONGS.find((o) => o.id == ME_ONG) : null;

  const porId = new Map();
  [...feed, ...momentos].forEach((r) => {
    if (!porId.has(String(r.ong_id))) porId.set(String(r.ong_id), adaptApi.ong(r));
  });
  if (meu) porId.set(String(meu.id), Object.assign(meu, porId.get(String(meu.id)) || {}));

  ONGS.length = 0;
  ONGS.push(...porId.values());

  POSTS.length = 0;
  POSTS.push(...feed.map((r) => adaptApi.post(r, curtidos)));

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

  VOLUNT.length = 0;
  candidaturas.forEach((p) =>
    VOLUNT.push({ id: 'a' + (p.id || p.post_id), ong: p.ong_id, post: (p.id || p.post_id), user: USER.apelido_unico, status: 'APROVADO', data: '' })
  );

  FEED = 1;
  FEED_N = PAG;
}

async function buscarFeedReal() {
  const opcional = (p) => p.catch(() => []);
  const [feed, curtidas, candidaturas, momentos, seguidas] = await Promise.all([
    API.listarFeed(),
    opcional(API.historicoCurtidas()),
    ROLE == 'doador' ? opcional(API.historicoVoluntariado()) : Promise.resolve([]),
    opcional(API.listarMomentos()),
    opcional(API.minhasOngsSeguidas()),
  ]);

  if (!Array.isArray(feed)) throw new Error('Resposta inesperada do servidor.');

  const lista = (x) => (Array.isArray(x) ? x : []);
  aplicarFeedReal(feed, lista(curtidas), lista(candidaturas), lista(momentos));

  FOLLOW.clear();
  lista(seguidas).forEach((x) => FOLLOW.add(Number(x)));
}

const atualizarFeedReal = buscarFeedReal;

function carregarFeedReal() {
  FEED_PROMISE ??= (async () => {
    try {
      await buscarFeedReal();
      FEED_ERRO = '';
    } catch (e) {
      console.error('Falha ao carregar o feed:', e);
      FEED_ERRO = e.name == 'ApiError' && e.message ? e.message : 'Não foi possível carregar o feed.';
      FEED_PROMISE = null;
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