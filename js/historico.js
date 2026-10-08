const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;

  if (usuario.perfil !== "Admin" && usuario.perfil !== "Coordenador") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
    const itemDashboard = document.getElementById("menu-dashboard");
    if (itemDashboard) itemDashboard.style.display = "none";
  }

  prepararFiltroAnoPeriodo();
  carregarDropdownClientesHistorico();
  carregarDropdownPlacasHistorico();
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

// Guarda o último filtro buscado (placa ou cliente), pra o botão
// "Salvar em PDF" saber o que gerar sem precisar
// buscar tudo de novo.
let ultimoFiltroHistorico = null;

// Monta a faixa de "badges" com a contagem por status (ex: "Aprovado: 3").
function faixaStatus(contagemStatus) {
  if (!contagemStatus || Object.keys(contagemStatus).length === 0) return "";
  return Object.keys(contagemStatus).map(function (status) {
    return '<span class="badge-status-historico">' + status + ": " + contagemStatus[status] + "</span>";
  }).join("");
}


// Dropdown "Ano" da busca por período: ano atual + 4 anos pra trás.
function prepararFiltroAnoPeriodo() {
  const select = document.getElementById("historico-ano");
  const anoAtual = new Date().getFullYear();
  for (let ano = anoAtual; ano >= anoAtual - 4; ano--) {
    const opcao = document.createElement("option");
    opcao.value = ano;
    opcao.textContent = ano;
    select.appendChild(opcao);
  }
}

// Ano e datas não se misturam: escolher um limpa o outro.
document.getElementById("historico-ano").addEventListener("change", function () {
  if (this.value) {
    document.getElementById("historico-data-inicial").value = "";
    document.getElementById("historico-data-final").value = "";
  }
});
["historico-data-inicial", "historico-data-final"].forEach(function (id) {
  document.getElementById(id).addEventListener("change", function () {
    if (this.value) document.getElementById("historico-ano").value = "";
  });
});

// Resumo compacto (cards + selos de status) do filtro aplicado, logo
// abaixo da busca.
function mostrarResumoFiltro(clientes, veiculos, atendimentos, valorFormatado, contagemStatus) {
  document.getElementById("rf-clientes").textContent = clientes;
  document.getElementById("rf-veiculos").textContent = veiculos;
  document.getElementById("rf-atendimentos").textContent = atendimentos;
  document.getElementById("rf-valor").textContent = valorFormatado;
  document.getElementById("faixa-status-filtro").innerHTML = faixaStatus(contagemStatus);
  document.getElementById("resumo-filtro-historico").classList.remove("oculto");
}

function ocultarResumoFiltro() {
  document.getElementById("resumo-filtro-historico").classList.add("oculto");
}

function escaparHtmlTela(texto) {
  return String(texto === undefined || texto === null ? "" : texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}



async function carregarDropdownClientesHistorico() {
  try {
    const resposta = await chamarApi({ acao: "listarClientes" });
    if (!resposta.sucesso) return;
    const select = document.getElementById("historico-cliente");
    resposta.clientes.forEach(function (cliente) {
      const opcao = document.createElement("option");
      opcao.value = cliente.id;
      opcao.textContent = cliente.nome;
      select.appendChild(opcao);
    });
  } catch (erro) {
    // Sem dropdown carregado, a busca por cliente fica indisponível até recarregar.
  }
}

async function carregarDropdownPlacasHistorico() {
  try {
    const resposta = await chamarApi({ acao: "listarPlacas" });
    if (!resposta.sucesso) return;
    const select = document.getElementById("historico-placa");
    resposta.veiculos.forEach(function (v) {
      const opcao = document.createElement("option");
      opcao.value = v.placa;
      opcao.textContent = v.placa + ([v.marca, v.modelo].filter(Boolean).join(" ") ? " — " + [v.marca, v.modelo].filter(Boolean).join(" ") : "");
      select.appendChild(opcao);
    });
  } catch (erro) {
    // Sem dropdown carregado, a busca por placa fica indisponível até recarregar.
  }
}

// Uma busca só: placa, cliente e período (ano, dia ou intervalo) são
// opcionais e se combinam. Só placa ou só cliente (sem período) mostra o
// histórico agrupado de antes; qualquer outra combinação lista as OS
// numa tabela única.
document.getElementById("botao-buscar-historico").addEventListener("click", async function () {
  const placa = document.getElementById("historico-placa").value.trim();
  const idCliente = document.getElementById("historico-cliente").value;
  const dataInicial = document.getElementById("historico-data-inicial").value;
  const dataFinal = document.getElementById("historico-data-final").value;
  const ano = document.getElementById("historico-ano").value;
  const mensagem = document.getElementById("mensagem-busca-historico");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!placa && !idCliente && !dataInicial && !ano) {
    mensagem.textContent = "Escolha uma placa, um cliente, um ano ou uma data.";
    mensagem.classList.add("erro");
    return;
  }
  if (dataInicial && dataFinal && dataFinal < dataInicial) {
    mensagem.textContent = "A data final não pode ser antes da inicial.";
    mensagem.classList.add("erro");
    return;
  }

  const temPeriodo = !!(dataInicial || ano);
  let acao = "obterHistoricoPeriodo";
  let filtro = {};
  if (placa) filtro.placa = placa;
  if (idCliente) filtro.id_cliente = idCliente;
  if (dataInicial) {
    filtro.data_inicial = dataInicial;
    filtro.data_final = dataFinal || "";
  } else if (ano) {
    filtro.ano = ano;
  }

  let tipo = "periodo";
  if (!temPeriodo && placa && !idCliente) { acao = "obterHistoricoVeiculo"; tipo = "veiculo"; }
  if (!temPeriodo && idCliente && !placa) { acao = "obterHistoricoCliente"; tipo = "cliente"; }

  this.disabled = true;
  mensagem.textContent = "Buscando...";
  try {
    const resposta = await chamarApi(Object.assign({ acao: acao }, filtro));
    mensagem.textContent = "";
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível buscar agora.";
      mensagem.classList.add("erro");
      document.getElementById("secao-resultado-historico").classList.add("oculto");
      ocultarResumoFiltro();
      return;
    }
    ultimoFiltroHistorico = Object.assign({ tipo: tipo }, filtro);
    if (tipo === "veiculo") {
      renderizarResultadoVeiculo(resposta);
      mostrarResumoFiltro(resposta.total_clientes, 1, resposta.total_atendimentos, resposta.valor_total_formatado, resposta.contagem_status);
    } else if (tipo === "cliente") {
      renderizarResultadoCliente(resposta);
      mostrarResumoFiltro(1, resposta.veiculos.length, resposta.total_atendimentos, resposta.valor_total_formatado, resposta.contagem_status);
    } else {
      renderizarResultadoPeriodo(resposta);
      mostrarResumoFiltro(resposta.total_clientes, resposta.total_veiculos, resposta.total_atendimentos, resposta.valor_total_formatado, resposta.contagem_status);
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
    ocultarResumoFiltro();
  } finally {
    this.disabled = false;
  }
});

function renderizarResultadoPeriodo(resposta) {
  document.getElementById("titulo-resultado-historico").textContent = "Check Lists — " + (resposta.titulo || resposta.periodo);

  const container = document.getElementById("lista-resultado-historico");
  if (!resposta.atendimentos || resposta.atendimentos.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum Check List com esses filtros.</p>';
  } else {
    let html = '<table class="tabela-atendimentos-historico"><thead><tr>' +
      "<th>Data</th><th>Cliente</th><th>Veículo</th><th>Status</th><th>Solicitação do cliente</th><th>O que foi feito</th><th>Valor</th>" +
      "</tr></thead><tbody>";
    resposta.atendimentos.forEach(function (a) {
      html += "<tr><td>" + escaparHtmlTela(a.data) + "</td>" +
        '<td class="coluna-cliente-historico">' + escaparHtmlTela(a.cliente_nome) + "</td>" +
        "<td>" + escaparHtmlTela(a.placa) + (a.veiculo ? "<br>" + escaparHtmlTela(a.veiculo) : "") + "</td>" +
        "<td>" + escaparHtmlTela(a.status) + "</td>" +
        "<td>" + escaparHtmlTela(a.solicitacoes_cliente || "—") + "</td>" +
        "<td>" + escaparHtmlTela(a.servicos_realizados || "—") + "</td>" +
        "<td>" + escaparHtmlTela(a.valor_formatado || "—") + "</td></tr>";
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  document.getElementById("valor-total-resultado").textContent = "Valor total: " + resposta.valor_total_formatado;

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

function tabelaAtendimentos(atendimentos) {
  if (!atendimentos || atendimentos.length === 0) {
    return '<p class="aviso">Nenhum atendimento registrado.</p>';
  }
  let html = '<table class="tabela-atendimentos-historico"><thead><tr>' +
    "<th>Data</th><th>Status</th><th>Solicitação do cliente</th><th>O que foi feito</th><th>Valor</th>" +
    "</tr></thead><tbody>";
  atendimentos.forEach(function (a) {
    html += "<tr><td>" + (a.data || "") + "</td><td>" + (a.status || "") + "</td>" +
      "<td>" + (a.solicitacoes_cliente || "—") + "</td>" +
      "<td>" + (a.servicos_realizados || "—") + "</td>" +
      "<td>" + (a.valor_formatado || "—") + "</td></tr>";
  });
  html += "</tbody></table>";
  return html;
}

function renderizarResultadoVeiculo(resposta) {
  document.getElementById("titulo-resultado-historico").textContent =
    "Histórico — " + resposta.veiculo.placa;

  const container = document.getElementById("lista-resultado-historico");
  container.innerHTML =
    '<div class="bloco-veiculo-historico">' +
    '<div class="titulo-veiculo-historico">' + resposta.veiculo.placa + "</div>" +
    tabelaAtendimentos(resposta.atendimentos) +
    "</div>";

  document.getElementById("valor-total-resultado").textContent = "Valor total: " + resposta.valor_total_formatado;

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

function renderizarResultadoCliente(resposta) {
  document.getElementById("titulo-resultado-historico").textContent =
    "Histórico — " + resposta.cliente.nome;

  const container = document.getElementById("lista-resultado-historico");
  container.innerHTML = "";

  if (resposta.veiculos.length === 0) {
    container.innerHTML = '<p class="aviso">Esse cliente ainda não trouxe nenhum veículo pra um Check List.</p>';
  } else {
    resposta.veiculos.forEach(function (v) {
      const bloco = document.createElement("div");
      bloco.className = "bloco-veiculo-historico";
      bloco.innerHTML =
        '<div class="titulo-veiculo-historico">' + v.placa + " — " + [v.marca, v.modelo].filter(Boolean).join(" ") + "</div>" +
        tabelaAtendimentos(v.atendimentos) +
        '<div class="linha-valor-total-historico">Valor deste veículo: ' + v.valor_total_formatado + "</div>";
      container.appendChild(bloco);
    });
  }

  document.getElementById("valor-total-resultado").textContent = "Valor total do cliente: " + resposta.valor_total_formatado;

  document.getElementById("secao-resultado-historico").classList.remove("oculto");
  const mensagemPdf = document.getElementById("mensagem-pdf-resultado");
  mensagemPdf.textContent = "";
  mensagemPdf.className = "mensagem-inline";
}

// ---------------------------------------------------------------
// Salvar em PDF — gera o PDF do resultado da busca atual (veículo,
// cliente ou período) pela ação gerarPdfHistorico, que recebe o mesmo
// filtro da última busca, e baixa o arquivo no computador.
// ---------------------------------------------------------------

// Baixa o PDF direto no computador (sem Drive e sem abrir outra aba).
function baixarPdfBase64(base64, nomeArquivo) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

async function exportarPdfHistorico(dadosFiltro, botao, mensagem) {
  botao.disabled = true;
  const textoOriginal = botao.textContent;
  botao.textContent = "Gerando PDF...";
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  try {
    const resposta = await chamarApi(Object.assign({ acao: "gerarPdfHistorico" }, dadosFiltro));
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível gerar o PDF agora.";
      mensagem.classList.add("erro");
      return;
    }
    baixarPdfBase64(resposta.pdf_base64, resposta.nome_arquivo || "Historico.pdf");
    mensagem.textContent = "PDF salvo no seu computador (pasta Downloads).";
    mensagem.classList.add("sucesso");
  } catch (erro) {
    mensagem.textContent = "Não foi possível gerar o PDF agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}


document.getElementById("botao-pdf-resultado").addEventListener("click", function () {
  if (!ultimoFiltroHistorico) return;
  exportarPdfHistorico(ultimoFiltroHistorico, this, document.getElementById("mensagem-pdf-resultado"));
});
