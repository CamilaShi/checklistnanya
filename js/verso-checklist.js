// ---------------------------------------------------------------
// "Verso do Checklist" — tabela de peças e serviços (Referência,
// Descrição do Produto, Qtde, Valor, Descrição do Serviço,
// Executante, Valor, Obs) + bloco de inspeção e técnico responsável,
// igual ao verso de papel do checklist. Usado nas telas Visualizar e
// Acompanhamento (a frente do checklist trava assim que é salva com
// as fotos — só esse verso continua editável até o usuário clicar em
// "Finalizar").
// ---------------------------------------------------------------

let versoChecklistIdOS = null;
let versoChecklistBloqueado = false;

// Mostra o botão "Verso do Checklist" (chamado junto com os botões
// de PDF, em prepararBotoesPdf).
function prepararBotaoVerso(idOS) {
  const botao = document.getElementById("botao-abrir-verso");
  if (!botao) return;

  if (!idOS) {
    botao.classList.add("oculto");
    botao.onclick = null;
    return;
  }

  botao.classList.remove("oculto");
  botao.onclick = function () {
    const secaoFrente = document.getElementById("secao-visualizacao");
    const secaoVerso = document.getElementById("secao-verso-checklist");
    if (!secaoVerso) return;
    if (secaoFrente) secaoFrente.classList.add("oculto");
    secaoVerso.classList.remove("oculto");
    window.scrollTo(0, 0);
    abrirVersoChecklist(idOS);
  };
}

// Seta "← Voltar para o Checklist" — volta pra tela da frente sem
// recarregar nada (os dados dela continuam preenchidos).
document.addEventListener("DOMContentLoaded", function () {
  const botaoVoltar = document.getElementById("botao-voltar-verso");
  if (botaoVoltar) {
    botaoVoltar.addEventListener("click", function () {
      const secaoFrente = document.getElementById("secao-visualizacao");
      const secaoVerso = document.getElementById("secao-verso-checklist");
      if (secaoVerso) secaoVerso.classList.add("oculto");
      if (secaoFrente) secaoFrente.classList.remove("oculto");
      window.scrollTo(0, 0);
    });
  }
});

async function abrirVersoChecklist(idOS) {
  const secao = document.getElementById("secao-verso-checklist");
  const mensagem = document.getElementById("mensagem-verso-checklist");
  if (!secao) return;

  versoChecklistIdOS = idOS;
  if (mensagem) { mensagem.textContent = "Carregando..."; mensagem.className = "mensagem-inline"; }
  secao.classList.remove("oculto");

  try {
    const resposta = await chamarApi({ acao: "obterVersoOS", id_os: idOS });
    if (!resposta.sucesso) {
      if (mensagem) { mensagem.textContent = resposta.mensagem || "Não foi possível abrir o verso."; mensagem.classList.add("erro"); }
      return;
    }
    if (mensagem) { mensagem.textContent = ""; }

    versoChecklistBloqueado = resposta.status === "Finalizado";

    const corpo = document.getElementById("corpo-tabela-verso");
    corpo.innerHTML = "";
    const itens = resposta.itens && resposta.itens.length ? resposta.itens : [{}];
    itens.forEach(function (item) { corpo.appendChild(criarLinhaVerso(item)); });
    recalcularTotaisVerso();

    document.getElementById("verso-inspecao").value = resposta.inspecao || "";
    document.getElementById("verso-tecnico").value = resposta.tecnico_responsavel || "";
    document.getElementById("verso-data").value = resposta.data_inspecao || "";

    const etiqueta = document.getElementById("status-verso-checklist");
    if (resposta.status === "Finalizado") {
      etiqueta.textContent = "Finalizado" + (resposta.usuario_finalizacao ? " por " + resposta.usuario_finalizacao : "") +
        (resposta.data_finalizacao ? " em " + resposta.data_finalizacao : "");
      etiqueta.classList.add("status-finalizado");
    } else {
      etiqueta.textContent = "Editável";
      etiqueta.classList.remove("status-finalizado");
    }

    aplicarBloqueioVerso(versoChecklistBloqueado);
  } catch (erro) {
    if (mensagem) { mensagem.textContent = "Não foi possível abrir o verso agora."; mensagem.classList.add("erro"); }
  }
}

function criarLinhaVerso(item) {
  const tr = document.createElement("tr");

  const camposAntesDoTotal = [
    { chave: "referencia", numerica: false },
    { chave: "descricao_produto", numerica: false },
    { chave: "qtde", numerica: true },
    { chave: "valor_produto", numerica: true },
  ];
  const camposDepoisDoTotal = [
    { chave: "descricao_servico", numerica: false },
    { chave: "executante", numerica: false },
    { chave: "valor_servico", numerica: true },
    { chave: "obs", numerica: false },
  ];

  function criarCampo(campo) {
    const td = document.createElement("td");
    if (campo.numerica) td.classList.add("col-numerica");
    const input = document.createElement("input");
    input.type = "text";
    input.dataset.campo = campo.chave;
    input.value = (item && item[campo.chave]) || "";
    input.disabled = versoChecklistBloqueado;
    if (campo.chave === "valor_produto" || campo.chave === "valor_servico" || campo.chave === "qtde") {
      input.addEventListener("input", function () {
        atualizarTotalLinhaVerso(tr);
        recalcularTotaisVerso();
      });
    }
    td.appendChild(input);
    tr.appendChild(td);
  }

  camposAntesDoTotal.forEach(criarCampo);

  // Total da linha (Qtde × Valor do produto) — só leitura, calculado
  // sozinho conforme a Qtde e o Valor são preenchidos.
  const tdTotal = document.createElement("td");
  tdTotal.className = "col-numerica col-total-linha";
  const spanTotal = document.createElement("span");
  spanTotal.className = "total-linha-verso";
  spanTotal.textContent = "R$ 0,00";
  tdTotal.appendChild(spanTotal);
  tr.appendChild(tdTotal);

  camposDepoisDoTotal.forEach(criarCampo);

  const tdRemover = document.createElement("td");
  tdRemover.className = "col-remover";
  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.className = "botao-remover-linha-verso";
  botaoRemover.textContent = "✕";
  botaoRemover.title = "Remover linha";
  botaoRemover.disabled = versoChecklistBloqueado;
  botaoRemover.addEventListener("click", function () {
    tr.remove();
    recalcularTotaisVerso();
  });
  tdRemover.appendChild(botaoRemover);
  tr.appendChild(tdRemover);

  atualizarTotalLinhaVerso(tr);

  return tr;
}

// Recalcula e mostra o total dessa linha (Qtde × Valor do produto).
function atualizarTotalLinhaVerso(tr) {
  const spanTotal = tr.querySelector(".total-linha-verso");
  if (!spanTotal) return;
  const inputQtde = tr.querySelector('input[data-campo="qtde"]');
  const inputProduto = tr.querySelector('input[data-campo="valor_produto"]');
  if (!inputProduto || !inputProduto.value.trim()) {
    spanTotal.textContent = "R$ 0,00";
    return;
  }
  const qtde = inputQtde ? converterQtdeVerso(inputQtde.value) : 1;
  spanTotal.textContent = formatarMoedaVerso(qtde * converterValorMoedaVerso(inputProduto.value));
}

// Aceita "1.234,56", "1234,56" ou "1234.56" e devolve número.
function converterValorMoedaVerso(texto) {
  if (!texto) return 0;
  let limpo = String(texto).trim().replace(/[^0-9.,]/g, "");
  if (limpo.indexOf(",") !== -1 && limpo.indexOf(".") !== -1) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.indexOf(",") !== -1) {
    limpo = limpo.replace(",", ".");
  }
  const numero = parseFloat(limpo);
  return isNaN(numero) ? 0 : numero;
}

function formatarMoedaVerso(numero) {
  return "R$ " + numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Qtde vazia conta como 1 (uma unidade) — assim uma linha só com
// Valor preenchido, sem quantidade, ainda entra certo no total.
function converterQtdeVerso(texto) {
  if (!texto || !String(texto).trim()) return 1;
  const numero = converterValorMoedaVerso(texto);
  return numero > 0 ? numero : 1;
}

// O Valor do Produto é o valor unitário digitado — o total dessa
// coluna é sempre Qtde × Valor, calculado automaticamente linha por
// linha. O Valor do Serviço não tem coluna de quantidade própria, então
// entra direto no total dele.
function recalcularTotaisVerso() {
  let totalProduto = 0;
  let totalServico = 0;
  document.querySelectorAll("#corpo-tabela-verso tr").forEach(function (tr) {
    const inputQtde = tr.querySelector('input[data-campo="qtde"]');
    const inputProduto = tr.querySelector('input[data-campo="valor_produto"]');
    const inputServico = tr.querySelector('input[data-campo="valor_servico"]');
    if (inputProduto && inputProduto.value.trim()) {
      const qtde = inputQtde ? converterQtdeVerso(inputQtde.value) : 1;
      totalProduto += qtde * converterValorMoedaVerso(inputProduto.value);
    }
    if (inputServico) totalServico += converterValorMoedaVerso(inputServico.value);
  });
  const elProduto = document.getElementById("total-valor-produto");
  const elServico = document.getElementById("total-valor-servico");
  if (elProduto) elProduto.textContent = formatarMoedaVerso(totalProduto);
  if (elServico) elServico.textContent = formatarMoedaVerso(totalServico);
}

function coletarItensVerso() {
  const itens = [];
  document.querySelectorAll("#corpo-tabela-verso tr").forEach(function (tr) {
    const item = {};
    let temAlgumValor = false;
    tr.querySelectorAll("input[data-campo]").forEach(function (input) {
      item[input.dataset.campo] = input.value;
      if (input.value.trim()) temAlgumValor = true;
    });
    if (temAlgumValor) itens.push(item);
  });
  return itens;
}

function aplicarBloqueioVerso(bloqueado) {
  versoChecklistBloqueado = bloqueado;
  document.querySelectorAll("#corpo-tabela-verso input, #corpo-tabela-verso .botao-remover-linha-verso").forEach(function (el) {
    el.disabled = bloqueado;
  });
  ["verso-inspecao", "verso-tecnico", "verso-data"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.disabled = bloqueado;
  });
  const botaoAdicionar = document.getElementById("botao-adicionar-linha-verso");
  const botaoSalvar = document.getElementById("botao-salvar-verso");
  const botaoFinalizar = document.getElementById("botao-finalizar-verso");
  if (botaoAdicionar) botaoAdicionar.classList.toggle("oculto", bloqueado);
  if (botaoSalvar) botaoSalvar.classList.toggle("oculto", bloqueado);
  if (botaoFinalizar) botaoFinalizar.classList.toggle("oculto", bloqueado);
}

document.addEventListener("DOMContentLoaded", function () {
  const botaoAdicionar = document.getElementById("botao-adicionar-linha-verso");
  if (botaoAdicionar) {
    botaoAdicionar.addEventListener("click", function () {
      document.getElementById("corpo-tabela-verso").appendChild(criarLinhaVerso({}));
    });
  }

  const botaoSalvar = document.getElementById("botao-salvar-verso");
  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", async function () {
      if (!versoChecklistIdOS) return;
      const mensagem = document.getElementById("mensagem-verso-checklist");
      botaoSalvar.disabled = true;
      botaoSalvar.textContent = "Salvando...";
      try {
        const resposta = await chamarApi({
          acao: "salvarVersoOS",
          id_os: versoChecklistIdOS,
          itens: coletarItensVerso(),
          inspecao: document.getElementById("verso-inspecao").value,
          tecnico_responsavel: document.getElementById("verso-tecnico").value,
          data_inspecao: document.getElementById("verso-data").value,
        });
        if (mensagem) {
          mensagem.className = "mensagem-inline";
          if (resposta.sucesso) {
            mensagem.textContent = "Verso salvo. Gerando o PDF...";
            mensagem.classList.add("sucesso");
          } else {
            mensagem.textContent = resposta.mensagem || "Erro ao salvar.";
            mensagem.classList.add("erro");
          }
        }

        // Regera o PDF sozinho a cada "Salvar" também — assim o PDF no
        // Drive sempre reflete o que já foi lançado no verso, mesmo
        // antes de finalizar.
        if (resposta.sucesso && typeof regenerarPdfComVerso === "function") {
          const respostaPdf = await regenerarPdfComVerso(versoChecklistIdOS);
          if (mensagem) {
            mensagem.textContent = respostaPdf && respostaPdf.sucesso
              ? "Verso salvo e PDF atualizado."
              : "Verso salvo, mas não foi possível atualizar o PDF agora.";
          }
        }
      } catch (erro) {
        if (mensagem) { mensagem.textContent = "Não foi possível salvar agora."; mensagem.classList.add("erro"); }
      } finally {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar";
      }
    });
  }

  const botaoFinalizar = document.getElementById("botao-finalizar-verso");
  if (botaoFinalizar) {
    botaoFinalizar.addEventListener("click", async function () {
      if (!versoChecklistIdOS) return;
      if (!window.confirm("Finalizar o verso? Depois de finalizado não dá mais pra editar.")) return;
      const mensagem = document.getElementById("mensagem-verso-checklist");
      botaoFinalizar.disabled = true;
      botaoFinalizar.textContent = "Finalizando...";
      try {
        const resposta = await chamarApi({
          acao: "finalizarVersoOS",
          id_os: versoChecklistIdOS,
          itens: coletarItensVerso(),
          inspecao: document.getElementById("verso-inspecao").value,
          tecnico_responsavel: document.getElementById("verso-tecnico").value,
          data_inspecao: document.getElementById("verso-data").value,
        });
        if (resposta.sucesso) {
          const etiqueta = document.getElementById("status-verso-checklist");
          etiqueta.textContent = "Finalizado";
          etiqueta.classList.add("status-finalizado");
          aplicarBloqueioVerso(true);
          if (mensagem) { mensagem.textContent = "Verso finalizado. Gerando o PDF..."; mensagem.className = "mensagem-inline sucesso"; }

          // Regera o PDF sozinho, já com a página do verso — sem isso
          // o PDF salvo no Drive ficaria só com a página 1 pra sempre,
          // já que não tem mais um botão manual de "gerar de novo".
          if (typeof regenerarPdfComVerso === "function") {
            const respostaPdf = await regenerarPdfComVerso(versoChecklistIdOS);
            if (mensagem) {
              if (respostaPdf && respostaPdf.sucesso) {
                mensagem.textContent = "Verso finalizado e PDF atualizado.";
              } else {
                mensagem.textContent = "Verso finalizado, mas não foi possível atualizar o PDF agora.";
              }
            }
          }
        } else if (mensagem) {
          mensagem.textContent = resposta.mensagem || "Erro ao finalizar.";
          mensagem.className = "mensagem-inline erro";
        }
      } catch (erro) {
        if (mensagem) { mensagem.textContent = "Não foi possível finalizar agora."; mensagem.className = "mensagem-inline erro"; }
      } finally {
        botaoFinalizar.disabled = false;
        botaoFinalizar.textContent = "Finalizar";
      }
    });
  }
});
