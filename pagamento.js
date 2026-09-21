/* =====================================
   PAGAMENTO — Arte Club

   Usado pelas telas: agendamento e
   minhas-reservas.

   Precisa do qrcode.js carregado antes
   e do pagamento.css na página.

   >>> Edite só a parte CONFIGURAÇÃO <<<
===================================== */

(function () {

  "use strict";


  /* =====================================
     CONFIGURAÇÃO
  ===================================== */

  var CONFIG = {

    /*
      Valor de 1 dia de aluguel, em reais
      (exemplo: 350 ou 350.5).
      Com 0, os valores não aparecem e o
      PIX é gerado sem valor.
    */
    VALOR_DIARIA: 0,

    /* Porcentagem para confirmar a reserva */
    PERCENTUAL_ENTRADA: 50,

    /*
      Sua chave PIX: CPF/CNPJ (só números),
      e-mail, telefone (+5597999999999) ou
      chave aleatória.
    */
    CHAVE_PIX: "",

    /* Nome que aparece para quem paga (até 25 letras) */
    NOME_RECEBEDOR: "ARTE CLUB",

    /* Cidade do recebedor (até 15 letras) */
    CIDADE_RECEBEDOR: "CIDADE",

    /* Telefone / WhatsApp para dúvidas (só números, com DDD) */
    WHATSAPP: "97984402856"

  };


  /* =====================================
     UTILIDADES
  ===================================== */

  function formatarReais(valor) {

    return Number(valor || 0).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );

  }


  /* Valor da entrada (50%) a partir de um valor em reais */

  function valorEntrada(valor) {

    var numero =
      Number(valor) || 0;

    return Math.round(
      numero * CONFIG.PERCENTUAL_ENTRADA
    ) / 100;

  }


  function somenteNumeros(texto) {

    return String(texto || "").replace(/\D/g, "");

  }


  function telefoneFormatado() {

    var n =
      somenteNumeros(CONFIG.WHATSAPP);

    if (n.length === 11) {

      return "(" + n.slice(0, 2) + ") " +
        n.slice(2, 7) + "-" + n.slice(7);

    }

    if (n.length === 10) {

      return "(" + n.slice(0, 2) + ") " +
        n.slice(2, 6) + "-" + n.slice(6);

    }

    return n;

  }


  function linkWhatsApp(mensagem) {

    return "https://wa.me/55" +
      somenteNumeros(CONFIG.WHATSAPP) +
      (
        mensagem
          ? "?text=" + encodeURIComponent(mensagem)
          : ""
      );

  }


  function linkTelefone() {

    return "tel:+55" +
      somenteNumeros(CONFIG.WHATSAPP);

  }


  /* =====================================
     CÓDIGO PIX (copia e cola / QR Code)
  ===================================== */

  function campoEMV(id, valor) {

    return id +
      String(valor.length).padStart(2, "0") +
      valor;

  }


  /* CRC16-CCITT exigido pelo PIX */

  function crc16(texto) {

    var crc = 0xFFFF;

    for (var i = 0; i < texto.length; i++) {

      crc ^= texto.charCodeAt(i) << 8;

      for (var j = 0; j < 8; j++) {

        if (crc & 0x8000) {

          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;

        } else {

          crc = (crc << 1) & 0xFFFF;

        }

      }

    }

    return crc
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");

  }


  function limparTexto(texto, maximo) {

    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase()
      .slice(0, maximo);

  }


  /*
    Devolve o código "copia e cola".
    Se a chave PIX não estiver preenchida,
    devolve texto vazio.
  */

  function gerarCodigoPix(valor) {

    var chave =
      String(CONFIG.CHAVE_PIX || "").trim();

    if (!chave) {

      return "";

    }


    var nome =
      limparTexto(CONFIG.NOME_RECEBEDOR, 25) ||
      "RECEBEDOR";

    var cidade =
      limparTexto(CONFIG.CIDADE_RECEBEDOR, 15) ||
      "CIDADE";


    var conta =
      campoEMV("00", "br.gov.bcb.pix") +
      campoEMV("01", chave);


    var codigo =
      campoEMV("00", "01") +
      campoEMV("01", "11") +
      campoEMV("26", conta) +
      campoEMV("52", "0000") +
      campoEMV("53", "986");


    if (Number(valor) > 0) {

      codigo += campoEMV(
        "54",
        Number(valor).toFixed(2)
      );

    }


    codigo +=
      campoEMV("58", "BR") +
      campoEMV("59", nome) +
      campoEMV("60", cidade) +
      campoEMV("62", campoEMV("05", "***")) +
      "6304";


    return codigo + crc16(codigo);

  }


  function desenharQr(container, texto) {

    try {

      if (typeof qrcode !== "function") {

        throw new Error(
          "qrcode.js não foi carregado."
        );

      }

      var qr = qrcode(0, "M");

      qr.addData(texto);

      qr.make();

      container.innerHTML =
        qr.createSvgTag({
          cellSize: 4,
          margin: 0,
          scalable: true
        });

    } catch (erro) {

      console.error(erro);

      container.style.display = "none";

    }

  }


  function copiarTexto(campo, botao) {

    var rotuloOriginal =
      botao.textContent;

    function avisar(texto) {

      botao.textContent = texto;

      setTimeout(
        function () {
          botao.textContent = rotuloOriginal;
        },
        2500
      );

    }

    function copiarAntigo() {

      campo.focus();

      campo.select();

      if (document.execCommand("copy")) {

        avisar("Código copiado!");

      } else {

        avisar("Selecione e copie o código");

      }

    }


    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      navigator.clipboard
        .writeText(campo.value)
        .then(function () {
          avisar("Código copiado!");
        })
        .catch(copiarAntigo);

    } else {

      copiarAntigo();

    }

  }


  /* =====================================
     POPUP BASE
  ===================================== */

  function criarPopup(opcoes) {

    var fecharFora =
      !!(opcoes && opcoes.fecharAoClicarFora);

    var aoFechar =
      opcoes && opcoes.aoFechar;


    var fundo =
      document.createElement("div");

    fundo.className = "pg-fundo";


    var caixa =
      document.createElement("div");

    caixa.className = "pg-caixa";

    caixa.setAttribute("role", "dialog");

    caixa.setAttribute("aria-modal", "true");


    fundo.appendChild(caixa);


    function aoTeclar(evento) {

      if (evento.key === "Escape") {

        fechar();

      }

    }


    function fechar() {

      document.removeEventListener(
        "keydown",
        aoTeclar
      );

      if (fundo.parentNode) {

        fundo.parentNode.removeChild(fundo);

      }

      if (aoFechar) {

        aoFechar();

      }

    }


    if (fecharFora) {

      fundo.addEventListener(
        "click",
        function (evento) {

          if (evento.target === fundo) {

            fechar();

          }

        }
      );

      document.addEventListener(
        "keydown",
        aoTeclar
      );

    }


    document.body.appendChild(fundo);


    return {
      caixa: caixa,
      fechar: fechar
    };

  }


  /* =====================================
     POPUP 1: AVISO DOS 50%
     (aparece antes de salvar a reserva)

     Devolve uma Promise:
     true  = a pessoa quer continuar
     false = voltou
  ===================================== */

  function avisoEntrada(dados) {

    var entrada =
      (dados && dados.entrada) || 0;

    var dias =
      (dados && dados.dias) || 1;


    return new Promise(function (resolve) {

      var resolvido = false;

      function terminar(resposta) {

        if (!resolvido) {

          resolvido = true;

          resolve(resposta);

        }

      }


      var popup = criarPopup({

        fecharAoClicarFora: true,

        aoFechar: function () {
          terminar(false);
        }

      });


      var p =
        CONFIG.PERCENTUAL_ENTRADA;

      var valorTexto =
        entrada > 0
          ? " (<b>" + formatarReais(entrada) + "</b>)"
          : "";

      var parteDoValor =
        dias > 1
          ? "do valor total"
          : "do valor";


      popup.caixa.innerHTML =

        '<h2 class="pg-titulo">Antes de continuar</h2>' +

        '<div class="pg-destaque">' +
          "Para agendar, é preciso pagar <b>" + p +
          "% " + parteDoValor + "</b>" + valorTexto + "." +
        "</div>" +

        '<p class="pg-texto">' +
          "Sua reserva ficará <b>pendente</b> e " +
          "<b>não será agendada</b> até o pagamento de " + p + "%. " +
          "Quando o pagamento for confirmado, ela passa de " +
          "<b>Pendente</b> para <b>Confirmada</b>." +
        "</p>" +

        '<div class="pg-contato">' +
          "Dúvidas? Fale pelo número " +
          '<a href="' + linkTelefone() + '">' +
          telefoneFormatado() + "</a>" +
        "</div>" +

        '<button type="button" class="pg-btn" data-acao="continuar">' +
          "Entendi, continuar" +
        "</button>" +

        '<button type="button" class="pg-btn secundario" data-acao="voltar">' +
          "Voltar" +
        "</button>";


      popup.caixa
        .querySelector('[data-acao="continuar"]')
        .addEventListener(
          "click",
          function () {
            terminar(true);
            popup.fechar();
          }
        );


      popup.caixa
        .querySelector('[data-acao="voltar"]')
        .addEventListener(
          "click",
          function () {
            terminar(false);
            popup.fechar();
          }
        );

    });

  }


  /* =====================================
     POPUP 2: FORMAS DE PAGAMENTO

     opcoes:
       formas        ["pix"], ["dinheiro"]
                     ou ["pix", "dinheiro"]
       entrada       valor da entrada (50%)
       titulo        título do popup
       mensagem      texto abaixo do título
       rotuloFinal   texto do último botão
       aoFinalizar   função chamada ao clicar nele
       permitirFechar  se pode fechar clicando
                       fora ou com Esc
  ===================================== */

  function mostrarPagamento(opcoes) {

    var formas =
      opcoes.formas || ["pix", "dinheiro"];

    var entrada =
      opcoes.entrada || 0;

    var p =
      CONFIG.PERCENTUAL_ENTRADA;


    var popup = criarPopup({
      fecharAoClicarFora: !!opcoes.permitirFechar
    });


    var html =
      '<h2 class="pg-titulo">' +
      (opcoes.titulo || "Formas de pagamento") +
      "</h2>";


    if (opcoes.mensagem) {

      html +=
        '<p class="pg-texto">' +
        opcoes.mensagem +
        "</p>";

    }


    if (entrada > 0) {

      html +=
        '<div class="pg-destaque">' +
        "Entrada (" + p + "%): <b>" +
        formatarReais(entrada) +
        "</b></div>";

    }


    /* ----- PIX ----- */

    var temPix =
      formas.indexOf("pix") !== -1;

    var codigoPix =
      temPix
        ? gerarCodigoPix(entrada)
        : "";


    if (temPix) {

      html += '<div class="pg-secao"><h3>PIX</h3>';

      if (codigoPix) {

        html +=
          '<div class="pg-qr" data-qr></div>' +

          '<label class="pg-rotulo" for="pgCodigo">' +
            "PIX copia e cola" +
          "</label>" +

          '<textarea class="pg-codigo" id="pgCodigo" ' +
          'rows="4" readonly></textarea>' +

          '<button type="button" class="pg-btn" ' +
          'data-acao="copiar">Copiar código</button>' +

          '<p class="pg-texto pg-nota">' +
            "Abra o app do seu banco, escolha pagar com PIX e " +
            "leia o QR Code ou cole o código." +
          "</p>";

      } else {

        html +=
          '<p class="pg-texto">' +
            "O PIX ainda não está disponível pelo site. " +
            "Fale pelo número abaixo para receber os dados." +
          "</p>";

      }

      html += "</div>";

    }


    /* ----- DINHEIRO ----- */

    if (formas.indexOf("dinheiro") !== -1) {

      html +=
        '<div class="pg-secao"><h3>Dinheiro</h3>' +
        '<p class="pg-texto">' +
          "Combine a entrega dos " + p + "% pelo número abaixo. " +
          "Os outros " + (100 - p) +
          "% ficam para o dia do passeio." +
        "</p></div>";

    }


    /* ----- CONTATO ----- */

    html +=
      '<div class="pg-contato">' +
        "Mais informações pelo número " +
        '<a href="' + linkTelefone() + '">' +
        telefoneFormatado() + "</a>" +
      "</div>" +

      '<a class="pg-btn secundario" target="_blank" ' +
      'rel="noopener" href="' +
      linkWhatsApp(
        "Olá! Gostaria de informações sobre o pagamento da minha reserva no flutuante."
      ) +
      '">Falar no WhatsApp</a>' +

      '<button type="button" class="pg-btn" data-acao="final">' +
        (opcoes.rotuloFinal || "Fechar") +
      "</button>";


    popup.caixa.innerHTML = html;


    if (codigoPix) {

      popup.caixa.querySelector(
        "#pgCodigo"
      ).value = codigoPix;

      desenharQr(
        popup.caixa.querySelector("[data-qr]"),
        codigoPix
      );

      var botaoCopiar =
        popup.caixa.querySelector(
          '[data-acao="copiar"]'
        );

      botaoCopiar.addEventListener(
        "click",
        function () {

          copiarTexto(
            popup.caixa.querySelector("#pgCodigo"),
            botaoCopiar
          );

        }
      );

    }


    popup.caixa
      .querySelector('[data-acao="final"]')
      .addEventListener(
        "click",
        function () {

          popup.fechar();

          if (opcoes.aoFinalizar) {

            opcoes.aoFinalizar();

          }

        }
      );


    return popup;

  }


  /* =====================================
     O QUE AS TELAS PODEM USAR
  ===================================== */

  window.Pagamento = {

    config: CONFIG,

    formatarReais: formatarReais,

    valorEntrada: valorEntrada,

    telefoneFormatado: telefoneFormatado,

    linkWhatsApp: linkWhatsApp,

    linkTelefone: linkTelefone,

    gerarCodigoPix: gerarCodigoPix,

    crc16: crc16,

    avisoEntrada: avisoEntrada,

    mostrarPagamento: mostrarPagamento

  };

})();
