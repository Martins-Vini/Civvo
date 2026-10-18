
const adapt = {
  ong: (r) => ({
    id: r.id,
    cnae: r.cnae,
    banner: r.banner_url,
    estatuto: { 
      missao: r.missao, 
      objetivos: r.objetivos, 
      gestao: r.gestao 
    },
    governanca: r.governanca || [],
    certidoes: {
      federal: r.regularidade_federal,
      estadual: r.regularidade_estadual,
      trabalhista: r.regularidade_trabalhista,
      fgts: r.fgts,
    },
    ata: r.ata_eleicao_url,
    name: r.nome_fantasia,
    razao: r.razao_social,
    cnpj: r.cnpj,
    cat: r.causas_atendidas || '',
    city: r.cidade || '',
    bio: r.historia || '',
    logo: r.logo_url,
    pix: r.chave_pix,
    plano: r.plano_tipo || 'GRATUITO',
    transp: r.nivel_transparencia || '',
    followers: r.seguidores || 0,
    social: {
      instagram: r.instagram_url,
      x: r.x_url,
      tiktok: r.tiktok_url,
      facebook: r.facebook_url,
      youtube: r.youtube_url,
    },
    /* colunas ainda não existem no MER */ 
    h: (r.id * 70) % 360,
    ver: !!r.is_verified,
  }),

  post: (r, c, m = []) => ({
    id: r.id,
    ong: r.ong_id,
    kind: r.post_type,
    text: r.content || r.type || '',
    title: r.title || '',
    imgs: m.map((x) => x.file_url),
    likes: r.likes || 0,
    comments: r.comments || 0,
    time: r.created_at,
    boosted: !!r.is_boosted,
    camp: c
      ? { 
          meta: +c.meta_valor, 
          atual: +c.valor_atual, 
          limite: c.data_limite, 
          status: c.status 
        }
      : null,
  }),

  comment: (r) => ({
    id: r.id,
    post: r.post_id,
    parent: r.parent_comment_id,
    user: r.autor || 'Usuário',
    nome: r.nome_autor || r.autor,
    avatar: r.avatar_url,
    h: ((r.user_id || r.id) * 70) % 360,
    text: r.content,
    time: r.created_at,
  }),

  donation: (r) => ({
    id: r.id,
    doador: r.doador,
    ongId: r.ong_id,
    camp: r.campaign_id,
    valor: +r.amount,
    status: r.status,
    data: r.created_at,
    metodo: r.metodo_pagamento || 'PIX',
    projeto: r.projeto || '',
    ong: r.ong || '',
  }),

  demand: (r) => ({
    id: r.id,
    ong: r.ong_id,
    titulo: r.titulo,
    desc: r.descricao,
    status: r.status,
  }),

  transp: (r) => ({
    id: r.id,
    ong: r.ong_id,
    balanco: r.balanco_url,
    relatorio: r.relatorio_url,
    status: r.status,
    data: r.created_at,
  }),
};

function hydrate(db) {
  const put = (a, rows, f) => {
    a.length = 0;
    a.push(...(rows || []).map(f));
  };

  put(ONGS, db.ongs_profiles, adapt.ong);
  
  put(POSTS, db.posts, (r) =>
    adapt.post(
      r,
      (db.campaign_details || []).find((c) => c.post_id == r.id),
      (db.post_media || []).filter((x) => x.post_id == r.id && x.media_type != 'VIDEO')
    )
  );

  put(COMMENTS, db.post_comment, adapt.comment);
  put(DONATIONS, db.donations, adapt.donation);
  put(DEMANDS, db.demands, adapt.demand);
  put(TRANSP, db.transparency_reports, adapt.transp);

  FEED = 1;
  FEED_N = PAG;
  go();
}