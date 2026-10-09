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

  carregarModelosCheckList();
}

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

async function carregarModelosCheckList() {
  const area = document.getElementById("area-modelos");

  try {
    await chamarApiRapido({ acao: "listarModelos" }, desenharModelos);
  } catch (erro) {
    area.innerHTML = '<p class="aviso">Não foi possível carregar os modelos de check list agora.</p>';
  }
}

function desenharModelos(dados) {
  const area = document.getElementById("area-modelos");
  {
    if (!dados.sucesso || !dados.modelos || dados.modelos.length === 0) {
      area.innerHTML = '<p class="aviso">Nenhum modelo de check list ativo. Cadastre um em Configurações.</p>';
      return;
    }

    area.innerHTML = "";
    const grade = document.createElement("div");
    grade.className = "grade-modelos";

    dados.modelos.forEach(function (modelo) {
      const botao = document.createElement("button");
      botao.className = "cartao-modelo";
      botao.textContent = modelo.nome;
      botao.addEventListener("click", function () {
        window.location.href = "checklist.html?modelo=" + encodeURIComponent(modelo.id);
      });
      grade.appendChild(botao);
    });

    area.appendChild(grade);
  }
}
