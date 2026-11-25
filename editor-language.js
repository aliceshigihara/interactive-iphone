/* English editor chrome. The simulator and authored story content are not translated. */
(() => {
  const {lang, reader, text, dictionary, translate} = SiteLanguage;
  if (reader) return;
  const choice = document.createElement('div');
  choice.className = 'language-choice';
  choice.setAttribute('role','group');
  choice.setAttribute('aria-label', text('Idioma','Language'));
  choice.innerHTML = '<a data-language-choice="pt" href="?lang=pt" lang="pt-BR" aria-label="Português">PT</a><a data-language-choice="en" href="?lang=en" lang="en" aria-label="English">EN</a>';
  document.querySelector('#editor-theme-toggle').before(choice);
  if (lang !== 'en') return;
  document.title = 'Editor — Fablyphone';
  const copy = dictionary(`
Navegação do editor|Editor navigation
Editar|Edit
Narração|Narration
Histórias|Stories
Narração interativa|Interactive storytelling
Gerenciar histórias|Manage stories
Categoria da narração|Narration category
Programe o que acontece no iPhone durante a leitura. Cada evento ocorre uma vez por sessão.|Schedule what happens on the iPhone as someone reads. Each event runs once per session.
Mensagens e notificações|Messages and notifications
Chamadas|Calls
+ Mensagem|+ Message
+ Notificação|+ Notification
+ Nova chamada|+ New call
Pular guia|Skip guide
Voltar|Back
Próximo|Next
Link de leitura|Reading link
Antes de publicar|Before you publish
Você está prestes a publicar|You’re about to publish
. Qualquer pessoa com o link poderá ler a cópia publicada.|. Anyone with the link can read the published copy.
Até 850 KB por história publicada|Up to 850 KB per published story
O limite inclui textos e todas as imagens: fotos, capas, avatares e anexos. Em uma história leve, isso pode dar cerca de|The limit includes text and all images: photos, covers, avatars, and attachments. For a short story, that may be around
6 a 12 fotos comprimidas|6 to 12 compressed photos
, mas não existe um número fixo.|, but there’s no fixed number.
Se passar do limite, reduza ou remova imagens e tente novamente. Esse limite não se aplica ao rascunho salvo no navegador.|If you reach the limit, resize or remove images and try again. This limit doesn’t apply to the draft saved in your browser.
Cancelar|Cancel
Publicar e copiar link|Publish and copy link
Painel da história|Story panel
Abrir Reader View|Open Reader View
Como usar|Quick guide
Planejamento da história|Story planner
Geral|General
Toque para abrir ou fechar|Tap to expand or collapse
Hora|Time
Data|Date
Ordem da lista|Sort order
Recentes primeiro|Newest first
Antigas primeiro|Oldest first
Mais recentes no topo (como no iPhone)|Newest at the top (like on iPhone)
Mais antigos no topo|Oldest at the top
Modo apagar|Delete mode
Permite apagar itens editáveis com um toque.|Delete editable items with a single tap.
Desativado|Off
Ativo|On
Bloquear tela|Lock screen
Deletar|Delete
Segure por 2 segundos|Hold for 2 seconds
Histórias salvas|Saved stories
Salvas automaticamente neste navegador. Use ↗ ao lado de cada história para criar um link próprio.|Stories are saved automatically in this browser. Use ↗ next to a story to create its own link.
＋ Nova|＋ New
Duplicar|Duplicate
Renomear|Rename
Exportar arquivo|Export file
Importar|Import
Copiar link|Copy link
Link da história selecionada|Selected story link
Clique em “Publicar e copiar link”|Click “Publish and copy link”
Publicar envia uma cópia da história ao Firebase Firestore. O link é público e somente para leitura; após editar, publique novamente para gerar uma nova versão. Histórias locais continuam salvas neste navegador. Não publique informações privadas.|Publishing sends a copy of the story to Firebase Firestore. The link is public and read-only. Publish again after editing to create a new version. Local stories remain in this browser. Do not publish private information.
Ações da conversa|Conversation actions
Aplicativos|Apps
Escolha quais aparecem no iPhone|Choose which apps appear on the iPhone
App principal no Dock|Main chat app in the Dock
Organizar tela inicial|Organize Home Screen
Senha da tela de bloqueio|Lock Screen passcode
Toque para configurar|Tap to configure
4 a 6 dígitos. Deixe vazio para desbloquear sem senha. Sem senha por padrão.|Enter 4 to 6 digits, or leave blank to unlock without a passcode. No passcode by default.
Senha|Passcode
Sem senha definida|No passcode set
Digite de 4 a 6 dígitos|Enter 4 to 6 digits
Bloquear com esta senha|Lock with this passcode
Cidade|City
Temperatura|Temperature
Condição|Condition
Clima rápido|Quick weather
Máxima|High
Mínima|Low
O widget e o app Weather usam estes mesmos dados.|The widget and the Weather app use the same information.
Tela inicial|Home Screen
Tela de bloqueio|Lock Screen
Resetar início|Reset Home Screen
Resetar bloqueio|Reset Lock Screen
Notificações|Notifications
Tela de bloqueio · prévia ao vivo|Lock Screen · live preview
Editar notificações|Edit notifications
Personagens|Characters
Eles viram contatos e grupos nas conversas. Para criar uma conversa, use o ＋ no app.|Characters become contacts and groups in conversations. To create a conversation, use ＋ in the app.
Fechar|Close
Abrir|Open
＋ Adicionar personagem|＋ Add character
Conversas|Conversations
Marcar como lida ou não lida|Mark as read or unread
Não lida|Unread
Lida|Read
Nenhuma conversa ainda.|No conversations yet.
＋ Criar canal|＋ Create channel
＋ Adicionar vídeo|＋ Add video
Cartões fictícios para a história. Não utilize dados bancários reais.|Fictional cards for your story. Do not use real banking information.
＋ Adicionar cartão|＋ Add card
O Internet Banking fictício agora fica em um app separado:|Fictional online banking now lives in a separate app:
App de Internet Banking fictício, chique, minimalista e com suporte a várias moedas.|A clean, fictional banking app with support for multiple currencies.
Configurar conta|Set up account
＋ Adicionar transação|＋ Add transaction
O que você quer criar?|What would you like to create?
Perfil|Profile
Nome, foto e biografia|Name, photo, and bio
Publicação|Post
Texto, imagem e métricas|Text, image, and metrics
Notícia|News
Categoria e destaque em Explore|Category and Explore spotlight
Notificação|Notification
Curtida em um post da história|A like on a post in your story
Conversa|Conversation
Mensagem direta fictícia|Fictional direct message
Edite posts e crie respostas na tela do próprio post.|Edit posts and write replies on the post itself.
Perfis do Instagram|Instagram profiles
Independentes dos personagens. Para postar, use o ＋ no topo do perfil.|Profiles are separate from characters. To create a post, use ＋ at the top of the profile.
Seu perfil (dono do iPhone)|Your profile (iPhone owner)
＋ Criar perfil|＋ Create profile
Nota aberta|Open note
Abra uma nota para editar a data e fixá-la.|Open a note to edit its date or pin it.
Data e hora da nota (define a seção automaticamente)|Note date and time (sets the section automatically)
Fixar nota (Pinned)|Pin note
Você também pode criar e-mails pelo botão de escrever no app.|You can also create emails with the compose button in the app.
Novo e-mail|New email
Marcar todos como lidos|Mark all as read
Todos não lidos|Mark all as unread
Favoritos e pesquisas|Favorites and searches
Sites fictícios|Fictional websites
Sistema acadêmico nos favoritos|Show Academic Portal in Favorites
Configurar sistema acadêmico|Set up Academic Portal
News Portal nos favoritos|Show News Portal in Favorites
Configurar News Portal|Set up News Portal
Nova pesquisa recente|New recent search
Adicionar pesquisa|Add search
Definir localização do dono|Set the owner’s location
Selecionar local no mapa|Choose a place on the map
Toque no mapa para marcar um endereço ou local da história.|Tap the map to mark an address or a location in the story.
Novo lugar recente|New recent place
Adicionar lugar pelo nome|Add a place by name
Adicionar pessoa|Add person
Definir minha localização|Set my location
Os horários seguem a hora definida em Geral.|Times use the clock set in General.
Novo relógio mundial|New world clock
Novo alarme|New alarm
Adicionar fotos|Add photos
Dono do iPhone|iPhone owner
Aparece no topo de Settings. Tocar no cartão do perfil dentro do app também edita.|Shown at the top of Settings. You can also edit it by tapping the profile card in the app.
Nome|Name
Foto|Photo
Bateria (%) — também muda a barra de status|Battery (%) — also updates the status bar
Dentro do app, "Edit" apaga ligações e o ⓘ edita. A bolinha vermelha do ícone conta as perdidas.|In the app, “Edit” removes calls and ⓘ edits them. The red badge shows how many calls were missed.
Registrar ligação|Log a call
Criar voicemail|Create voicemail
Crie um recado de voz com transcrição|Create a voice message with a transcript
País inicial do Maps|Maps starting country
Escolha o país que aparece ao abrir Maps|Choose the country shown when Maps opens
País ou território|Country or territory
Chamadas interativas|Interactive calls
Toque num dia no app e adicione eventos pelo ＋. Toque num evento para editar. Eventos de hoje aparecem no widget.|Tap a day and use ＋ to add events. Tap an event to edit it. Today’s events appear in the widget.
Novo evento|New event
Use os campos abaixo para montar o app de clima do iPhone. O widget também será atualizado.|Fill in the fields below to set up Weather. The widget updates too.
Previsão de 10 dias|10-day forecast
+ Adicionar dia|+ Add day
Monte sua notificação e confira como ela fica antes de adicionar.|Set up your notification and preview it before adding it.
Prévia|Preview
Adicionadas|Saved
Nova notificação|New notification
Escolha o aplicativo|Choose an app
Título|Title
Horário exibido|Displayed time
Mensagem|Message
Contato ou grupo (opcional)|Contact or group (optional)
＋ Adicionar à tela bloqueada|＋ Add to Lock Screen
Notificações adicionadas|Saved notifications
Prévia da tela bloqueada|Lock Screen preview
Aplicativo da notificação|Notification app
Área de notificações|Notifications area
Fechar notificações|Close notifications
Notificações anteriores|Previous notifications
Próximas notificações|Next notifications
Prévia das notificações|Notification preview
Ex.: Nome do contato|E.g. Contact name
O que vai aparecer na tela?|What will appear on the screen?
Se diferente do título|If different from the title
Nenhuma notificação adicionada.|No notifications added.
Caderno da história|Story notebook
Organize datas e personagens sem alterar o que aparece no iPhone.|Organize dates and characters without changing what appears on the iPhone.
Linha do tempo|Timeline
Data inicial|Start date
Data final|End date
Próximos dias|Next days
O que aconteceu neste dia? Escreva os eventos, horários ou ideias que quiser lembrar.|What happened on this day? Add events, times, or ideas you want to remember.
Montar linha|Build timeline
Escolha o começo e o fim da história. Você pode anotar apenas os dias importantes.|Choose when the story starts and ends. You only need to make notes for important days.
Referências deste dia|References for this day
Vincule registros já criados no iPhone, sem mudar suas datas.|Link items already on the iPhone without changing their dates.
+ Adicionar referência|+ Add reference
Fichas de personagens|Character sheets
+ Nova ficha|+ New sheet
Crie uma ficha aqui ou use um personagem que já existe na história.|Create a new sheet or use an existing character.
Trocar foto|Change photo
Remover foto|Remove photo
Aniversário|Birthday
Data importante (opcional)|Important date (optional)
Ex.: início do curso ou do trabalho.|E.g. first day of school or work.
Trabalho ou curso|Work or studies
Outras informações|Other information
Idade, relações, detalhes importantes…|Age, relationships, important details…
Próxima ficha|Next sheet
Excluir ficha|Delete sheet
Conexões no iPhone|iPhone connections
Salvo neste navegador e incluído no backup JSON. Não aparece no modo leitor nem no link publicado.|Saved in this browser and included in JSON backups. It doesn’t appear in Reader View or in published stories.
Conteúdo da história|Story content
Escolher registro|Choose an item
Tipo de conteúdo|Content type
Pesquisar|Search
Nome, título ou app|Name, title, or app
Contatos conectados|Connected contacts
Conexões|Connections
Nova história|New story
Renomear história|Rename story
História|Story
Preferências|Preferences
Link copiado.|Link copied.
Publicar história|Publish story
Publicando no Firebase…|Publishing to Firebase…
História publicada! Link copiado.|Story published! Link copied.
História publicada! Copie o endereço no campo acima.|Story published! Copy the address above.
Excluir história|Delete story
Excluir esta história?|Delete this story?
Mantenha ao menos uma história.|Keep at least one story.
Apagar tudo desta história e recomeçar do zero?|Delete this story’s contents and start over?
Crie um link de leitura primeiro.|Create a reading link first.
Selecione e copie o endereço exibido acima.|Select and copy the address shown above.
Prévia ao vivo|Live preview
PRÉVIA AO VIVO|LIVE PREVIEW
Salvar|Save
Adicionar|Add
Excluir|Delete
Selecionar foto|Select photo
Escolher foto|Choose photo
Escolher arquivo|Choose file
Recortar imagem|Crop image
Aplicar|Apply
Girar|Rotate
Centralizar|Center
Nenhum evento programado.|No events scheduled.
Nenhuma chamada interativa ainda.|No interactive calls yet.
Mensagem programada|Scheduled message
Notificação dinâmica|Scheduled notification
Aplicativo de destino|Destination app
Remetente|Sender
Primeiro participante|First participant
Selecione|Select
Texto|Text
Quando acontece|When it happens
Após desbloquear|After unlocking
Ao abrir aplicativo|When an app opens
Ao abrir conversa|When a conversation opens
Após visualizar mensagem|After a message is viewed
Aplicativo gatilho|Trigger app
Conversa gatilho|Trigger conversation
Mensagem gatilho|Trigger message
Atraso em segundos|Delay in seconds
Salvar evento|Save event
Configurar chamada|Set up call
Personagem|Character
Nome personalizado|Custom name
Nome de quem liga|Caller’s name
Nome do contato|Contact name
Quando tocar|When it rings
Após visualizar uma mensagem|After viewing a message
Ao abrir uma conversa|When a conversation opens
Ao abrir um aplicativo|When an app opens
Após desbloquear o iPhone|After unlocking the iPhone
Aplicativo|App
Selecionar conversa|Select a conversation
Selecionar mensagem|Select a message
A chamada começa quando a mensagem estiver visível na conversa, depois do atraso escolhido.|The call begins after the selected delay once the message is visible in the conversation.
Atraso (segundos)|Delay (seconds)
Roteiro da ligação|Call script
As legendas aparecem automaticamente. O leitor também pode avançar manualmente.|Captions appear automatically. The reader can also advance them manually.
Quem fala|Speaker
Quem liga|Caller
Duração em segundos|Duration in seconds
Salvar chamada|Save call
+ Adicionar fala|+ Add line
Buscar app|Find an app
Limpar busca|Clear search
Mover apps filtrados|Move filtered apps
Modo rápido|Quick mode
Escolha um destino e toque nos apps abaixo.|Choose a destination and tap the apps below.
Escolha a página ou pasta de cada aplicativo. O Dock permanece fixo.|Choose a page or folder for each app. The Dock stays in place.
+ Página|+ Page
+ Pasta|+ Folder
Nenhum app encontrado.|No apps found.
Remover última página|Remove last page
Novo destaque|New highlight
Nome do destaque|Highlight title
Foto do destaque|Highlight photo
Música do perfil|Profile music
Nome da música|Song title
Artista|Artist
`);
  const ignored = '#nl .notif-existing, #stl .cr > span, #stl .collection-name, #lock-preview-notices, .fp-device, input, textarea, [contenteditable], .story-connected-identity, .story-ref-row, .story-picker-item';
  const fixedOptions = `#pord, #nar-form select[onchange^="narDraft.trigger="], #sc-editor select[onchange^="scDraft.trigger="], #sc-editor select[aria-label="Quem fala"], #sc-editor select[aria-label="Speaker"]`;
  const canTranslate = (element, node) => Boolean(element &&
    !element.closest('script,style,svg') &&
    !(node && element.closest(ignored)) &&
    !(element.matches('option') && !element.closest(fixedOptions) &&
      !element.matches('#narration option[value=""], #narration option[value="-1"]')));
  const areas = [...document.querySelectorAll('.mobile-editor-nav, body > .col, .story-drawer, body > dialog, #pm, #md')];
  const scan = node => translate(node, copy, canTranslate);
  areas.forEach(scan);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') scan(record.target);
      else if (record.type === 'characterData') scan(record.target);
      else record.addedNodes.forEach(scan);
    }
  });
  for (const area of areas) observer.observe(area, {childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['title','aria-label','placeholder']});
})();
