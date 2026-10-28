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
  prepararCampoPlaca();
  prepararExclusividadeCliente();
  carregarDropdownClientes();
}

// CPF/CNPJ e "Cliente já cadastrado" são duas formas de achar o mesmo
// cliente: usar uma desabilita a outra, e a tela avisa.
function prepararExclusividadeCliente() {
  const campoDoc = document.getElementById("busca-documento");
  const selectCliente = document.getElementById("busca-nome-cliente");
  const mensagem = document.getElementById("mensagem-busca");

  function avisar(texto) {
    mensagem.textContent = texto;
    mensagem.className = "mensagem-inline";
  }

  campoDoc.addEventListener("input", function () {
    if (campoDoc.value.trim()) {
      selectCliente.value = "";
      selectCliente.disabled = true;
      avisar("Buscando por CPF/CNPJ: a lista de clientes foi desabilitada. Apague o CPF/CNPJ para escolher um cliente.");
    } else {
      selectCliente.disabled = false;
      avisar("");
    }
  });

  selectCliente.addEventListener("change", function () {
    if (selectCliente.value) {
      campoDoc.value = "";
      campoDoc.disabled = true;
      avisar("Cliente escolhido na lista: o campo CPF/CNPJ foi desabilitado. Volte para \"Selecione...\" para digitar um CPF/CNPJ.");
    } else {
      campoDoc.disabled = false;
      avisar("");
    }
  });
}

function normalizarPlaca(texto) {
  return String(texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// A Placa vira um campo de digitar com sugestões (digita ou escolhe na
// lista). As sugestões vêm dos Check Lists existentes e, ao escolher um
// cliente, dos veículos dele.
function prepararCampoPlaca() {
  const antigo = document.getElementById("busca-placa");
  if (!antigo || antigo.tagName !== "SELECT") return;
  const campo = document.createElement("input");
  campo.type = "text";
  campo.id = "busca-placa";
  campo.placeholder = "Digite ou escolha";
  campo.maxLength = 8;
  campo.autocomplete = "off";
  campo.setAttribute("list", "lista-placas");
  campo.style.textTransform = "uppercase";
  const lista = document.createElement("datalist");
  lista.id = "lista-placas";
  antigo.parentNode.replaceChild(campo, antigo);
  campo.parentNode.appendChild(lista);

  chamarApiRapido({ acao: "listarOSAtivas" }, function (resposta) {
    if (!resposta || !resposta.sucesso || !resposta.os) return;
    if (document.getElementById("busca-nome-cliente").value) return;
    const vistas = {};
    lista.innerHTML = "";
    resposta.os.forEach(function (os) {
      const placa = os.veiculo_placa;
      if (!placa || vistas[placa]) return;
      vistas[placa] = true;
      const opcao = document.createElement("option");
      opcao.value = placa;
      opcao.label = (os.veiculo_texto || "") + " — " + (os.cliente_nome || "");
      lista.appendChild(opcao);
    });
  }).catch(function () {});
}

async function carregarDropdownClientes() {
  try {
    await chamarApiRapido({ acao: "listarClientes" }, function (resposta) {
      if (!resposta.sucesso) return;
      const select = document.getElementById("busca-nome-cliente");
      const escolhido = select.value;
      while (select.options.length > 1) select.remove(1);
      resposta.clientes.forEach(function (cliente) {
        const opcao = document.createElement("option");
        opcao.value = cliente.id;
        opcao.textContent = cliente.nome;
        select.appendChild(opcao);
      });
      select.value = escolhido;
    });
  } catch (erro) {
    // Se não carregar, a pessoa ainda pode buscar por CPF/CNPJ ou placa.
  }
}

// Quando escolhe um cliente no dropdown, o dropdown de Placa passa a
// mostrar só os veículos dele — mais rápido do que digitar a placa.
document.getElementById("busca-nome-cliente").addEventListener("change", async function () {
  const idCliente = this.value;
  const campoPlaca = document.getElementById("busca-placa");
  const listaPlacas = document.getElementById("lista-placas");
  campoPlaca.value = "";
  if (listaPlacas) listaPlacas.innerHTML = "";

  if (!idCliente) return;

  try {
    const resposta = await chamarApi({ acao: "listarVeiculosCliente", id_cliente: idCliente });
    if (resposta.sucesso && resposta.veiculos) {
      resposta.veiculos.forEach(function (veiculo) {
        const opcao = document.createElement("option");
        opcao.value = veiculo.placa;
        opcao.label = veiculo.marca + " " + veiculo.modelo;
        if (listaPlacas) listaPlacas.appendChild(opcao);
      });
    }
  } catch (erro) {
    // Sem veículos carregados, a pessoa ainda pode buscar sem filtrar por placa.
  }
});

// ---------------------------------------------------------------
// Buscar (por placa, CPF/CNPJ ou cliente já cadastrado) e mostrar
// o resultado em cards — os mesmos cards do quadro de Acompanhamento,
// só que sem separar por coluna de status.
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cliente").addEventListener("click", async function () {
  const idClienteSelecionado = document.getElementById("busca-nome-cliente").value;
  const documento = document.getElementById("busca-documento").value.trim();
  const placaSelecionada = normalizarPlaca(document.getElementById("busca-placa").value);
  const mensagem = document.getElementById("mensagem-busca");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  document.getElementById("secao-resultado").classList.add("oculto");
  document.getElementById("secao-visualizacao").classList.add("oculto");

  if (!idClienteSelecionado && !documento && !placaSelecionada) {
    mensagem.textContent = "Escolha o cliente, digite o CPF/CNPJ ou selecione a placa pra buscar.";
    mensagem.classList.add("erro");
    return;
  }

  this.disabled = true;
  try {
    let idCliente = "";

    if (idClienteSelecionado) {
      idCliente = idClienteSelecionado;
    } else if (documento) {
      let respostaCliente = await chamarApi({ acao: "buscarClienteLocal", documento: documento });
      // CPF que começa com zero pode ter sido gravado sem o zero na
      // planilha: tenta de novo sem os zeros da frente.
      const digitos = documento.replace(/\D/g, "");
      if (!respostaCliente.sucesso && /^0/.test(digitos)) {
        respostaCliente = await chamarApi({ acao: "buscarClienteLocal", documento: digitos.replace(/^0+/, "") });
      }
      if (!respostaCliente.sucesso) {
        mensagem.textContent = "Cliente não encontrado no cadastro.";
        mensagem.classList.add("erro");
        return;
      }
      idCliente = respostaCliente.cliente.id;
    } else if (placaSelecionada) {
      const respostaVeiculo = await chamarApi({ acao: "buscarVeiculoLocal", placa: placaSelecionada });
      if (!respostaVeiculo.sucesso || !respostaVeiculo.veiculo.id_cliente) {
        mensagem.textContent = "Veículo não encontrado no cadastro.";
        mensagem.classList.add("erro");
        return;
      }
      idCliente = respostaVeiculo.veiculo.id_cliente;
    }

    const respostaOS = await chamarApiRapido({ acao: "listarOSAtivas" }, function () {});
    if (!respostaOS.sucesso) {
      mensagem.textContent = "Não foi possível carregar os check lists agora.";
      mensagem.classList.add("erro");
      return;
    }

    let resultado = respostaOS.os.filter(function (os) {
      return String(os.id_cliente) === String(idCliente);
    });

    // Se a busca foi por uma placa específica (não "Todas"), filtra
    // também pelo veículo, não só pelo cliente.
    if (placaSelecionada) {
      resultado = resultado.filter(function (os) { return normalizarPlaca(os.veiculo_placa) === placaSelecionada; });
    }

    renderizarResultado(resultado);
    if (!resultado.length && documento && !idClienteSelecionado) {
      mensagem.textContent = "Cliente encontrado, mas sem Check Lists ativos para esse filtro.";
    }
    document.getElementById("secao-resultado").classList.remove("oculto");
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
  }
});

function renderizarResultado(lista) {
  const container = document.getElementById("quadro-resultado");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum Check List encontrado com esse filtro.</p>';
    return;
  }

  lista
    .sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora); })
    .forEach(function (os) {
      container.appendChild(criarCardResultado(os));
    });
}

function criarCardResultado(os) {
  const card = document.createElement("div");
  card.className = "card-kanban";
  card.dataset.idOs = os.id_os;

  const nome = document.createElement("div");
  nome.className = "nome-cliente-card";
  nome.textContent = os.cliente_nome;
  card.appendChild(nome);

  const veiculo = document.createElement("div");
  veiculo.className = "veiculo-card";
  veiculo.textContent = (os.veiculo_texto || "Veículo") + " — " + os.veiculo_placa;
  card.appendChild(veiculo);

  const rodape = document.createElement("div");
  rodape.className = "rodape-card";
  rodape.innerHTML =
    "<span>" + os.data + " " + os.hora + " · OS " + os.id_os + "</span>" +
    '<span class="etiqueta-status">' + os.status + "</span>";
  card.appendChild(rodape);

  card.addEventListener("click", function () {
    abrirVisualizacao(os.id_os, "secao-busca");
  });

  return card;
}

document.getElementById("botao-voltar-lista").addEventListener("click", function () {
  document.getElementById("secao-visualizacao").classList.add("oculto");
  document.getElementById("secao-busca").classList.remove("oculto");
});
