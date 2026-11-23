# iPhone Stories — GitHub Pages + Firebase Firestore

## Configuração (obrigatória, uma vez)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Em **Configurações do projeto → Seus apps**, registre um app **Web (</>)**. Copie `firebaseConfig` para o arquivo `firebase-config.js`, mantendo o `export const firebaseConfig = ...`. **Não use credenciais de conta de serviço**.
3. Em **Build → Authentication → Sign-in method**, habilite **Anônimo (Anonymous)**.
4. Em **Build → Firestore Database**, crie um banco **Standard** em modo de produção, em uma região disponível. Na aba **Rules**, substitua as regras pelas do arquivo `firestore.rules` e clique em **Publish**. **Não use `allow read, write: if true`**.
5. Em **Authentication → Settings → Authorized domains**, adicione seu domínio GitHub Pages, por exemplo `usuario.github.io` (apenas host, sem `https://` ou caminho), se necessário para sua configuração de autenticação.
6. Suba todos os arquivos para seu repositório GitHub. Em **Settings → Pages**, escolha **Deploy from a branch**, `main` e `/ (root)`.
7. Abra o `index.html` do GitHub Pages. Em **Histórias salvas**, publique com ↗ ou **Publicar e copiar link**.

## Links

- Editor: `https://usuario.github.io/repositorio/`
- Leitor: `https://usuario.github.io/repositorio/reader.html?id=ID_DO_FIRESTORE`
- O ID é gerado automaticamente pelo Firestore (20 caracteres aleatórios).
- Cada publicação é uma cópia **pública, somente leitura e imutável**; publicar novamente gera outro link.
- Histórias antigas continuam salvas localmente (IndexedDB). Exportar JSON continua disponível.
- A Reader View também aceita o formato antigo `#story=...` para compatibilidade.

## Limitações e segurança

- **Não publique dados privados.** Qualquer pessoa com o link pode ler a história; o link pode ser repassado.
- Firestore limita documentos a ~1 MiB. Este projeto permite até 850 mil bytes no campo compactado; muitas fotos podem estourar o limite. Fotos estão incorporadas no JSON, não enviadas para Firebase Storage.
- A autenticação anônima não impede completamente spam/abuso. Considere App Check e limites de uso antes de divulgar amplamente a ferramenta. Vigie a aba Usage e defina alertas de orçamento, se aderir a um plano pago.
- A configuração Web Firebase (incluindo `apiKey`) é pública. A proteção real são regras de Firestore e autenticação.
- Sem atualização, exclusão remota ou contas de edição nesta versão. Arquivos publicados permanecem no banco até serem removidos manualmente no console.
- O projeto **não foi conectado** a uma conta Firebase nesta entrega: você precisa preencher a configuração e publicar as regras.
- Use HTTPS (GitHub Pages). Não abra `index.html` em `file://` para testar o Firebase.

## Arquivos

`index.html`, `reader.html`, `firebase-config.js`, `firebase-stories.js`, `firestore.rules`, `assets/iphone-icons/`.
