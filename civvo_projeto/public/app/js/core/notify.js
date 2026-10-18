
let NID = 0;

const notify = (to, tipo, texto, link = '') =>
  NOTIFS.unshift({
    id: ++NID,
    to,
    tipo,
    texto,
    time: new Date().toLocaleString('pt-BR'),
    lida: false,
    link,
  });

const unread = () => NOTIFS.filter((n) => n.to == ROLE && !n.lida).length;

const audit = (action, table, desc) =>
  AUDIT.unshift({
    created_at: new Date().toLocaleString('pt-BR'),
    action_type: action,
    table_name: table,
    description: desc,
  });