// ---------------------------------------------------------------
// Lixeira de Check Lists excluídos — mostra os que foram excluídos
// nos últimos 7 dias (aba OS_Excluidas) e permite restaurar. Só
// aparece pra quem pode excluir (mesma checagem de
// podeExcluirChecklist, em visualizacao-checklist.js).
// ---------------------------------------------------------------

function configurarExcluidos() {
  const botaoMenu = document.getElementById("menu-excluidos");
  if (!botaoMenu) return;

  if (typeof podeExcluirChecklist !== "function" || !podeExcluirChecklist()) {
    botaoMenu.classList.add("oculto");
    return;
  }
  botaoMenu.classList.remove("oculto");

  botaoMenu.addEventListener("click", function () {
    abrirSecaoExcluidos();
  });

  const botaoVoltar = document.getElementById("botao-voltar-excluidos");
  if (botaoVoltar) {
    botaoVoltar.addEventListener("click", function () {
      document.getElementById("secao-excluidos").classList.add("oculto");
      document.getElementById("secao-quadro").classList.remove("oculto");
    });
  }
}

function abrirSecaoExcluidos() {
  const secaoQuadro = document.getElementById("secao-quadro");
  const secaoVisualizacao = document.getElementById("secao-visualizacao");
  if (secaoQuadro) secaoQuadro.classList.add("oculto");
  if (secaoVisualizacao) secaoVisualizacao.classList.add("oculto");
  document.getElementById("secao-excluidos").classList.remove("oculto");
  window.scrollTo(0, 0);
  carregarExcluidos();
}

async function carregarExcluidos() {
  const container = document.getElementById("lista-excluidos");
  if (!container) return;
  container.innerHTML = '<p class="aviso">Carregando...</p>';

  try {
    const resposta = await chamarApi({ acao: "listarOSExcluidos" });
    if (!resposta.sucesso) {
      container.innerHTML = '<p class="aviso">' + (resposta.mensagem || "Não foi possível carregar a lixeira.") + "</p>";
      return;
    }
    renderizarExcluidos(resposta.excluidos || []);
  } catch (erro) {
    container.innerHTML = '<p class="aviso">Não foi possível carregar a lixeira agora.</p>';
  }
}

function renderizarExcluidos(excluidos) {
  const container = document.getElementById("lista-excluidos");
  if (!excluidos.length) {
    container.innerHTML = '<p class="aviso">Nenhum Check List excluído no momento.</p>';
    return;
  }

  const tabela = document.createElement("table");
  tabela.className = "tabela-excluidos";
  tabela.innerHTML =
    "<thead><tr>" +
    "<th>OS</th><th>Cliente</th><th>Veículo</th><th>Excluído em</th><th>Por</th><th>Prazo</th><th></th>" +
    "</tr></thead>";

  const corpo = document.createElement("tbody");
  excluidos.forEach(function (item) {
    const linha = document.createElement("tr");

    const urgente = item.dias_restantes <= 2;
    const textoPrazo = item.dias_restantes <= 0
      ? "Apagando hoje"
      : item.dias_restantes === 1
      ? "1 dia restante"
      : item.dias_restantes + " dias restantes";

    linha.innerHTML =
      "<td>" + item.id_os + "</td>" +
      "<td>" + item.cliente_nome + "</td>" +
      "<td>" + [item.veiculo_placa, item.veiculo_texto].filter(Boolean).join(" — ") + "</td>" +
      "<td>" + item.data_exclusao + "</td>" +
      "<td>" + (item.excluido_por || "") + "</td>" +
      '<td><span class="selo-dias-restantes' + (urgente ? " selo-urgente" : "") + '">' + textoPrazo + "</span></td>";

    const celulaAcao = document.createElement("td");
    const botaoRestaurar = document.createElement("button");
    botaoRestaurar.type = "button";
    botaoRestaurar.className = "botao-secundario";
    botaoRestaurar.textContent = "Restaurar";
    botaoRestaurar.addEventListener("click", function () {
      restaurarComConfirmacao(item.id_os, linha);
    });
    celulaAcao.appendChild(botaoRestaurar);
    linha.appendChild(celulaAcao);

    corpo.appendChild(linha);
  });
  tabela.appendChild(corpo);

  container.innerHTML = "";
  container.appendChild(tabela);
}

async function restaurarComConfirmacao(idOS, linhaElemento) {
  if (!window.confirm("Restaurar o Check List da OS " + idOS + "? Ele volta pro quadro, no status em que estava antes de ser excluído.")) {
    return;
  }

  try {
    const resposta = await chamarApi({ acao: "restaurarChecklist", id_os: idOS });
    if (!resposta.sucesso) {
      window.alert(resposta.mensagem || "Não foi possível restaurar esse Check List.");
      return;
    }
    if (linhaElemento) linhaElemento.remove();
    // Atualiza o quadro por trás pra já mostrar o card de volta
    // quando a pessoa clicar em "Voltar pra lista".
    if (typeof configurarQuadro === "function") configurarQuadro();

    const container = document.getElementById("lista-excluidos");
    if (container && !container.querySelector("tbody tr")) {
      container.innerHTML = '<p class="aviso">Nenhum Check List excluído no momento.</p>';
    }
  } catch (erro) {
    window.alert("Não foi possível restaurar agora.");
  }
}

document.addEventListener("DOMContentLoaded", configurarExcluidos);
