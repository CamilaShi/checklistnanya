const usuario = exigirLogin();
const parametros = new URLSearchParams(window.location.search);
const idModelo = parametros.get("modelo");

let fotosSelecionadas = []; // { nomeArquivo, tipoMime, base64, dataUrl }

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  document.getElementById("campo-atendente").value = usuario.nome;

  const agora = new Date();
  document.getElementById("campo-data").value = agora.toLocaleDateString("pt-BR");
  document.getElementById("campo-hora").value = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (usuario.perfil !== "Admin") {
    const itemConfig = document.getElementById("menu-configuracoes");
    if (itemConfig) itemConfig.style.display = "none";
  } else {
    document.getElementById("novo-item-acessorio").classList.remove("oculto");
    document.getElementById("novo-item-tecnico").classList.remove("oculto");
  }

  if (!idModelo) {
    document.getElementById("mensagem-salvar").textContent = "Nenhum modelo de check list selecionado. Volte pra Central de Processos.";
    document.getElementById("mensagem-salvar").className = "mensagem-inline erro";
  } else {
    carregarCampos();
  }
}

// Recalcula a linha de "Endereço" (resumo, só leitura) a partir dos
// campos estruturados — chame sempre que Rua/Numero/Bairro/Cidade/UF
// mudarem (depois de uma busca de CEP, por exemplo).
function atualizarResumoEndereco() {
  const rua = document.getElementById("rua").value;
  const numero = document.getElementById("numero").value;
  const bairro = document.getElementById("bairro").value;
  const cidade = document.getElementById("cidade").value;
  const uf = document.getElementById("uf").value;

  const partes = [];
  if (rua) partes.push(rua + (numero ? ", " + numero : ""));
  if (bairro) partes.push(bairro);
  if (cidade) partes.push(cidade + (uf ? "/" + uf : ""));

  document.getElementById("endereco-resumo").value = partes.join(" - ");
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

function modoTesteAtivo() {
  return false; // essa tela não tem a caixinha de modo teste — sempre consulta de verdade
}

// ---------------------------------------------------------------
// Mostrar/ocultar a seção de campos completos
// ---------------------------------------------------------------

document.getElementById("botao-mais-campos").addEventListener("click", function () {
  const secao = document.getElementById("secao-mais-campos");
  const ligar = secao.classList.contains("oculto");
  secao.classList.toggle("oculto", !ligar);
  this.textContent = ligar
    ? "- Ocultar mais campos"
    : "+ Mostrar mais campos (endereço, dados técnicos do veículo...)";
});

// ---------------------------------------------------------------
// Alternar PF / PJ
// ---------------------------------------------------------------

document.querySelectorAll('input[name="tipo-pessoa"]').forEach(function (radio) {
  radio.addEventListener("change", atualizarTipoPessoa);
});

function atualizarTipoPessoa() {
  const ehPF = document.querySelector('input[name="tipo-pessoa"]:checked').value === "PF";

  document.getElementById("busca-pf").classList.toggle("oculto", !ehPF);
  document.getElementById("busca-pj").classList.toggle("oculto", ehPF);

  document.getElementById("campo-sexo").classList.toggle("oculto", !ehPF);
  document.getElementById("campo-idade").classList.toggle("oculto", !ehPF);
  document.getElementById("campo-nome-mae").classList.toggle("oculto", !ehPF);

  document.getElementById("campo-nome-fantasia").classList.toggle("oculto", ehPF);
  document.getElementById("campo-regime").classList.toggle("oculto", ehPF);
  document.getElementById("campo-situacao").classList.toggle("oculto", ehPF);
  document.getElementById("campo-inicio-atividades").classList.toggle("oculto", ehPF);

  document.getElementById("rotulo-nome").textContent = ehPF ? "Nome" : "Razão social";
}

// ---------------------------------------------------------------
// Preencher campos (busca grátis, API paga, ou escolha no dropdown
// de veículos do cliente — todos usam as mesmas duas funções)
// ---------------------------------------------------------------

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
  atualizarResumoEndereco();
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
// Carregar e renderizar os itens do check list (Acessórios / Técnico)
// ---------------------------------------------------------------

async function carregarCampos() {
  try {
    const resposta = await chamarApi({ acao: "listarCamposModelo", id_modelo: idModelo });

    if (!resposta.sucesso || !resposta.campos || resposta.campos.length === 0) {
      document.getElementById("lista-acessorios").innerHTML = '<p class="aviso">Nenhum item cadastrado pra esse modelo ainda.</p>';
      document.getElementById("lista-tecnicos").innerHTML = "";
      return;
    }

    renderizarPorCategoria(resposta.campos);
  } catch (erro) {
    document.getElementById("lista-acessorios").innerHTML = '<p class="aviso">Não foi possível carregar os itens agora.</p>';
    document.getElementById("lista-tecnicos").innerHTML = "";
  }
}

function renderizarPorCategoria(campos) {
  const acessorios = campos.filter(function (c) {
    return c.categoria === "Acessório" || c.categoria === "Acessorio";
  });
  const tecnicos = campos.filter(function (c) {
    return c.categoria === "Técnico" || c.categoria === "Tecnico";
  });

  renderizarLista(document.getElementById("lista-acessorios"), acessorios, false);
  renderizarLista(document.getElementById("lista-tecnicos"), tecnicos, true);
}

// Detecta se um item é a metade Esquerda/Direita de um par (ex:
// "Farol baixo esquerdo" + "Farol baixo direito" viram um item só,
// "Farol baixo", com E e D lado a lado).
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

// Agrupa a lista de campos em: pares (E+D juntos) e itens soltos.
function agruparPares(campos) {
  const pares = {}; // base -> { E: campo, D: campo }
  const soltos = [];

  campos.forEach(function (campo) {
    const info = detectarLado(campo.nome);
    if (!info) {
      soltos.push(campo);
      return;
    }
    if (!pares[info.base]) pares[info.base] = {};
    pares[info.base][info.lado] = campo;
  });

  const grupos = [];
  Object.keys(pares).forEach(function (base) {
    const par = pares[base];
    if (par.E && par.D) {
      grupos.push({ tipo: "par", base: base, E: par.E, D: par.D });
    } else {
      // Só achou um dos dois lados (item sem par) — trata como solto.
      soltos.push(par.E || par.D);
    }
  });

  soltos.forEach(function (campo) {
    grupos.push({ tipo: "solto", campo: campo });
  });

  return grupos;
}

function criarSelectResposta(comObservacao) {
  const select = document.createElement("select");
  select.className = "resposta-item";
  const opcoes = comObservacao ? ["", "Ok", "Não Ok"] : ["", "Sim", "Não"];
  opcoes.forEach(function (opcao) {
    const el = document.createElement("option");
    el.value = opcao;
    el.textContent = opcao === "" ? "—" : opcao;
    select.appendChild(el);
  });
  select.addEventListener("change", function () {
    select.classList.remove("resposta-preenchida", "resposta-nao-ok");
    if (select.value === "Não Ok") {
      select.classList.add("resposta-nao-ok");
    } else if (select.value) {
      select.classList.add("resposta-preenchida");
    }
  });
  return select;
}

function renderizarLista(container, campos, comObservacao) {
  container.innerHTML = "";
  container.className = comObservacao ? "lista-checklist grade-3col" : "lista-checklist grade-7col";

  if (campos.length === 0) {
    container.innerHTML = '<p class="aviso">Nenhum item nessa seção ainda.</p>';
    return;
  }

  const grupos = agruparPares(campos);

  grupos.forEach(function (grupo) {
    const item = document.createElement("div");
    item.className = "item-checklist-grade";

    if (grupo.tipo === "par") {
      item.dataset.par = "1";

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

        const select = criarSelectResposta(true);
        select.dataset.idCampo = lado.campo.id;
        grupoLado.appendChild(select);

        linhaLado.appendChild(grupoLado);
      });

      item.appendChild(linhaLado);
    } else {
      const campo = grupo.campo;

      const nome = document.createElement("div");
      nome.className = "nome-item-checklist";
      nome.textContent = campo.nome;
      item.appendChild(nome);

      const select = criarSelectResposta(comObservacao);
      select.classList.add("resposta-item-solto");
      select.dataset.idCampo = campo.id;
      item.appendChild(select);
    }

    container.appendChild(item);
  });
}

// ---------------------------------------------------------------
// Adicionar item novo ao check list (só Admin vê esse botão)
// ---------------------------------------------------------------

document.getElementById("botao-add-acessorio").addEventListener("click", function () {
  adicionarItemNovo("nome-novo-acessorio", "Acessório");
});

document.getElementById("botao-add-tecnico").addEventListener("click", function () {
  adicionarItemNovo("nome-novo-tecnico", "Técnico");
});

async function adicionarItemNovo(idInput, categoria) {
  const input = document.getElementById(idInput);
  const nome = input.value.trim();
  if (!nome) return;

  try {
    const resposta = await chamarApi({ acao: "criarCampoModelo", id_modelo: idModelo, categoria: categoria, nome: nome });

    if (!resposta.sucesso) {
      alert(resposta.mensagem || "Não foi possível adicionar o item.");
      return;
    }

    input.value = "";
    const campos = await chamarApi({ acao: "listarCamposModelo", id_modelo: idModelo });
    if (campos.sucesso) renderizarPorCategoria(campos.campos);
  } catch (erro) {
    alert("Não foi possível adicionar o item agora.");
  }
}

// ---------------------------------------------------------------
// Buscar CPF — grátis primeiro, depois API paga se não achar
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cpf").addEventListener("click", async function () {
  const cpf = document.getElementById("cpf").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  const botaoApi = document.getElementById("botao-buscar-cpf-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  botaoApi.classList.add("oculto");
  if (!cpf) return;

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "buscarClienteLocal", documento: cpf });
    if (resposta.sucesso) {
      preencherClientePF(resposta.cliente);
      mensagem.textContent = "Cliente já cadastrado (" + resposta.cliente.id + ").";
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
    this.disabled = false;
  }
});

document.getElementById("botao-buscar-cpf-api").addEventListener("click", async function () {
  const cpf = document.getElementById("cpf").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  this.disabled = true;
  this.textContent = "Consultando API...";
  try {
    const resposta = await chamarApi({ acao: "consultarCPF", cpf: cpf, homolog: modoTesteAtivo() });
    if (resposta.sucesso) {
      preencherClientePF(resposta.cliente);
      mensagem.textContent = "Dados encontrados na API.";
      mensagem.classList.add("sucesso");
      this.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "CPF não encontrado.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
    this.textContent = "Buscar na API (R$0,12)";
  }
});

// ---------------------------------------------------------------
// Buscar CNPJ — grátis primeiro, depois API paga
// ---------------------------------------------------------------

document.getElementById("botao-buscar-cnpj").addEventListener("click", async function () {
  const cnpj = document.getElementById("cnpj").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  const botaoApi = document.getElementById("botao-buscar-cnpj-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  botaoApi.classList.add("oculto");
  if (!cnpj) return;

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "buscarClienteLocal", documento: cnpj });
    if (resposta.sucesso) {
      preencherClientePJ(resposta.cliente);
      mensagem.textContent = "Cliente já cadastrado (" + resposta.cliente.id + ").";
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
    this.disabled = false;
  }
});

document.getElementById("botao-buscar-cnpj-api").addEventListener("click", async function () {
  const cnpj = document.getElementById("cnpj").value.trim();
  const mensagem = document.getElementById("mensagem-cliente");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  this.disabled = true;
  this.textContent = "Consultando API...";
  try {
    const resposta = await chamarApi({ acao: "consultarCNPJ", cnpj: cnpj, homolog: modoTesteAtivo() });
    if (resposta.sucesso) {
      preencherClientePJ(resposta.cliente);
      mensagem.textContent = "Dados encontrados na API.";
      mensagem.classList.add("sucesso");
      this.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "CNPJ não encontrado.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
    this.textContent = "Buscar na API (R$0,04)";
  }
});

// ---------------------------------------------------------------
// Veículos já cadastrados do cliente (dropdown, sem custo)
// ---------------------------------------------------------------

async function carregarVeiculosDoCliente(idCliente) {
  const campo = document.getElementById("campo-veiculos-cliente");
  const select = document.getElementById("select-veiculos-cliente");
  select.innerHTML = '<option value="">+ Veículo novo</option>';

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
  const opcao = this.options[this.selectedIndex];
  if (!opcao.value) {
    document.getElementById("placa").value = "";
    ["marca", "modelo", "fabricante", "versao", "ano-fabricacao", "ano-modelo", "cor", "combustivel",
     "nacionalidade", "tipo-veiculo", "chassi", "numero-motor", "potencia", "cilindradas",
     "motor-descricao", "transmissao", "uf-emplacamento", "cidade-emplacamento"].forEach(function (id) {
      document.getElementById(id).value = "";
    });
    return;
  }
  preencherVeiculo(JSON.parse(opcao.dataset.veiculo));
});

// ---------------------------------------------------------------
// Buscar Placa — grátis primeiro, depois API paga
// ---------------------------------------------------------------

document.getElementById("botao-buscar-placa").addEventListener("click", async function () {
  const placa = document.getElementById("placa").value.trim();
  const mensagem = document.getElementById("mensagem-veiculo");
  const botaoApi = document.getElementById("botao-buscar-placa-api");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  botaoApi.classList.add("oculto");
  if (!placa) return;

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "buscarVeiculoLocal", placa: placa });
    if (resposta.sucesso) {
      preencherVeiculo(resposta.veiculo);
      mensagem.textContent = "Veículo já cadastrado (" + resposta.veiculo.id + "). Confira e atualize o Km.";
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
    this.disabled = false;
  }
});

document.getElementById("botao-buscar-placa-api").addEventListener("click", async function () {
  const placa = document.getElementById("placa").value.trim();
  const mensagem = document.getElementById("mensagem-veiculo");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";

  this.disabled = true;
  this.textContent = "Consultando API...";
  try {
    const resposta = await chamarApi({ acao: "consultarPlaca", placa: placa, homolog: modoTesteAtivo() });
    if (resposta.sucesso) {
      preencherVeiculo(resposta.veiculo);
      mensagem.textContent = "Veículo encontrado na API.";
      mensagem.classList.add("sucesso");
      this.classList.add("oculto");
    } else {
      mensagem.textContent = resposta.mensagem || "Placa não encontrada.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    mensagem.textContent = "Não foi possível consultar agora.";
    mensagem.classList.add("erro");
  } finally {
    this.disabled = false;
    this.textContent = "Buscar na API (R$0,08)";
  }
});

// ---------------------------------------------------------------
// Buscar CEP (sempre grátis, ViaCEP)
// ---------------------------------------------------------------

document.getElementById("numero").addEventListener("input", atualizarResumoEndereco);

document.getElementById("botao-buscar-cep").addEventListener("click", async function () {  const cep = document.getElementById("cep").value.trim();
  const mensagem = document.getElementById("mensagem-endereco");
  mensagem.textContent = "";
  mensagem.className = "mensagem-inline";
  if (!cep) return;

  this.disabled = true;
  try {
    const resposta = await chamarApi({ acao: "consultarCEP", cep: cep });
    if (resposta.sucesso) {
      document.getElementById("rua").value = resposta.endereco.rua || "";
      document.getElementById("bairro").value = resposta.endereco.bairro || "";
      document.getElementById("cidade").value = resposta.endereco.cidade || "";
      document.getElementById("uf").value = resposta.endereco.uf || "";
      document.getElementById("complemento").value = resposta.endereco.complemento === "Não informado" ? "" : resposta.endereco.complemento || "";
      document.getElementById("codigo-ibge").value = resposta.endereco.codigo_ibge || "";
      atualizarResumoEndereco();
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
    this.disabled = false;
  }
});

// ---------------------------------------------------------------
// Fotos — lê como base64 no navegador, só sobe pro Drive ao salvar
// ---------------------------------------------------------------

document.getElementById("input-fotos").addEventListener("change", function (evento) {
  const arquivos = Array.from(evento.target.files || []);
  arquivos.forEach(function (arquivo) {
    const leitor = new FileReader();
    leitor.onload = function () {
      const resultado = leitor.result;
      const base64 = resultado.split(",")[1];
      fotosSelecionadas.push({ nomeArquivo: arquivo.name, tipoMime: arquivo.type || "image/jpeg", base64: base64 });
      const area = document.getElementById("area-fotos");
      const div = document.createElement("div");
      div.className = "miniatura-foto";
      div.innerHTML = '<img src="' + resultado + '" alt="Foto" />';
      area.appendChild(div);
    };
    leitor.readAsDataURL(arquivo);
  });
  evento.target.value = "";
});

// ---------------------------------------------------------------
// Salvar — primeiro grava/atualiza Cliente+Endereço+Veículo
// (cadastro completo, igual à tela de Cadastros), depois cria a OS
// ---------------------------------------------------------------

document.getElementById("form-checklist").addEventListener("submit", async function (evento) {
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
  // saída pro atendente).
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
  const placa = document.getElementById("placa").value.trim();

  if (faltando.length > 0) {
    mensagem.textContent = "Preencha antes de salvar: " + faltando.join(", ") + ".";
    mensagem.classList.add("erro");
    return;
  }

  const todosOsSelects = document.querySelectorAll("#lista-acessorios .resposta-item, #lista-tecnicos .resposta-item");
  const respostas = [];

  todosOsSelects.forEach(function (select) {
    const valor = select.value;
    if (valor) {
      respostas.push({ id_campo: select.dataset.idCampo, resposta: valor, observacao: "" });
    }
  });

  const observacaoAcessorios = document.getElementById("observacao-acessorios").value;
  const observacaoTecnicos = document.getElementById("observacao-tecnicos").value;
  const nivelCombustivelInput = document.querySelector('input[name="nivel-combustivel"]:checked');
  const nivelCombustivel = nivelCombustivelInput ? nivelCombustivelInput.value : "";

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
    placa: placa,
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

  const clientePresente = document.querySelector('input[name="cliente-presente"]:checked').value;

  botao.disabled = true;
  botao.textContent = "Salvando cadastro...";

  try {
    const respostaCadastro = await chamarApi({ acao: "salvarCadastro", cliente: cliente, endereco: endereco, veiculo: veiculo });

    if (!respostaCadastro.sucesso) {
      mensagem.textContent = respostaCadastro.mensagem || "Não foi possível salvar o cadastro.";
      mensagem.classList.add("erro");
      botao.disabled = false;
      botao.textContent = "Salvar Check List";
      return;
    }

    botao.textContent = "Salvando check list...";

    const respostaChecklist = await chamarApi({
      acao: "salvarChecklist",
      id_cliente: respostaCadastro.id_cliente,
      id_veiculo: respostaCadastro.id_veiculo,
      id_modelo: idModelo,
      cliente_presente: clientePresente,
      respostas: respostas,
      observacao_acessorios: observacaoAcessorios,
      observacao_tecnicos: observacaoTecnicos,
      nivel_combustivel: nivelCombustivel,
    });

    if (!respostaChecklist.sucesso) {
      mensagem.textContent = respostaChecklist.mensagem || "Não foi possível salvar o check list.";
      mensagem.classList.add("erro");
      botao.disabled = false;
      botao.textContent = "Salvar Check List";
      return;
    }

    const idOS = respostaChecklist.id_os;
    document.getElementById("campo-os").value = idOS;

    if (fotosSelecionadas.length > 0) {
      for (let i = 0; i < fotosSelecionadas.length; i++) {
        botao.textContent = "Enviando fotos (" + (i + 1) + "/" + fotosSelecionadas.length + ")...";
        await enviarFoto(idOS, fotosSelecionadas[i]);
      }
    }

    mensagem.textContent = "Check List salvo. OS " + idOS + " criada e a Parte 1 já está travada pra edição.";
    mensagem.classList.add("sucesso");
    botao.textContent = "Salvo";
  } catch (erro) {
    mensagem.textContent = "Não foi possível salvar agora. Verifique sua internet.";
    mensagem.classList.add("erro");
    botao.disabled = false;
    botao.textContent = "Salvar Check List";
  }
});

async function enviarFoto(idOS, foto) {
  try {
    await chamarApi({
      acao: "salvarFotoOS",
      id_os: idOS,
      etapa: "Parte1",
      tipo: "Foto",
      nome_arquivo: foto.nomeArquivo,
      tipo_mime: foto.tipoMime,
      dados_base64: foto.base64,
    });
  } catch (erro) {
    // Segue tentando as próximas fotos mesmo se uma falhar.
  }
}
