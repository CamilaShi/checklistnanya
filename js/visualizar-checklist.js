const usuario = exigirLogin();

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  if (usuario.perfil !== "Admin") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  }
  carregarDropdownClientes();
}

async function carregarDropdownClientes() {
  try {
    const resposta = await chamarApi({ acao: "listarClientes" });
    if (!resposta.sucesso) return;
    const select = document.getElementById("busca-nome-cliente");
    resposta.clientes.forEach(function (cliente) {
      const opcao = document.createElement("option");
      opcao.value = cliente.id;
      opcao.textContent = cliente.nome;
      select.appendChild(opcao);
    });
  } catch (erro) {
    // Se não carregar, a pessoa ainda pode buscar por CPF/CNPJ ou placa.
  }
}

// Quando escolhe um cliente no dropdown, o dropdown de Placa passa a
// mostrar só os veículos dele — mais rápido do que digitar a placa.
document.getElementById("busca-nome-cliente").addEventListener("change", async function () {
  const idCliente = this.value;
  const selectPlaca = document.getElementById("busca-placa");
  selectPlaca.innerHTML = '<option value="">Todas</option>';

  if (!idCliente) return;

  try {
    const resposta = await chamarApi({ acao: "listarVeiculosCliente", id_cliente: idCliente });
    if (resposta.sucesso && resposta.veiculos) {
      resposta.veiculos.forEach(function (veiculo) {
        const opcao = document.createElement("option");
        opcao.value = veiculo.placa;
        opcao.textContent = veiculo.placa + " — " + veiculo.marca + " " + veiculo.modelo;
        selectPlaca.appendChild(opcao);
      });
    }
  } catch (erro) {
    // Sem veículos carregados, a pessoa ainda pode buscar sem filtrar por placa.
  }
});

// ---------------------------------------------------------------
// Mesma lógica de agrupar Esquerdo/Direito do Check List, mas em
// modo só-leitura (sem select, sem obrigatório).
// ---------------------------------------------------------------

function detectarLado(nome) {
  const minusculo = nome.toLowerCase();
  const sufixos = [
    { texto: " esquerdo", lado: "E" },
    { texto: " esquerda", lado: "E" },
    { texto: " direito", lado: "D" },
    { texto: " direita", lado: "D" },
  ];
  for (const s of sufixos) {
    if (minusculo.endsWith(s.texto)) {
      return { base: nome.slice(0, nome.length - s.texto.length), lado: s.lado };
    }
  }
  return null;
}

function agruparPares(itens) {
  const indicePorBase = {};
  const grupos = [];

  itens.forEach(function (item) {
    const info = detectarLado(item.nome);
    if (!info) {
      grupos.push({ tipo: "solto", item: item });
      return;
    }
    if (indicePorBase[info.base] === undefined) {
      indicePorBase[info.base] = grupos.length;
      grupos.push({ tipo: "par", base: info.base, E: null, D: null });
    }
    grupos[indicePorBase[info.base]][info.lado] = item;
  });

  return grupos.map(function (grupo) {
    if (grupo.tipo === "par" && (!grupo.E || !grupo.D)) {
      return { tipo: "solto", item: grupo.E || grupo.D };
    }
    return grupo;
  });
}

function aplicarLeituraColunar(container, quantidadeItens, colunasDesktop) {
  const largura = window.innerWidth;
  let colunas;
  if (largura <= 720) {
    colunas = 1;
  } else if (largura <= 1100) {
    colunas = Math.min(3, colunasDesktop);
  } else {
    colunas = colunasDesktop;
  }
  const linhas = Math.max(Math.ceil(quantidadeItens / colunas), 1);
  container.style.gridTemplateColumns = "repeat(" + colunas + ", 1fr)";
  container.style.gridAutoFlow = "column";
  container.style.gridTemplateRows = "repeat(" + linhas + ", auto)";
}

// Valor mostrado (não editável) por item, com cor conforme a resposta.
function criarValorResposta(valor) {
  const span = document.createElement("span");
  span.className = "valor-resposta";
  span.textContent = valor || "—";
  if (valor === "Não Ok" || valor === "Não") span.classList.add("valor-nao-ok");
  else if (valor) span.classList.add("valor-ok");
  return span;
}

function renderizarListaVisualizacao(container, itens, colunasDesktop) {
  container.innerHTML = "";
  container.className = "lista-checklist";
  container.style.display = "grid";
  container.style.gap = "2px 10px";

  if (itens.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum item respondido nessa seção.</p>';
    return;
  }

  const grupos = agruparPares(itens);

  grupos.forEach(function (grupo) {
    const item = document.createElement("div");
    item.className = "item-checklist-grade";

    if (grupo.tipo === "par") {
      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = grupo.base;
      item.appendChild(nome);

      const linhaLado = document.createElement("div");
      linhaLado.className = "linha-lado";

      [{ letra: "E", campo: grupo.E }, { letra: "D", campo: grupo.D }].forEach(function (lado) {
        const grupoLado = document.createElement("div");
        grupoLado.className = "grupo-lado";
        const letra = document.createElement("label");
        letra.textContent = lado.letra;
        grupoLado.appendChild(letra);
        grupoLado.appendChild(criarValorResposta(lado.campo ? lado.campo.resposta : ""));
        linhaLado.appendChild(grupoLado);
      });

      item.appendChild(linhaLado);
    } else {
      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = grupo.item.nome;
      item.appendChild(nome);
      item.appendChild(criarValorResposta(grupo.item.resposta));
    }

    container.appendChild(item);
  });

  aplicarLeituraColunar(container, grupos.length, colunasDesktop);
}

// ---------------------------------------------------------------
// Buscar cliente e listar as OS dele
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cliente").addEventListener("click", async function () {
  const idClienteSelecionado = document.getElementById("busca-nome-cliente").value;
  const documento = document.getElementById("busca-documento").value.trim();
  const placa = document.getElementById("busca-placa").value.trim();
  const mensagem = document.getElementById("mensagem-busca");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  document.getElementById("secao-lista-os").classList.add("oculto");
  document.getElementById("secao-visualizacao").classList.add("oculto");

  if (!idClienteSelecionado && !documento && !placa) {
    mensagem.textContent = "Escolha o cliente, digite o CPF/CNPJ ou a placa pra buscar.";
    mensagem.classList.add("erro");
    return;
  }

  this.disabled = true;
  try {
    let idCliente = "";
    let nomeCliente = "";

    if (idClienteSelecionado) {
      idCliente = idClienteSelecionado;
      nomeCliente = document.getElementById("busca-nome-cliente").selectedOptions[0].textContent;
    } else if (documento) {
      const respostaCliente = await chamarApi({ acao: "buscarClienteLocal", documento: documento });
      if (!respostaCliente.sucesso) {
        mensagem.textContent = "Cliente não encontrado no cadastro.";
        mensagem.classList.add("erro");
        return;
      }
      idCliente = respostaCliente.cliente.id;
      nomeCliente = respostaCliente.cliente.nome;
    } else if (placa) {
      const respostaVeiculo = await chamarApi({ acao: "buscarVeiculoLocal", placa: placa });
      if (!respostaVeiculo.sucesso || !respostaVeiculo.veiculo.id_cliente) {
        mensagem.textContent = "Veículo não encontrado no cadastro.";
        mensagem.classList.add("erro");
        return;
      }
      idCliente = respostaVeiculo.veiculo.id_cliente;
      // A busca por placa já resolve o id_cliente; buscamos o nome
      // dele na lista que já carregamos no dropdown, sem custo extra.
      const opcaoCliente = Array.from(document.getElementById("busca-nome-cliente").options).find(function (o) {
        return String(o.value) === String(idCliente);
      });
      nomeCliente = opcaoCliente ? opcaoCliente.textContent : "Cliente";
    }

    const respostaOS = await chamarApi({ acao: "listarOSAtivas" });
    if (!respostaOS.sucesso) {
      mensagem.textContent = "Não foi possível carregar os check lists agora.";
      mensagem.classList.add("erro");
      return;
    }

    const osDoCliente = respostaOS.os.filter(function (os) {
      return String(os.id_cliente) === String(idCliente);
    });

    document.getElementById("nome-cliente-encontrado").textContent = nomeCliente;
    renderizarListaOS(osDoCliente);
    document.getElementById("secao-lista-os").classList.remove("oculto");
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});

function renderizarListaOS(lista) {
  const container = document.getElementById("lista-os");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = '<p class="aviso">Esse cliente ainda não tem nenhum Check List.</p>';
    return;
  }

  lista
    .sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora); })
    .forEach(function (os) {
      const linha = document.createElement("button");
      linha.type = "button";
      linha.className = "linha-os-selecionavel";
      linha.innerHTML =
        "<strong>" + os.data + " " + os.hora + "</strong>" +
        " — " + (os.veiculo_texto || "Veículo") + " (" + os.veiculo_placa + ")" +
        " — OS " + os.id_os +
        ' <span class="etiqueta-status">' + os.status + "</span>";
      linha.addEventListener("click", function () {
        abrirVisualizacao(os.id_os);
      });
      container.appendChild(linha);
    });
}

document.getElementById("botao-voltar-lista").addEventListener("click", function () {
  document.getElementById("secao-visualizacao").classList.add("oculto");
  document.getElementById("secao-lista-os").classList.remove("oculto");
});

// ---------------------------------------------------------------
// Abrir o layout completo de uma OS
// ---------------------------------------------------------------

async function abrirVisualizacao(idOS) {
  const mensagem = document.getElementById("mensagem-busca");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  try {
    const resposta = await chamarApi({ acao: "obterChecklistCompleto", id_os: idOS });
    if (!resposta.sucesso) {
      mensagem.textContent = resposta.mensagem || "Não foi possível abrir esse Check List.";
      mensagem.classList.add("erro");
      return;
    }
    preencherVisualizacao(resposta);
    document.getElementById("secao-lista-os").classList.add("oculto");
    document.getElementById("secao-visualizacao").classList.remove("oculto");
    window.scrollTo(0, 0);
  } catch (erro) {
    mensagem.textContent = "Não foi possível abrir agora.";
    mensagem.classList.add("erro");
  }
}

function preencherVisualizacao(dados) {
  const os = dados.os;
  const cliente = dados.cliente || {};
  const endereco = dados.endereco;
  const veiculo = dados.veiculo || {};

  document.getElementById("v-data").value = os.data || "";
  document.getElementById("v-hora").value = os.hora || "";
  document.getElementById("v-atendente").value = dados.atendente_nome || "";
  document.getElementById("v-os").value = os.id_os || "";

  document.getElementById("v-documento").value = cliente.cpf_cnpj || "";
  document.getElementById("v-nome").value = cliente.nome || "";
  document.getElementById("v-nascimento").value = cliente.data_nascimento || "";
  document.getElementById("v-telefone").value = formatarTelefone(cliente.telefone);
  document.getElementById("v-email").value = cliente.email || "";

  const partesEndereco = [];
  if (endereco) {
    if (endereco.rua) partesEndereco.push(endereco.rua + (endereco.numero ? ", " + endereco.numero : ""));
    if (endereco.bairro) partesEndereco.push(endereco.bairro);
    if (endereco.cidade) partesEndereco.push(endereco.cidade + (endereco.uf ? "/" + endereco.uf : ""));
  }
  document.getElementById("v-endereco").value = partesEndereco.join(" - ");

  document.getElementById("v-placa").value = veiculo.placa || "";
  document.getElementById("v-km").value = veiculo.km || "";
  document.getElementById("v-marca").value = veiculo.marca || "";
  document.getElementById("v-modelo").value = veiculo.modelo || "";
  document.getElementById("v-ano").value = veiculo.ano_modelo || "";
  document.getElementById("v-combustivel").value = veiculo.combustivel || "";

  const faixaNivel = document.getElementById("v-nivel-combustivel");
  faixaNivel.innerHTML = "";
  ["0", "1/4", "1/2", "3/4", "1"].forEach(function (valor) {
    const marcado = os.nivel_combustivel === valor;
    const span = document.createElement("span");
    span.className = "ponto-nivel" + (marcado ? " ponto-nivel-marcado" : "");
    span.textContent = valor;
    faixaNivel.appendChild(span);
  });

  document.getElementById("v-cliente-presente").value = os.cliente_presente === "Sim" ? "Presente" : "Ausente";
  document.getElementById("v-km-oleo").value = os.km_ultima_troca_oleo || "";
  document.getElementById("v-data-oleo").value = os.data_ultima_troca_oleo || "";

  const containerSolicitacoes = document.getElementById("v-solicitacoes");
  containerSolicitacoes.innerHTML = "";
  const linhasSolicitacoes = (os.solicitacoes_cliente || "").split("\n").filter(Boolean);
  if (linhasSolicitacoes.length === 0) {
    containerSolicitacoes.innerHTML = '<p class="aviso">Nenhuma solicitação registrada.</p>';
  } else {
    linhasSolicitacoes.forEach(function (texto) {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "linha-solicitacao";
      input.readOnly = true;
      input.value = texto;
      containerSolicitacoes.appendChild(input);
    });
  }

  const acessorios = dados.respostas.filter(function (r) { return r.categoria === "Acessório" || r.categoria === "Acessorio"; });
  const tecnicos = dados.respostas.filter(function (r) { return r.categoria === "Técnico" || r.categoria === "Tecnico"; });

  renderizarListaVisualizacao(document.getElementById("v-lista-acessorios"), acessorios, 7);
  renderizarListaVisualizacao(document.getElementById("v-lista-tecnicos"), tecnicos, 5);

  document.getElementById("v-observacao-acessorios").value = os.observacao_acessorios || "";
  document.getElementById("v-observacao-tecnicos").value = os.observacao_tecnicos || "";
}
