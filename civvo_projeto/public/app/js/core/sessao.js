/* Aplica ao app a sessão criada no login (src/bridge.js): perfil ativo e dados da pessoa ou da ONG.*/

const so = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

function aplicarSessao(s) {
  if (!s) {
    return;
  }

  ROLE = s.perfil;
  MOSTRAR_SELETOR = !!s.demo;
  const u = s.usuario || {};

  if (s.perfil == 'doador') {
    Object.assign(USER, so({
      nome: u.nome || u.name,
      sobrenome: u.sobrenome,
      apelido_unico: u.apelido_unico || u.apelido,
      email: u.email,
      cpf: u.cpf,
      bio: u.bio,
      avatar_url: u.avatar_url,
    }));
  }

  if (s.perfil == 'ong') {
    Object.assign(meOng(), so({
      name: u.nome_fantasia || u.organizationName || u.nome || u.name,
      handle: u.handle || u.apelido,
      razao: u.razao_social,
      cnpj: u.cnpj,
      bio: u.bio,
      logo: u.logo_url,
      banner: u.banner_url,
    }));
  }
}
