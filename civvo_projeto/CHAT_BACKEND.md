# Chat: o que o front espera do back

O front já está ligado. Para funcionar de ponta a ponta, o back (Civvo_API) precisa deste contrato.
Tudo usa `Authorization: Bearer <JWT>` (REST) e o mesmo JWT em `socket.handshake.auth.token` (Socket.IO).

## REST (prefixo `/api/chat`)

| Método | Rota | Corpo / retorno |
|---|---|---|
| POST | `/conversation` | **já existe.** Corpo `{ receiverId }` → `{ conversationId }`. Use `req.user.userId` (o JWT não tem `id`) e converta os ids com `Number()` antes de ordenar. |
| GET | `/conversations` | Lista do usuário logado, mais recente primeiro: `[{ conversationId, peer: { id, nome, tipo: 'DOADOR'\|'ONG', avatar }, ultima: Mensagem\|null, unread }]` |
| GET | `/conversations/:id/messages` | `[Mensagem]` em ordem cronológica. Só para quem participa da conversa. |
| PUT | `/conversations/:id/read` | Marca como lidas as mensagens do outro lado. Opcional: emitir `messages_read` `{ conversationId }` ao remetente. |
| POST | `/upload` | `multipart/form-data`, campo `file` → `{ url, name, size }`. No Cloudinary use `resource_type: 'auto'` (áudio, vídeo e PDF). |

`Mensagem` (linha de CHAT_MESSAGES com o texto já decifrado):
`{ id, conversation_id, sender_id, content, media_url, media_type, media_name, media_size, audio_duration_seconds, is_read, created_at }`

`peer.nome` / `peer.avatar`: `COALESCE(ongs_profiles.nome_fantasia, CONCAT(doadores_profiles.nome,' ',sobrenome))` e `COALESCE(logo_url, avatar_url)`.

### Também necessário
`GET /api/perfil/ong/:id` precisa devolver **`user_id`** da ONG (`o.user_id`). É com ele que o botão "Mensagem" do perfil abre a conversa.

### Migração do banco
```sql
ALTER TABLE CHAT_MESSAGES
  ADD COLUMN media_name VARCHAR(255) NULL,
  ADD COLUMN media_size INT NULL,
  ADD COLUMN audio_duration_seconds INT NULL;
```

## Socket.IO

- **Autenticação:** `io.use((socket, next) => { /* validar socket.handshake.auth.token */ })` e usar o id do token. **Não confiar em `senderId` vindo do cliente.**
- `register_user` `userId` → entra em `user_<id>` (só o próprio id do token).
- `join_room` `{ conversationId }` → só se o usuário participa da conversa.
- `send_message` — o front envia:
  `{ clientId, conversationId, senderId, receiverId, content, mediaUrl, mediaType ('text'|'image'|'audio'|'video'|'file'), audioSeconds, mediaName, mediaSize }`
  - Salvar e emitir `receive_message` (camelCase, igual ao que já existe + `clientId`, `audioSeconds`, `mediaName`, `mediaSize`) para `room_<conversationId>` **e** para `user_<receiverId>` / `user_<remetente>`, assim quem não está com a conversa aberta (ou nunca a viu) também recebe. O front ignora ids repetidos.
  - Responder ao *ack* (3º argumento) com `{ message }` ou `{ error }`. Sem ack o front usa o eco do `receive_message`.
  - Erros: `socket.emit('chat_error', { message })` (já existe).
- Defina **`CHAT_SECRET_KEY`** (64 caracteres hex) no `.env` do back; sem ela o histórico fica ilegível a cada reinício.
