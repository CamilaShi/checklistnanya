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
// Buscar (por placa, CPF/CNPJ ou cliente já cadastrado) e mostrar
// o resultado em cards — os mesmos cards do quadro de Acompanhamento,
// só que sem separar por coluna de status.
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cliente").addEventListener("click", async function () {
  const idClienteSelecionado = document.getElementById("busca-nome-cliente").value;
  const documento = document.getElementById("busca-documento").value.trim();
  const placaSelecionada = document.getElementById("busca-placa").value;
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
      const respostaCliente = await chamarApi({ acao: "buscarClienteLocal", documento: documento });
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

    const respostaOS = await chamarApi({ acao: "listarOSAtivas" });
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
      resultado = resultado.filter(function (os) { return os.veiculo_placa === placaSelecionada; });
    }

    renderizarResultado(resultado);
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
