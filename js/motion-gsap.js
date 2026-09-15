/* ================================================ ROLAGEM FIXA DO HERO
   Camada de upgrade. A base (o parallax em CSS puro via
   `animation-timeline: scroll()`, em css/voltagem.css) continua sendo o
   que roda se este script falhar por qualquer motivo — CDN bloqueado,
   erro de rede, navegador sem suporte. Isso segue a regra do projeto
   desde o início: se o JS não rodar, a página continua inteira.

   Só ENTRA em jogo quando: GSAP carregou de verdade, a tela é de
   desktop (≥1024px — em celular, rolagem presa sob o polegar é o tipo
   de coisa que trava a experiência, não que impressiona) e a pessoa
   não pediu movimento reduzido.

   CONFLITO EVITADO DE PROPÓSITO: a mesma imagem já tem uma animação CSS
   de scroll (`paralaxe`, escala 1.18) rodando na mesma propriedade
   (transform). Testado ao vivo: `foto.getAnimations()` no load só mostra
   a animação de entrada (`assenta-foto`) — a `paralaxe` usa
   `animation-timeline: scroll()` e só é CRIADA quando a rolagem entra no
   seu range, ou seja, não existe ainda para ser cancelada aqui. Por isso a
   troca de bastão é por CLASSE: este script poe `gsap-hero-ativo` no
   <html> assim que assume, e css/voltagem.css tem uma regra
   `html.gsap-hero-ativo .hero-foto img { animation: none !important }`
   que vence por especificidade.

   BUG DE ULTRAWIDE (pin solto abrupto): `end` tinha só a altura da janela
   como base; em monitor baixo e largo (2560×1080, 3440×1440) o trecho de
   scrub ficava curto. Corrigido com piso de 600px. A barra sticky também
   ganhou `transform: translateZ(0)` (css/voltagem.css) — sem isso ela
   piscava de lugar por um frame no instante exato em que o pin soltava.
   Os dois foram medidos ao vivo, pixel a pixel, na fronteira do scroll.

   RODADA 3 — "Frente Fria: a virada". As duas rodadas anteriores só
   faziam a foto crescer (+ texto reagindo); ficou pouco: nos primeiros
   quadros do scroll quase nada muda (uma escala de 1.00 pra 1.01 é
   imperceptível), e é isso que lê como "travado" — não é o pin que
   engasga, é a cena que não tem nada acontecendo ainda.

   A mudança: em vez de inventar elemento novo, a "aresta" — a linha
   vertical que já corta a tela em duas (a mesma que faz a abertura da
   página, ver "A COREOGRAFIA" mais abaixo neste arquivo do CSS) —
   continua o movimento dela. Ela é `left: var(--aresta)` tanto na régua
   quanto no corte da foto (`.hero-foto { inset: 0 0 0 var(--aresta) }`);
   arrastar essa MESMA variável até 0 durante o scroll faz o campo da
   foto comer o campo do texto pela borda, com o mesmo corte de lâmina
   que already existe no load — não é um efeito novo, é o mesmo gesto
   continuado. A foto termina tomando a tela inteira; o texto (que já
   cumpriu o papel no load) recua e se apaga por baixo da lâmina antes
   dela chegar — ele NÃO fica sendo "coberto", ele já saiu de cena.
   O botão do WhatsApp continua acessível pela barra do topo e pelo
   botão flutuante — os dois sobrevivem fora do hero.           */

(function () {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  var mm = gsap.matchMedia();

  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
    var heroEl = document.querySelector('.hero');
    var fotoWrap = document.querySelector('.hero-foto');
    var foto = document.querySelector('.hero-foto img');
    var heroCol = document.querySelector('.hero-col');
    if (!heroEl || !fotoWrap || !foto || !heroCol) return;

    document.documentElement.classList.add('gsap-hero-ativo');

    var lenis = null;
    if (typeof Lenis !== 'undefined') {
      // anchors: os links do menu (#servicos etc.) deslizam pelo Lenis. O
      // `scroll-behavior: smooth` do CSS fica desligado com o GSAP ativo (ver
      // html.gsap-hero-ativo no voltagem.css) porque ele CORROMPIA todo
      // refresh do ScrollTrigger feito com a página rolada — medido: mesma
      // posição, start -272 com smooth e 28 com auto. Offset = barra + folga,
      // o mesmo respiro que o scroll-margin-top dava.
      var alturaBarra = (document.querySelector('.topo') || {}).offsetHeight || 64;
      lenis = new Lenis({ duration: 1.1, wheelMultiplier: 1, anchors: { offset: -(alturaBarra + 24) } });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Posição real da lâmina agora, em px — lida do elemento renderizado,
    // não da variável CSS crua: `getComputedStyle` não resolve `calc()`
    // dentro de uma custom property, só dentro de uma propriedade real.
    // Lida de `.hero-foto`, NÃO de `.aresta`: a `.aresta` tem sua própria
    // animação de entrada (`aresta-entra`, translateX 100%→0 no load) e
    // este script roda antes dela terminar — medir a `.aresta` direto
    // pegava a posição dela A MEIO CAMINHO da entrada (bug real, visto ao
    // vivo: `--aresta` travava em 1425px, a largura inteira, escondendo a
    // foto). `.hero-foto` usa a mesma variável para o `inset`, mas só é
    // revelada por `clip-path` na entrada — isso não desloca a caixa dela,
    // então a leitura já sai correta não importa o instante.
    //
    // Rodada da abertura com luz: o campo da foto passou a ser o hero inteiro
    // (inset 0), então medir `.hero-foto` dá 0. A medida vem de
    // `.aresta.offsetLeft`, que é o `left` de layout — ignora o translateX da
    // entrada, então sai certa em qualquer instante. Função + invalidateOnRefresh:
    // redimensionar a janela remede (a variável inline do GSAP sai antes, pra
    // ler o valor do CSS e não o do próprio tween).
    //
    // Frente fria: a aresta não parte mais de uma posição medida — começa
    // escondida em -2px (ver o tween abaixo). arestaEl fica pro traço amarelo.
    var arestaEl = document.querySelector('.aresta');
    // Até onde ela vai: 2px ALÉM da borda direita. O traço amarelo mora sobre
    // o filete de 1px; na borda exata os dois ficariam no último pixel,
    // visíveis. Além dela, o `overflow-x: clip` do hero corta a lâmina inteira.
    function arestaFim() { return (heroEl.clientWidth + 2) + 'px'; }

    // SEM PIN. O hero gruda no .hero-palco com position: sticky (CSS) e o
    // GSAP só amarra a animação à passagem do palco. O pin do GSAP (tanto por
    // transform quanto por fixed) guardava a posição num espaçador e qualquer
    // refresh com a cena em andamento media errado — medido: start de 28 para
    // -272 e o hero deslocado dali em diante. Sticky é do navegador: não tem
    // posição guardada pra corromper.
    var palco = document.querySelector('.hero-palco') || heroEl;
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: palco,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });

    // Timeline em unidades de 0 a 1 (durações explícitas): cada fase fica
    // legível como fração do palco inteiro.
    var fotos = document.querySelectorAll('.hero-foto img');

    // CENA e PAUSA. Tudo que muda acaba em CENA (68% do palco); o resto é a
    // foto de tela inteira PARADA, com a manchete por cima, antes do hero
    // subir. Antes a cena ocupava 100% do trecho e a página começava a
    // subir no mesmo tick em que a foto completava a tela.
    var CENA = .68;

    // 1. A FRENTE FRIA AVANÇA. A aresta sai do corte da coluna e vai pra
    //    DIREITA até passar da borda: o recorte da versão fria (clip-path na
    //    2ª <picture>, lendo --aresta) cresce junto, passa pelo sol e pelos
    //    aparelhos, e a tela inteira gela. Continua o gesto da abertura, que
    //    trouxe o frio da borda esquerda até o texto. (Rodadas antigas: um
    //    painel escuro recuando pra esquerda — perdeu o propósito conforme o
    //    cliente pediu menos opacidade; e uma parada no vão do logo, reprovada.)
    // Começa em -2px (escondida na borda esquerda, a página abre toda quente)
    // e não mais no corte da coluna: o cliente quer a linha "do início".
    tl.fromTo(heroEl, { '--aresta': '-2px' }, { '--aresta': arestaFim, ease: 'none', duration: CENA }, 0);

    // O TRAÇO AMARELO, alinhado: centralizado na vertical no vão entre a
    // barra (onde a aresta começa) e o topo da manchete, com 32% desse vão.
    // Era 11% da altura a partir da barra — comprido, e terminava num ponto
    // sem relação com nada. Medido por offsetTop (ignora as animações de
    // entrada, que mexem em transform) e remedido a cada refresh (resize)
    // e quando as fontes carregam (a manchete muda de lugar com a fonte).
    var manchete = heroEl.querySelector('.manchete');
    function topoNoHero(el) {
      var y = 0;
      while (el && el !== heroEl) { y += el.offsetTop; el = el.offsetParent; }
      return y;
    }
    function alinhaTraco() {
      if (!arestaEl || !manchete) return;
      var vao = topoNoHero(manchete) - arestaEl.offsetTop;
      if (vao < 40) { heroEl.style.removeProperty('--traco-y'); heroEl.style.removeProperty('--traco-h'); return; }
      var h = Math.max(24, Math.min(80, Math.round(vao * .32)));
      heroEl.style.setProperty('--traco-h', h + 'px');
      heroEl.style.setProperty('--traco-y', Math.round((vao - h) / 2) + 'px');
    }
    alinhaTraco();
    ScrollTrigger.addEventListener('refresh', alinhaTraco);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alinhaTraco);

    // 2. A PAUSA. Sem zoom (reprovado como artificial no desktop — a foto
    //    fica realmente parada). Um trecho vazio segura a timeline em 1:
    //    sem ele a duração total seria CENA e o scrub espalharia a cena pelo
    //    palco inteiro, apagando a pausa.
    tl.to({}, { duration: 1 - CENA }, CENA);

    // ------------------------------------- MENU TRANSPARENTE SOBRE A FOTO
    // A barra fica transparente enquanto o hero está GRUDADO (a cena inteira)
    // e vira moldura preta no instante em que a cena acaba e o hero começa a
    // subir. Esperar a seção de serviços encostar (versão anterior) deixava a
    // linha da avaliação passar por baixo da barra transparente, em cima do
    // logo. E a sentinela antiga escurecia no primeiro pixel — cedo demais.
    var topo = document.querySelector('.topo');
    var stTopo = null;
    if (topo) {
      stTopo = ScrollTrigger.create({
        trigger: palco,
        start: 'bottom bottom',
        onEnter: function () { topo.classList.add('pos-hero'); },
        onLeaveBack: function () { topo.classList.remove('pos-hero'); }
      });
    }

    // ------------------------------------------ GARANTIA: o momento da página
    // A promessa dos 90 dias ganha a entrada coreografada: o "90 DIAS"
    // desliza, o título sobe logo depois, texto e botão por último. Tudo
    // amarrado ao scroll da entrada da seção (a seção em si continua
    // abrindo pela cortina de CSS).
    var garantia = document.querySelector('#garantia');
    var tlGarantia = null;
    if (garantia) {
      tlGarantia = gsap.timeline({
        scrollTrigger: { trigger: garantia, start: 'top 75%', end: 'top 15%', scrub: .6 }
      });
      tlGarantia
        .fromTo(garantia.querySelector('.fantasma'), { xPercent: -8, opacity: 0 }, { xPercent: 0, opacity: 1, ease: 'none', duration: 1 }, 0)
        .fromTo(garantia.querySelector('h2'), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'none', duration: .55 }, .2)
        .fromTo(garantia.querySelectorAll('.apoio, .btn'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', duration: .4, stagger: .12 }, .45);
    }

    // --------------------------------------- SERVIÇOS: o preço chega por último
    // A seção promete "preço dito antes". Os cards entram pelo reveal de
    // CSS; os preços sobem logo depois, um de cada vez — a promessa fecha
    // a leitura. Uma vez só, sem scrub: é informação, não cenário.
    var precos = document.querySelectorAll('.servico .preco');
    var twPrecos = null;
    if (precos.length) {
      twPrecos = gsap.fromTo(precos, { yPercent: 40, opacity: 0 }, {
        yPercent: 0, opacity: 1, duration: .5, ease: 'power3.out', stagger: .07,
        scrollTrigger: { trigger: '.servicos', start: 'top 88%', once: true }   // 88%: com 60% as linhas já estavam legíveis e ainda sem preço
      });
    }

    // Recálculo de posição EM PLENO SCROLL, com o hero pinado (fixed), foi
    // a causa real do "travado" no ultrawide: medido ao vivo, o `start`
    // saiu -305 (deveria ser ~95) depois de um refresh automático do GSAP
    // disparado por um load tardio de imagem/fonte. Forçar UM refresh
    // logo depois que tudo carrega evita que ele aconteça sozinho, tarde,
    // no meio do gesto do usuário.
    window.addEventListener('load', function () {
      ScrollTrigger.refresh();
    });

    return function () {
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
      if (lenis) lenis.destroy();
      ScrollTrigger.removeEventListener('refresh', alinhaTraco);
      gsap.set(heroEl, { clearProps: '--aresta,--veu,--sombra,--traco-y,--traco-h' });
      gsap.set(heroCol, { clearProps: 'opacity,transform' });
      gsap.set(fotos, { clearProps: 'transform,transformOrigin,opacity' });
      if (tlGarantia) {
        tlGarantia.scrollTrigger && tlGarantia.scrollTrigger.kill();
        tlGarantia.kill();
        gsap.set(garantia.querySelectorAll('.fantasma, h2, .apoio, .btn'), { clearProps: 'transform,opacity' });
      }
      if (twPrecos) {
        twPrecos.scrollTrigger && twPrecos.scrollTrigger.kill();
        twPrecos.kill();
        gsap.set(precos, { clearProps: 'transform,opacity' });
      }
      if (stTopo) { stTopo.kill(); topo.classList.remove('pos-hero'); }
      document.documentElement.classList.remove('gsap-hero-ativo');
    };
  });
})();
