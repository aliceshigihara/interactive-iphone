(() => {
  const {lang, dictionary, translate} = SiteLanguage;
  if (lang !== 'en') return;
  document.title = 'Fablyphone — Stories on a screen';
  document.querySelector('meta[name="description"]').content =
    'Create stories that unfold on an iPhone. Write conversations, create profiles, stage calls, and share your story.';
  translate(document.body, dictionary(`
Idioma|Language
Fablyphone · início|Fablyphone · home
Navegação da página|Page navigation
Crie histórias que acontecem na tela de um iPhone.|Create stories that unfold on an iPhone.
Explore os aplicativos|Explore the apps
Aplicativos|Apps
Mensagens|Messages
Telefone|Phone
Notas|Notes
Um perfil que conta histórias.|A profile that tells a story.
Crie perfis, publicações e conversas para seus personagens.|Create profiles, posts, and conversations for your characters.
Perfil fictício de Zhang no Instagram, com fotos de uma viagem.|Zhang’s fictional Instagram profile, with pictures from a trip.
Tudo começa com uma mensagem.|It all starts with a message.
Escreva conversas e encaixe pistas entre as falas.|Write conversations and hide clues between the lines.
Você recebeu a foto?|Did you get the photo?
Recebi. Onde é isso?|I did. Where is that?
É o farol. Te explico quando chegar.|It’s the lighthouse. I’ll explain when I get there.
Uma ligação muda tudo.|One phone call changes everything.
Escreva o diálogo e escolha a hora certa para o telefone tocar.|Write the dialogue and choose when the phone rings.
Chamada recebida|Incoming call
As pistas ficam nas entrelinhas.|The clues are between the lines.
Monte diários, lembretes e anotações dentro da história.|Add journals, reminders, and notes to your story.
O que eu sei até agora|What I know so far
1. O farol fecha às 18h.|1. The lighthouse closes at 6 p.m.
2. Zhang chegou antes do pôr do sol.|2. Zhang arrived before sunset.
3. A foto foi tirada à noite.|3. The photo was taken at night.
Dê um site ao seu universo.|Give your world a website.
Inclua páginas fictícias que o leitor pode descobrir pelo navegador.|Add fictional websites for readers to discover in the browser.
JORNAL DA COSTA|THE COASTAL TIMES
O farol volta a acender|The lighthouse shines again
Edição de domingo · 18h00|Sunday edition · 6 p.m.
Role sobre a prévia ou escolha um app.|Scroll over the preview or choose an app.
Deslize na prévia ou escolha um app.|Swipe the preview or choose an app.
Crie sem cadastro|Create without signing up
Sem criar contas.|No accounts to create.
Sem pagar nada.|Completely free.
Só você e sua imaginação.|Just you and your imagination.
Prévias do Fablyphone|Fablyphone previews
carrossel|carousel
Redes sociais|Social media
Crie perfis, posts e conversas fictícias no Instagram e no Twitter.|Create fictional profiles, posts, and conversations on Instagram and Twitter.
Perfil|Profile
Diário da viagem|Travel journal
Conversas|Conversations
Escreva mensagens e adicione fotos às conversas dos seus personagens.|Write messages and add photos to your characters’ conversations.
Já chegou?|Are you there yet?
Tô quase aí.|I’m almost there.
Vai valer a espera.|It’ll be worth the wait.
Ligações interativas|Interactive calls
Programe chamadas fictícias, escreva as falas e escolha quando o telefone toca.|Set up fictional calls, write the dialogue, and choose when the phone rings.
Narração interativa|Interactive storytelling
Faça mensagens e notificações aparecerem no momento certo da leitura.|Make messages and notifications appear at the right moment.
Encontrei uma pista.|I found a clue.
Dia um|Day one
Links de leitura|Reading links
Publique uma cópia da sua história para outras pessoas explorarem.|Publish a copy of your story for other people to explore.
O outro lado|The other side
Uma história de Zhang|A story by Zhang
↗ Abrir história|↗ Open story
Começar|Get started
Um iPhone fictício para as suas histórias.|A fictional iPhone for your stories.
`));
  const deck = document.querySelector('#tool-deck');
  deck.setAttribute('aria-roledescription','carousel');
  const profile = document.querySelector('.arc-profile img');
  profile.src = 'assets/landing-instagram.svg#en';
})();
