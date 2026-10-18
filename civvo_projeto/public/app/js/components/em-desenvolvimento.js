/* Tela provisória: mantém o menu e mostra "(em desenvolvimento)". Usada por Painel de gestão, Avisos e Chats enquanto não são feitos. */

const emDev = (titulo, on) =>
  shell(
    `<div class="top"><div><h1>${titulo}</h1></div></div><div class="card emp">(em desenvolvimento)</div>`,
    on,
    { rightCol: 0 },
  );
