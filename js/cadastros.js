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
}

// ---------------------------------------------------------------
// Alternar PF / PJ
// ---------------------------------------------------------------

const radiosTipoPessoa = document.querySelectorAll('input[name="tipo-pessoa"]');
radiosTipoPessoa.forEach(function (radio) {
  radio.addEventListener("change", atualizarTipoPessoa);
});

function atualizarTipoPessoa() {
  const tipo = document.querySelector('input[name="tipo-pessoa"]:checked').value;
  const ehPF = tipo === "PF";

  document.getElementById("busca-pf").classList.toggle("oculto", !ehPF);
  document.getElementById("busca-pj").classList.toggle("oculto", ehPF);

  document.getElementById("campo-sexo").classList.toggle("oculto", !ehPF);
  document.getElementById("campo-nascimento").classList.toggle("oculto", !ehPF);
  document.getElementById("campo-idade").classList.toggle("oculto", !ehPF);
  document.getElementById("campo-nome-mae").classList.toggle("oculto", !ehPF);

  document.getElementById("campo-nome-fantasia").classList.toggle("oculto", ehPF);
  document.getElementById("campo-regime").classList.toggle("oculto", ehPF);
  document.getElementById("campo-situacao").classList.toggle("oculto", ehPF);
  document.getElementById("campo-inicio-atividades").classList.toggle("oculto", ehPF);
  document.getElementById("campo-inscricao-estadual").classList.toggle("oculto", ehPF);

  document.getElementById("rotulo-nome").textContent = ehPF ? "Nome" : "Razão social";
}

// ---------------------------------------------------------------
// Preencher campos (usado tanto pela busca grátis quanto pela paga)
// ---------------------------------------------------------------

const CAMPOS_CLIENTE_PF = ["nome", "data-nascimento", "idade", "nome-mae"];
const CAMPOS_CLIENTE_PJ = ["nome", "nome-fantasia", "regime-tributario", "situacao-cadastral", "inicio-atividades", "inscricao-estadual"];
const CAMPOS_VEICULO = [
  "marca", "modelo", "fabricante", "versao", "ano-fabricacao", "ano-modelo", "cor",
  "combustivel", "nacionalidade", "tipo-veiculo", "chassi", "numero-motor", "potencia",
  "cilindradas", "motor-descricao", "transmissao", "uf-emplacamento", "cidade-emplacamento",
];

function preencherEnderecoCliente(endereco) {
  if (!endereco) return;
  document.getElementById("cep").value = endereco.cep || "";
  document.getElementById("rua").value = endereco.rua || "";
  document.getElementById("complemento").value = endereco.complemento || "";
  document.getElementById("numero").value = endereco.numero || "";
  document.getElementById("bairro").value = endereco.bairro || "";
  document.getElementById("cidade").value = endereco.cidade || "";
  document.getElementById("uf").value = endereco.uf || "";
  document.getElementById("codigo-ibge").value = endereco.codigo_ibge || "";
}

function preencherClientePF(c) {
  document.getElementById("nome").value = c.nome || "";
  document.getElementById("data-nascimento").value = c.data_nascimento || "";
  document.getElementById("idade").value = c.idade || "";
  document.getElementById("nome-mae").value = c.nome_mae || "";
  if (c.sexo) document.getElementById("sexo").value = c.sexo;
  if (c.telefone) document.getElementById("telefone").value = formatarTelefone(c.telefone);
  if (c.email) document.getElementById("email-cliente").value = c.email;
  preencherEnderecoCliente(c.endereco);
}

function preencherClientePJ(c) {
  document.getElementById("nome").value = c.nome || "";
  document.getElementById("nome-fantasia").value = c.nome_fantasia || "";
  document.getElementById("regime-tributario").value = c.regime_tributario || "";
  document.getElementById("situacao-cadastral").value = c.situacao_cadastral || "";
  document.getElementById("inicio-atividades").value = c.data_inicio_atividades || "";
  document.getElementById("inscricao-estadual").value = c.inscricao_estadual || "";
  if (c.telefone) document.getElementById("telefone").value = formatarTelefone(c.telefone);
  if (c.email) document.getElementById("email-cliente").value = c.email;
  preencherEnderecoCliente(c.endereco);
}

function preencherVeiculo(v) {
  document.getElementById("placa").value = v.placa || document.getElementById("placa").value;
  document.getElementById("marca").value = v.marca || "";
  document.getElementById("modelo").value = v.modelo || "";
  document.getElementById("fabricante").value = v.fabricante || "";
  document.getElementById("versao").value = v.versao || "";
  document.getElementById("ano-fabricacao").value = v.ano_fabricacao || "";
  document.getElementById("ano-modelo").value = v.ano_modelo || "";
  document.getElementById("cor").value = v.cor || "";
  document.getElementById("combustivel").value = v.combustivel || "";
  document.getElementById("nacionalidade").value = v.nacionalidade || "";
  document.getElementById("tipo-veiculo").value = v.tipo_veiculo || "";
  document.getElementById("chassi").value = v.chassi || "";
  document.getElementById("numero-motor").value = v.numero_motor || "";
  document.getElementById("potencia").value = v.potencia || "";
  document.getElementById("cilindradas").value = v.cilindradas || "";
  document.getElementById("motor-descricao").value = v.motor_descricao || "";
  document.getElementById("transmissao").value = v.transmissao_descricao || "";
  document.getElementById("uf-emplacamento").value = v.uf_emplacamento || "";
  document.getElementById("cidade-emplacamento").value = v.cidade_emplacamento || "";
  if (v.km) document.getElementById("km").value = v.km;
}

// ---------------------------------------------------------------
// Buscar por nome — grátis (planilha), pode trazer mais de um cliente
// ---------------------------------------------------------------

document.getElementById("botao-buscar-nome").addEventListener("click", async function () {
  const nome = document.getElementById("busca-nome-cliente").value.trim();
  const mensagem = document.getElementById("mensagem-busca-nome");
  const caixaResultado = document.getElementById("resultado-busca-nome");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  caixaResultado.innerHTML = "";
  caixaResultado.classList.add("oculto");

  if (!nome) {
    mensagem.textContent = "Digite o nome antes de buscar.";
    mensagem.classList.add("erro");
    return;
  }

  const botao = this;
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "buscarClientesPorNome", nome: nome });

    if (resposta.sucesso && resposta.clientes && resposta.clientes.length > 0) {
      resposta.clientes.forEach(function (c) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "item-resultado-busca";
        item.textContent = c.nome + " — " + (c.cpf_cnpj || "sem documento") + " (" + c.id + ")";
        item.addEventListener("click", function () {
          selecionarClienteEncontrado(c.id);
        });
        caixaResultado.appendChild(item);
      });
      caixaResultado.classList.remove("oculto");
    } else {
      mensagem.textContent = "Nenhum cliente encontrado com esse nome.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível buscar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
});

// Ao escolher um dos nomes encontrados, busca o cadastro completo
// (cliente + endereço) pelo ID e preenche a tela, igual já acontecia
// na busca por CPF/CNPJ.
async function selecionarClienteEncontrado(idCliente) {
  const mensagem = document.getElementById("mensagem-busca-nome");
  const caixaResultado = document.getElementById("resultado-busca-nome");

  try {
    const resposta = await chamarApi({ acao: "buscarClientePorId", id: idCliente });

    if (resposta.sucesso) {
      const ehPF = resposta.cliente.tipo_pessoa !== "PJ";
      document.querySelector('input[name="tipo-pessoa"][value="' + (ehPF ? "PF" : "PJ") + '"]').checked = true;
      atualizarTipoPessoa();

      if (ehPF) {
        document.getElementById("cpf").value = resposta.cliente.cpf_cnpj || "";
        preencherClientePF(resposta.cliente);
        marcarExistente(CAMPOS_CLIENTE_PF, true);
      } else {
        document.getElementById("cnpj").value = resposta.cliente.cpf_cnpj || "";
        preencherClientePJ(resposta.cliente);
        marcarExistente(CAMPOS_CLIENTE_PJ, true);
      }

      mensagem.textContent = "Cliente selecionado (" + resposta.cliente.id + "). Confira os dados.";
      mensagem.className = "mensagem-inline info";
      caixaResultado.innerHTML = "";
      caixaResultado.classList.add("oculto");
      carregarVeiculosDoCliente(resposta.cliente.id);
    } else {
      mensagem.textContent = resposta.mensagem || "Não foi possível carregar esse cliente.";
      mensagem.className = "mensagem-inline erro";
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível carregar esse cliente agora.";
    mensagem.className = "mensagem-inline erro";
  }
}

// ---------------------------------------------------------------
// Buscar CPF — grátis (planilha) primeiro
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cpf").addEventListener("click", async function () {
  const cpf = document.getElementById("cpf").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  const botaoApi = document.getElementById("botao-buscar-cpf-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_CLIENTE_PF, false);
  botaoApi.classList.add("oculto");

  if (!cpf) {
    mensagem.textContent = "Informe o CPF antes de buscar.";
    mensagem.classList.add("erro");
    return;
  }

  const botao = this;
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "buscarClienteLocal", documento: cpf });

    if (resposta.sucesso) {
      preencherClientePF(resposta.cliente);
      marcarExistente(CAMPOS_CLIENTE_PF, true);
      mensagem.textContent = "Cliente já cadastrado (" + resposta.cliente.id + "). Confira os dados.";
      mensagem.classList.add("info");
      carregarVeiculosDoCliente(resposta.cliente.id);
    } else {
      mensagem.textContent = "Não encontrado no cadastro. Quer buscar na API paga (R$0,12)?";
      mensagem.classList.add("erro");
      botaoApi.classList.remove("oculto");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
});

// ---------------------------------------------------------------
// Buscar CPF — API paga, só quando o vendedor confirma
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cpf-api").addEventListener("click", async function () {
  const cpf = document.getElementById("cpf").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_CLIENTE_PF, false);

  const botao = this;
  botao.disabled = true;
  botao.textContent = "Consultando API...";

  try {
    const resposta = await chamarApi({ acao: "consultarCPF", cpf: cpf, homolog: modoTesteAtivo() });

    if (resposta.sucesso) {
      preencherClientePF(resposta.cliente);
      mensagem.textContent = "Dados encontrados na API.";
      mensagem.classList.add("sucesso");
      botao.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "CPF não encontrado.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Buscar na API (R$0,12)";
  }
});

// ---------------------------------------------------------------
// Buscar CNPJ — grátis (planilha) primeiro
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cnpj").addEventListener("click", async function () {
  const cnpj = document.getElementById("cnpj").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  const botaoApi = document.getElementById("botao-buscar-cnpj-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_CLIENTE_PJ, false);
  botaoApi.classList.add("oculto");

  if (!cnpj) {
    mensagem.textContent = "Informe o CNPJ antes de buscar.";
    mensagem.classList.add("erro");
    return;
  }

  const botao = this;
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "buscarClienteLocal", documento: cnpj });

    if (resposta.sucesso) {
      preencherClientePJ(resposta.cliente);
      marcarExistente(CAMPOS_CLIENTE_PJ, true);
      mensagem.textContent = "Cliente já cadastrado (" + resposta.cliente.id + "). Confira os dados.";
      mensagem.classList.add("info");
      carregarVeiculosDoCliente(resposta.cliente.id);
    } else {
      mensagem.textContent = "Não encontrado no cadastro. Quer buscar na API paga (R$0,04)?";
      mensagem.classList.add("erro");
      botaoApi.classList.remove("oculto");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
});

// ---------------------------------------------------------------
// Buscar CNPJ — API paga, só quando o vendedor confirma
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cnpj-api").addEventListener("click", async function () {
  const cnpj = document.getElementById("cnpj").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_CLIENTE_PJ, false);

  const botao = this;
  botao.disabled = true;
  botao.textContent = "Consultando API...";

  try {
    const resposta = await chamarApi({ acao: "consultarCNPJ", cnpj: cnpj, homolog: modoTesteAtivo() });

    if (resposta.sucesso) {
      preencherClientePJ(resposta.cliente);
      mensagem.textContent = "Dados encontrados na API.";
      mensagem.classList.add("sucesso");
      botao.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "CNPJ não encontrado.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Buscar na API (R$0,04)";
  }
});

// ---------------------------------------------------------------
// Buscar CEP (sempre grátis, ViaCEP)
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cep").addEventListener("click", async function () {
  const cep = document.getElementById("cep").value.trim();
  const mensagem = document.getElementById("mensagem-endereco");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  if (!cep) {
    mensagem.textContent = "Informe o CEP antes de buscar.";
    mensagem.classList.add("erro");
    return;
  }

  const botao = this;
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "consultarCEP", cep: cep });

    if (resposta.sucesso) {
      document.getElementById("rua").value = resposta.endereco.rua || "";
      document.getElementById("bairro").value = resposta.endereco.bairro || "";
      document.getElementById("cidade").value = resposta.endereco.cidade || "";
      document.getElementById("uf").value = resposta.endereco.uf || "";
      document.getElementById("complemento").value = resposta.endereco.complemento === "Não informado" ? "" : resposta.endereco.complemento || "";
      document.getElementById("codigo-ibge").value = resposta.endereco.codigo_ibge || "";
      mensagem.textContent = "Endereço encontrado. Preencha o número.";
      mensagem.classList.add("sucesso");
      document.getElementById("numero").focus();
    } else {
      mensagem.textContent = resposta.mensagem || "CEP não encontrado.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
});

// ---------------------------------------------------------------
// Veículos já cadastrados do cliente (dropdown, sem custo)
// ---------------------------------------------------------------

async function carregarVeiculosDoCliente(idCliente) {
  const campo = document.getElementById("campo-veiculos-cliente");
  const select = document.getElementById("select-veiculos-cliente");

  select.innerHTML = '<option value="">+ Cadastrar veículo novo</option>';

  try {
    const resposta = await chamarApi({ acao: "listarVeiculosCliente", id_cliente: idCliente });

    if (resposta.sucesso && resposta.veiculos && resposta.veiculos.length > 0) {
      resposta.veiculos.forEach(function (v) {
        const opcao = document.createElement("option");
        opcao.value = v.id;
        opcao.textContent = v.placa + " — " + v.marca + " " + v.modelo;
        opcao.dataset.veiculo = JSON.stringify(v);
        select.appendChild(opcao);
      });
      campo.classList.remove("oculto");
    } else {
      campo.classList.add("oculto");
    }
  } catch (erro) {
    campo.classList.add("oculto");
  }
}

document.getElementById("select-veiculos-cliente").addEventListener("change", function () {
  const opcaoSelecionada = this.options[this.selectedIndex];
  const mensagem = document.getElementById("mensagem-veiculo");

  if (!opcaoSelecionada.value) {
    // "+ Cadastrar veículo novo": limpa a seção pra começar do zero
    document.getElementById("placa").value = "";
    CAMPOS_VEICULO.forEach(function (id) {
      document.getElementById(id).value = "";
    });
    marcarExistente(CAMPOS_VEICULO, false);
    mensagem.textContent = "";
    mensagem.className = "mensagem-inline";
    return;
  }

  const veiculo = JSON.parse(opcaoSelecionada.dataset.veiculo);
  preencherVeiculo(veiculo);
  marcarExistente(CAMPOS_VEICULO, true);
  mensagem.textContent = "Veículo selecionado da lista (" + veiculo.id + "). Confira e atualize o Km.";
  mensagem.className = "mensagem-inline info";
});

// ---------------------------------------------------------------
// Buscar Placa — grátis (planilha) primeiro
// ---------------------------------------------------------------

document.getElementById("botao-buscar-placa").addEventListener("click", async function () {
  const placa = document.getElementById("placa").value.trim();
  const mensagem = document.getElementById("mensagem-veiculo");
  const botaoApi = document.getElementById("botao-buscar-placa-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_VEICULO, false);
  botaoApi.classList.add("oculto");

  if (!placa) {
    mensagem.textContent = "Informe a placa antes de buscar.";
    mensagem.classList.add("erro");
    return;
  }

  const botao = this;
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "buscarVeiculoLocal", placa: placa });

    if (resposta.sucesso) {
      preencherVeiculo(resposta.veiculo);
      marcarExistente(CAMPOS_VEICULO, true);
      mensagem.textContent = "Veículo já cadastrado (" + resposta.veiculo.id + "). Confira os dados e atualize o Km.";
      mensagem.classList.add("info");
    } else {
      mensagem.textContent = "Não encontrado no cadastro. Quer buscar na API paga (R$0,08)?";
      mensagem.classList.add("erro");
      botaoApi.classList.remove("oculto");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
});

// ---------------------------------------------------------------
// Buscar Placa — API paga, só quando o vendedor confirma
// ---------------------------------------------------------------

document.getElementById("botao-buscar-placa-api").addEventListener("click", async function () {
  const placa = document.getElementById("placa").value.trim();
  const mensagem = document.getElementById("mensagem-veiculo");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  marcarExistente(CAMPOS_VEICULO, false);

  const botao = this;
  botao.disabled = true;
  botao.textContent = "Consultando API...";

  try {
    const resposta = await chamarApi({ acao: "consultarPlaca", placa: placa, homolog: modoTesteAtivo() });

    if (resposta.sucesso) {
      preencherVeiculo(resposta.veiculo);
      mensagem.textContent = "Veículo encontrado na API.";
      mensagem.classList.add("sucesso");
      botao.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "Placa não encontrada.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Buscar na API (R$0,08)";
  }
});

// ---------------------------------------------------------------
// Salvar cadastro completo (cliente + endereço + veículo)
// ---------------------------------------------------------------

document.getElementById("form-cadastro").addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const mensagem = document.getElementById("mensagem-salvar");
  const botao = document.getElementById("botao-salvar");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  const tipoPessoa = document.querySelector('input[name="tipo-pessoa"]:checked').value;
  const documento = tipoPessoa === "PF" ? document.getElementById("cpf").value.trim() : document.getElementById("cnpj").value.trim();

  // Só os campos que a pessoa realmente digita entram aqui — nunca um
  // campo readonly (esses vêm da API, e ela pode simplesmente não
  // trazer aquele dado; travar o Salvar por isso seria um beco sem
  // saída pro vendedor).
  const camposObrigatorios = [
    { id: tipoPessoa === "PF" ? "cpf" : "cnpj", rotulo: tipoPessoa === "PF" ? "CPF" : "CNPJ" },
    { id: "nome", rotulo: "Nome" },
    { id: "telefone", rotulo: "Telefone" },
    { id: "email-cliente", rotulo: "Email" },
    { id: "placa", rotulo: "Placa" },
    { id: "km", rotulo: "Km atual" },
    { id: "cep", rotulo: "CEP" },
    { id: "numero", rotulo: "Número" },
  ];
  if (tipoPessoa === "PF") {
    camposObrigatorios.push({ id: "sexo", rotulo: "Sexo" });
  }

  const faltando = [];
  camposObrigatorios.forEach(function (item) {
    const campo = document.getElementById(item.id);
    campo.style.borderColor = "";
    if (!campo.value.trim()) {
      faltando.push(item.rotulo);
      campo.style.borderColor = "var(--erro)";
    }
  });

  const nome = document.getElementById("nome").value.trim();

  if (faltando.length > 0) {
    mensagem.textContent = "Preencha antes de salvar: " + faltando.join(", ") + ".";
    mensagem.classList.add("erro");
    return;
  }

  const cliente = {
    tipo_pessoa: tipoPessoa,
    cpf_cnpj: documento,
    nome: nome,
    nome_fantasia: document.getElementById("nome-fantasia").value,
    nome_mae: document.getElementById("nome-mae").value,
    sexo: document.getElementById("sexo").value,
    data_nascimento: document.getElementById("data-nascimento").value,
    regime_tributario: document.getElementById("regime-tributario").value,
    situacao_cadastral: document.getElementById("situacao-cadastral").value,
    data_inicio_atividades: document.getElementById("inicio-atividades").value,
    inscricao_estadual: document.getElementById("inscricao-estadual").value,
    telefone: document.getElementById("telefone").value,
    email: document.getElementById("email-cliente").value,
  };

  const endereco = {
    cep: document.getElementById("cep").value,
    rua: document.getElementById("rua").value,
    complemento: document.getElementById("complemento").value,
    numero: document.getElementById("numero").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    uf: document.getElementById("uf").value,
    codigo_ibge: document.getElementById("codigo-ibge").value,
  };

  const veiculo = {
    placa: document.getElementById("placa").value,
    chassi: document.getElementById("chassi").value,
    fabricante: document.getElementById("fabricante").value,
    marca: document.getElementById("marca").value,
    modelo: document.getElementById("modelo").value,
    versao: document.getElementById("versao").value,
    ano_fabricacao: document.getElementById("ano-fabricacao").value,
    ano_modelo: document.getElementById("ano-modelo").value,
    cor: document.getElementById("cor").value,
    combustivel: document.getElementById("combustivel").value,
    motor_descricao: document.getElementById("motor-descricao").value,
    numero_motor: document.getElementById("numero-motor").value,
    potencia: document.getElementById("potencia").value,
    cilindradas: document.getElementById("cilindradas").value,
    transmissao_descricao: document.getElementById("transmissao").value,
    nacionalidade: document.getElementById("nacionalidade").value,
    tipo_veiculo: document.getElementById("tipo-veiculo").value,
    uf_emplacamento: document.getElementById("uf-emplacamento").value,
    cidade_emplacamento: document.getElementById("cidade-emplacamento").value,
    km: document.getElementById("km").value,
  };

  botao.disabled = true;
  botao.textContent = "Salvando...";

  try {
    const resposta = await chamarApi({ acao: "salvarCadastro", cliente: cliente, endereco: endereco, veiculo: veiculo });

    if (resposta.sucesso) {
      mensagem.textContent =
        "Cadastro salvo. Cliente " + resposta.id_cliente + (resposta.id_veiculo ? " · Veículo " + resposta.id_veiculo : "") + ".";
      mensagem.classList.add("sucesso");
      carregarCadastrosDoDia();
    } else {
      mensagem.textContent = resposta.mensagem || "Não foi possível salvar o cadastro.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível salvar agora. Verifique sua internet.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Salvar cadastro";
  }
});

// ---------------------------------------------------------------
// Cadastros realizados hoje (Cliente / Endereço / Veículo)
// ---------------------------------------------------------------

async function carregarCadastrosDoDia() {
  const mensagem = document.getElementById("mensagem-cadastros-dia");
  const lista = document.getElementById("lista-cadastros-dia");
  const botao = document.getElementById("botao-atualizar-cadastros-dia");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  botao.disabled = true;

  try {
    const resposta = await chamarApi({ acao: "listarCadastrosDoDia" });

    if (resposta.sucesso && resposta.itens && resposta.itens.length > 0) {
      const CLASSE_BADGE_POR_TIPO = { Cliente: "badge-tipo-cliente", "Endereço": "badge-tipo-endereco", "Veículo": "badge-tipo-veiculo" };
      lista.innerHTML = "";
      resposta.itens.forEach(function (item) {
        const linha = document.createElement("div");
        linha.className = "item-cadastro-dia";
        linha.innerHTML =
          '<span class="badge-tipo-cadastro ' + (CLASSE_BADGE_POR_TIPO[item.tipo] || "") + '">' + item.tipo + "</span>" +
          '<span class="descricao-cadastro-dia">' + item.descricao + "</span>" +
          '<span class="hora-cadastro-dia">' + (item.hora || "") + "</span>";
        lista.appendChild(linha);
      });
    } else {
      lista.innerHTML = "";
      mensagem.textContent = "Nenhum cadastro feito hoje ainda.";
      mensagem.classList.add("info");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível carregar os cadastros de hoje.";
    mensagem.classList.add("erro");
  } finally {
    botao.disabled = false;
  }
}

document.getElementById("botao-atualizar-cadastros-dia").addEventListener("click", carregarCadastrosDoDia);

// Carrega assim que a tela abre, sem precisar clicar em nada.
carregarCadastrosDoDia();

// ---------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------

function modoTesteAtivo() {
  return document.getElementById("modo-teste").checked;
}

// Marca (ou desmarca) o destaque visual azul-claro nos campos,
// indicando "isto já estava cadastrado, é só confirmar".
function marcarExistente(idsCampos, ligado) {
  idsCampos.forEach(function (idCampo) {
    const input = document.getElementById(idCampo);
    if (!input) return;
    const wrapper = input.closest(".campo");
    if (wrapper) wrapper.classList.toggle("existente", ligado);
  });
}

// chamarApi() já vem de sessao.js (compartilhada entre todas as
// páginas logadas) — inclui o crachá de sessão automaticamente.
