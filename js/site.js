/* Script compartilhado pelos três presets. Sem dependência nenhuma.

   A revelação ao rolar NÃO mora aqui — é CSS declarativo (ver nucleo.css).
   JavaScript não esconde nada nestes sites: se este arquivo não carregar,
   a página continua inteira e legível, só perde o contador e o comparador.

   Aqui ficam só: menu, contador, comparador e estado da barra.
   `python sincronizar.py` propaga pros três. */

(function () {
  'use strict';

  var menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- menu -- */

  var botao = document.querySelector('[data-menu-botao]');
  var menu = document.querySelector('[data-menu]');

  if (botao && menu) {
    var alternar = function (abrir) {
      menu.classList.toggle('aberto', abrir);
      botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    };
    botao.addEventListener('click', function () {
      alternar(!menu.classList.contains('aberto'));
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) alternar(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') alternar(false); });
  }

  /* -------------------------------------------------------- contador --

     [data-conta="4,9"] conta até o número quando entra na tela.
     Respeita vírgula decimal e sufixo (ex.: "90" + "dias").            */

  var contadores = document.querySelectorAll('[data-conta]');

  var contar = function (el) {
    var alvo = el.getAttribute('data-conta');
    var casas = (alvo.split(',')[1] || '').length;
    var fim = parseFloat(alvo.replace(',', '.'));
    var dur = 1100;
    var inicio = null;

    var passo = function (t) {
      if (inicio === null) inicio = t;
      var p = Math.min((t - inicio) / dur, 1);
      var suave = 1 - Math.pow(1 - p, 3);            // easeOutCubic
      el.textContent = (fim * suave).toFixed(casas).replace('.', ',');
      if (p < 1) requestAnimationFrame(passo);
    };

    requestAnimationFrame(passo);
  };

  // O HTML já traz o número final escrito. Só zeramos no instante em que a
  // contagem vai mesmo rodar — assim aba oculta, JS quebrado ou pedido de
  // menos movimento mostram o valor certo em vez de um "0" parado.
  if (contadores.length && !menosMovimento && 'IntersectionObserver' in window) {
    var olhoNum = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        olhoNum.unobserve(e.target);
        if (document.hidden) return;          // aba de fundo: deixa o valor final
        e.target.textContent = '0';
        contar(e.target);
      });
    }, { threshold: 0.6 });
    contadores.forEach(function (el) { olhoNum.observe(el); });
  }

  /* ------------------------------------------------------ comparador -- */

  document.querySelectorAll('[data-comparar]').forEach(function (caixa) {
    var mover = function (clientX) {
      var r = caixa.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      caixa.style.setProperty('--corte', Math.max(0, Math.min(100, p)) + '%');
    };

    var arrastando = false;

    caixa.addEventListener('pointerdown', function (e) {
      arrastando = true;
      caixa.setPointerCapture(e.pointerId);
      mover(e.clientX);
    });
    caixa.addEventListener('pointermove', function (e) { if (arrastando) mover(e.clientX); });
    caixa.addEventListener('pointerup', function () { arrastando = false; });
    caixa.addEventListener('pointercancel', function () { arrastando = false; });

    // Teclado: seta move de 5 em 5.
    caixa.setAttribute('tabindex', '0');
    caixa.setAttribute('role', 'slider');
    caixa.setAttribute('aria-label', 'Comparar antes e depois');
    caixa.setAttribute('aria-valuemin', '0');
    caixa.setAttribute('aria-valuemax', '100');
    caixa.setAttribute('aria-valuenow', '50');

    caixa.addEventListener('keydown', function (e) {
      var passo = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0;
      if (!passo) return;
      e.preventDefault();
      var atual = parseFloat(caixa.style.getPropertyValue('--corte')) || 50;
      var novo = Math.max(0, Math.min(100, atual + passo));
      caixa.style.setProperty('--corte', novo + '%');
      caixa.setAttribute('aria-valuenow', Math.round(novo));
    });
  });

  /* ------------------------------------------------- nav ao rolar -----

     Uma sentinela invisível no topo troca o estado da barra. Sem ouvir
     evento de scroll: o observador não roda em toda rolagem.           */

  var sentinela = document.querySelector('[data-sentinela]');
  var barra = document.querySelector('[data-barra]');

  if (sentinela && barra && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      barra.classList.toggle('rolado', !e[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinela);
  }


  /* ------------------------------------------------------ aberto agora --

     [data-agora] escreve "Aberto agora · fecha às 18h" ou "Fechado agora · abre
     amanhã às 8h" (o estado vai num <b>), pelo relógio do FUSO da empresa (não do visitante), e
     marca na tabela a linha do dia de hoje ([data-dias="1,2,3"], 0=domingo).
     data-horario: {"1":["08:00","18:00"], ..., "0":["00:00","22:00","emergência"]}
     — o terceiro item é um rótulo pra dia fora do horário normal.
     Sem JS (ou JSON inválido) o elemento continua `hidden`: a tabela já diz tudo. */

  var agora = document.querySelector('[data-agora]');
  if (agora && window.Intl) {
    try {
      var horario = JSON.parse(agora.getAttribute('data-horario'));
      var partes = new Intl.DateTimeFormat('en-US', {
        timeZone: agora.getAttribute('data-fuso') || undefined,
        weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      var parte = function (tipo) {
        for (var i = 0; i < partes.length; i++) if (partes[i].type === tipo) return partes[i].value;
      };
      var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parte('weekday'));
      var minuto = (+parte('hour') % 24) * 60 + (+parte('minute'));
      var emMin = function (hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; };
      var hora = function (hhmm) { var p = hhmm.split(':'); return (+p[0]) + 'h' + (p[1] === '00' ? '' : p[1]); };
      var nomes = ['no domingo', 'na segunda', 'na terça', 'na quarta', 'na quinta', 'na sexta', 'no sábado'];

      // Duas partes: o ESTADO (destacado no CSS) e o detalhe.
      var hoje = horario[dia], estado = '', detalhe = '', aberto = false;
      if (hoje && minuto >= emMin(hoje[0]) && minuto < emMin(hoje[1])) {
        aberto = true;
        if (hoje[2]) { estado = 'Hoje só ' + hoje[2]; detalhe = 'até ' + hora(hoje[1]); }
        else         { estado = 'Aberto agora';        detalhe = 'fecha às ' + hora(hoje[1]); }
      } else {
        for (var d = 0; d < 8; d++) {
          var idx = (dia + d) % 7, h = horario[idx];
          if (!h || h[2]) continue;                       // pula dia sem horário normal
          if (d === 0 && minuto >= emMin(h[0])) continue; // hoje já passou
          estado = 'Fechado agora';
          detalhe = 'abre ' + (d === 0 ? '' : d === 1 ? 'amanhã ' : nomes[idx] + ' ') + 'às ' + hora(h[0]);
          break;
        }
      }
      if (dia >= 0 && estado) {
        var b = document.createElement('b');
        b.textContent = estado;
        agora.textContent = '';
        agora.appendChild(b);
        // O detalhe num <span> próprio (o " · " vem do CSS): assim o layout
        // pode pôr estado e detalhe em linhas diferentes sem refazer o texto.
        var det = document.createElement('span');
        det.className = 'agora-detalhe';
        det.textContent = detalhe;
        agora.appendChild(det);
        agora.classList.toggle('aberto', aberto);
        agora.hidden = false;
        document.querySelectorAll('[data-dias]').forEach(function (linha) {
          if (linha.getAttribute('data-dias').split(',').indexOf(String(dia)) >= 0) linha.classList.add('hoje-linha');
        });
      }
    } catch (e) { /* horário mal escrito: fica escondido, a tabela segue valendo */ }
  }


  /* ------------------------------------------------ farol e magnetismo --

     Dois efeitos de ponteiro. Ambos só existem onde há mouse de verdade
     e só escrevem variáveis CSS de transform — nada de layout, nada de
     conteúdo dependendo deles. Se este trecho não rodar, some o brilho
     e o site continua igual.                                           */

  var temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (temMouse && !menosMovimento) {

    var farol = document.querySelector('[data-farol]');
    var heroEl = farol && farol.closest('.hero');

    if (heroEl) {
      var pendente = false, ultimoX = 0, ultimoY = 0;
      heroEl.addEventListener('pointermove', function (e) {
        var r = heroEl.getBoundingClientRect();
        ultimoX = e.clientX - r.left;
        ultimoY = e.clientY - r.top;
        if (pendente) return;
        pendente = true;
        requestAnimationFrame(function () {
          farol.style.setProperty('--fx', ultimoX + 'px');
          farol.style.setProperty('--fy', ultimoY + 'px');
          pendente = false;
        });
      });
    }

    document.querySelectorAll('[data-ima]').forEach(function (botao) {
      var solta = function () {
        botao.style.setProperty('--ix', '0px');
        botao.style.setProperty('--iy', '0px');
      };
      botao.addEventListener('pointermove', function (e) {
        var r = botao.getBoundingClientRect();
        // Deslocamento de no máximo 18% do tamanho do botão.
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        botao.style.setProperty('--ix', dx.toFixed(1) + 'px');
        botao.style.setProperty('--iy', dy.toFixed(1) + 'px');
      });
      botao.addEventListener('pointerleave', solta);
      botao.addEventListener('blur', solta);
    });
  }


  /* ------------------------------------------------- filtro de lista --

     Genérico: um <input data-filtro="#lista" data-resposta="#saida">
     destaca os itens que casam e escreve uma frase em português.
     Usado na cobertura de bairros; serve para convênios, serviços, etc.

     Se este trecho não rodar, a lista continua inteira e legível — o
     campo vira só um input inerte.                                     */

  var semAcento = function (t) {
    return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  };

  document.querySelectorAll('[data-filtro]').forEach(function (campo) {
    var lista = document.querySelector(campo.getAttribute('data-filtro'));
    var saida = document.querySelector(campo.getAttribute('data-resposta'));
    if (!lista) return;

    var itens = [].slice.call(lista.children);

    campo.addEventListener('input', function () {
      var q = semAcento(campo.value);
      var achados = [];

      itens.forEach(function (li) {
        var bate = q && semAcento(li.textContent).indexOf(q) !== -1;
        li.classList.toggle('fora', !!q && !bate);
        li.classList.toggle('achou', !!bate);
        if (bate) achados.push(li);
      });

      if (!saida) return;

      if (!q) { saida.textContent = ''; saida.className = 'resposta'; return; }

      if (!achados.length) {
        saida.textContent = 'Não achei esse bairro na lista. Chama a Rcold no WhatsApp que a equipe confirma.';
        saida.className = 'resposta nao';
        return;
      }

      var primeiro = achados[0];
      var nome = primeiro.textContent.trim();
      var hoje = primeiro.getAttribute('data-prazo') === 'hoje';

      saida.textContent = nome + ' está na lista. Chama a Rcold no WhatsApp pra combinar o atendimento.';
      saida.className = 'resposta sim';
    });
  });


  /* ---------------------------------------------- calculadora de BTU --

     A conta que o técnico faria na visita, feita na hora:
       base    = area x 600 (sem sol) ou x 800 (pega sol)
       pessoas = 600 por pessoa além da primeira
     e arredonda para cima até o tamanho comercial mais próximo.

     O HTML já vem com um resultado válido escrito. Se este trecho não
     rodar, a pessoa vê um exemplo correto e o botão continua levando
     para o WhatsApp — nada quebra, só para de recalcular.              */

  var COMERCIAIS = [7000, 9000, 12000, 18000, 22000, 24000, 30000];

  document.querySelectorAll('[data-calc]').forEach(function (calc) {
    var campos = {
      area: calc.querySelector('[data-btu="area"]'),
      pessoas: calc.querySelector('[data-btu="pessoas"]')
    };
    var saidas = {};
    calc.querySelectorAll('[data-saida]').forEach(function (el) {
      saidas[el.getAttribute('data-saida')] = el;
    });
    if (!campos.area || !saidas.btu) return;

    var pontos = function (n) { return n.toLocaleString('pt-BR'); };

    // O medidor le o MESMO valor comercial escrito no numero grande — nao
    // a conta bruta continua. Foi bruta antes (fazia o ponteiro deslizar
    // suave a cada passo do slider) e ficou errado na pratica: o numero
    // dizia "30.000" e o ponteiro parava antes da marca dos 30k, porque a
    // conta bruta que sobra pra baixo do arredondamento comercial nao
    // bate com o tamanho que a pessoa realmente vai comprar. Numero e
    // ponteiro tem que concordar sempre — isso importa mais que o
    // ponteiro deslizar suave.
    var medidor = calc.parentElement.querySelector('[data-medidor]');
    var MEDIDOR_MIN = 7000, MEDIDOR_MAX = 32000;   // 32k = fim visual da escala; acima disso e "dois aparelhos"

    var recalcular = function () {
      var area = +campos.area.value;
      // A versao compacta do hero nao tem o campo de pessoas: assume 2,
      // que e a ocupacao tipica de quarto e sala. Sem esta guarda o
      // componente quebrava ao ser reusado com menos campos.
      var pessoas = campos.pessoas ? +campos.pessoas.value : 2;
      var sol = calc.querySelector('[data-btu="sol"]:checked');
      var pegaSol = sol && sol.value === 'sim';

      var bruto = area * (pegaSol ? 800 : 600) + (pessoas - 1) * 600;

      var escolhido = COMERCIAIS[COMERCIAIS.length - 1];
      var doisAparelhos = true;
      for (var i = 0; i < COMERCIAIS.length; i++) {
        if (COMERCIAIS[i] >= bruto) { escolhido = COMERCIAIS[i]; doisAparelhos = false; break; }
      }

      if (medidor) {
        // Base MEDIDOR_MAX (32k) pro estouro de "dois aparelhos" — nesse
        // caso escolhido fica em 30k (o maior comercial) mas o ponteiro
        // deve ir até o fim da régua, nao parar na marca dos 30k.
        var pct = ((doisAparelhos ? MEDIDOR_MAX : escolhido) - MEDIDOR_MIN) / (MEDIDOR_MAX - MEDIDOR_MIN);
        pct = Math.max(0, Math.min(1, pct));
        medidor.style.setProperty('--pct', pct.toFixed(3));
        medidor.toggleAttribute('data-estourou', doisAparelhos);
      }

      if (saidas.area) saidas.area.textContent = area + ' m²';
      if (saidas.pessoas) saidas.pessoas.textContent = pessoas + (pessoas === 1 ? ' pessoa' : ' pessoas');

      var alvo = saidas.btu;
      if (alvo.textContent !== pontos(escolhido)) {
        alvo.textContent = pontos(escolhido);
        alvo.classList.remove('mudou');
        void alvo.offsetWidth;                 // reinicia a animação
        alvo.classList.add('mudou');
      }

      if (saidas.nota) {
        saidas.nota.textContent = doisAparelhos
          ? 'Acima de 30.000 BTUs compensa dividir em dois aparelhos. Vale conversar antes de comprar.'
          : 'Um ' + pontos(escolhido) + ' dá conta de ' + area + ' m²'
            + (pegaSol ? ' pegando sol' : ' sem sol') + ', com '
            + pessoas + (pessoas === 1 ? ' pessoa' : ' pessoas') + '.';
      }

      if (saidas.cta) {
        var msg = doisAparelhos
          ? 'Olá! Meu cômodo tem ' + area + ' m² e a conta deu acima de 30.000 BTUs. Podem me orientar?'
          : 'Olá! Quero orçamento de um ' + pontos(escolhido) + ' BTUs para um cômodo de ' + area + ' m².';
        // Número lido do próprio link no HTML: trocar o WhatsApp do cliente só no HTML basta.
        saidas.cta.href = saidas.cta.getAttribute('href').split('?')[0] + '?text=' + encodeURIComponent(msg);
        saidas.cta.textContent = doisAparelhos
          ? 'Falar com um técnico'
          : 'Quero orçamento de um ' + pontos(escolhido);
      }
    };

    calc.addEventListener('input', recalcular);
    calc.addEventListener('change', recalcular);
    recalcular();
  });

  /* ------------------------------------- botão fixo recolhe perto do CTA */

  var zap = document.querySelector('.zap');
  var alvos = document.querySelectorAll('[data-esconde-zap]');

  if (zap && alvos.length && 'IntersectionObserver' in window) {
    // Conjunto, não contador: a primeira leitura do observer entrega TODOS
    // os alvos, inclusive os fora da tela, e o contador descontava esses —
    // ficava negativo e o botão nunca recolhia.
    var naTela = new Set();
    var olhoZap = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) naTela.add(e.target); else naTela.delete(e.target);
      });
      zap.classList.toggle('recolhido', naTela.size > 0);
    }, { threshold: 0.3 });
    alvos.forEach(function (a) { olhoZap.observe(a); });
  }

})();
