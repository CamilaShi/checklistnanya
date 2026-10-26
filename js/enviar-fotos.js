const usuario = exigirLogin();
const idOS = new URLSearchParams(window.location.search).get("os");
const LADOS = ["Frente", "Traseira", "Lateral Esquerda", "Lateral Direita", "Painel"];
const fotosLados = {};
let fotosExtras = [];
let jaEnviadas = {};

function itemEmConstrucao(evento) {
  evento.preventDefault();
  alert("Essa tela ainda vai ser construída nas próximas etapas do projeto.");
}

function mensagem(texto, erro) {
  const m = document.getElementById("mensagem-fotos");
  m.textContent = texto;
  m.className = "mensagem-inline" + (erro ? " erro" : " sucesso");
}

function comprimirImagem(arquivo, ladoMaximo, qualidade) {
  return new Promise(function (resolve) {
    const leitor = new FileReader();
    leitor.onload = function () {
      const imagem = new Image();
      imagem.onload = function () {
        let largura = imagem.width;
        let altura = imagem.height;
        const maior = Math.max(largura, altura);
        if (maior > ladoMaximo) {
          const fator = ladoMaximo / maior;
          largura = Math.round(largura * fator);
          altura = Math.round(altura * fator);
        }
        const tela = document.createElement("canvas");
        tela.width = largura;
        tela.height = altura;
        tela.getContext("2d").drawImage(imagem, 0, 0, largura, altura);
        const dataUrl = tela.toDataURL("image/jpeg", qualidade);
        resolve({ base64: dataUrl.split(",")[1], tipoMime: "image/jpeg", nomeArquivo: arquivo.name || "foto.jpg" });
      };
      imagem.onerror = function () {
        resolve({ base64: leitor.result.split(",")[1], tipoMime: arquivo.type || "image/jpeg", nomeArquivo: arquivo.name || "foto.jpg" });
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function desenharLados() {
  const area = document.getElementById("lista-lados");
  area.innerHTML = "";
  LADOS.forEach(function (lado) {
    const linha = document.createElement("div");
    linha.className = "campo w-cheio";
    linha.style.marginBottom = "10px";
    const rotulo = document.createElement("label");
    rotulo.textContent = lado + (jaEnviadas[lado] ? " — já enviada" : "");
    linha.appendChild(rotulo);
    if (!jaEnviadas[lado]) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async function () {
        const arquivo = input.files && input.files[0];
        if (!arquivo) { delete fotosLados[lado]; return; }
        fotosLados[lado] = await comprimirImagem(arquivo, 1600, 0.75);
      });
      linha.appendChild(input);
    }
    area.appendChild(linha);
  });
}

async function iniciar() {
  if (!idOS) { mensagem("OS não informada. Use o endereço enviar-fotos.html?os=OS0037", true); return; }
  try {
    const r = await chamarApi({ acao: "obterChecklistCompleto", id_os: idOS });
    if (!r.sucesso) { mensagem(r.mensagem || "Check List não encontrado.", true); return; }
    (r.fotos || []).forEach(function (f) {
      if (f.etapa === "Parte1") jaEnviadas[f.tipo] = (jaEnviadas[f.tipo] || 0) + 1;
    });
    const qtd = (r.fotos || []).filter(function (f) { return f.etapa === "Parte1"; }).length;
    document.getElementById("titulo-os").textContent = "Fotos da vistoria — " + idOS;
    document.getElementById("resumo-os").textContent = qtd + " foto(s) da Parte 1 já estão salvas nessa OS. Envie só as que faltam.";
    desenharLados();
  } catch (e) {
    mensagem("Não foi possível carregar a OS agora.", true);
  }
}

document.getElementById("input-extras").addEventListener("change", async function () {
  const arquivos = Array.from(this.files || []);
  fotosExtras = [];
  document.getElementById("contagem-extras").textContent = arquivos.length ? "Preparando " + arquivos.length + " foto(s)…" : "";
  for (const arquivo of arquivos) fotosExtras.push(await comprimirImagem(arquivo, 1600, 0.75));
  document.getElementById("contagem-extras").textContent = fotosExtras.length ? fotosExtras.length + " foto(s) prontas para enviar." : "";
});

async function enviarEmLotes(fotos, aoAvancar) {
  const lotes = [];
  let atual = [];
  let peso = 0;
  fotos.forEach(function (f) {
    if (atual.length && (atual.length >= 3 || peso + f.dados_base64.length > 1500000)) {
      lotes.push(atual); atual = []; peso = 0;
    }
    atual.push(f); peso += f.dados_base64.length;
  });
  if (atual.length) lotes.push(atual);

  let enviadas = 0;
  for (const lote of lotes) {
    aoAvancar(enviadas, fotos.length);
    let resposta = null;
    for (let t = 0; t < 2; t++) {
      try {
        resposta = await chamarApi({ acao: "salvarFotosOS", id_os: idOS, fotos: lote });
        if (resposta && resposta.sucesso) break;
      } catch (e) {
        resposta = { sucesso: false, mensagem: "não foi possível conectar ao sistema" };
      }
    }
    if (!resposta || !resposta.sucesso) {
      return { sucesso: false, enviadas: enviadas, mensagem: (resposta && resposta.mensagem) || "erro desconhecido" };
    }
    enviadas += lote.length;
  }
  return { sucesso: true, enviadas: enviadas };
}

document.getElementById("botao-enviar-fotos").addEventListener("click", async function () {
  const botao = this;
  const fotos = [];
  LADOS.forEach(function (lado) {
    if (fotosLados[lado]) fotos.push({ etapa: "Parte1", tipo: lado, nome_arquivo: fotosLados[lado].nomeArquivo, tipo_mime: fotosLados[lado].tipoMime, dados_base64: fotosLados[lado].base64 });
  });
  fotosExtras.forEach(function (f) {
    fotos.push({ etapa: "Parte1", tipo: "Foto", nome_arquivo: f.nomeArquivo, tipo_mime: f.tipoMime, dados_base64: f.base64 });
  });
  if (!fotos.length) { mensagem("Escolha ao menos uma foto para enviar.", true); return; }

  botao.disabled = true;
  mensagem("Enviando…", false);
  const r = await enviarEmLotes(fotos, function (feitas, total) {
    botao.textContent = "Enviando fotos... " + feitas + "/" + total;
  });
  if (!r.sucesso) {
    mensagem("Foram enviadas " + r.enviadas + " de " + fotos.length + " fotos. Parou por: " + r.mensagem + ". Já enviadas não precisam ser escolhidas de novo: recarregue a página e envie só as que faltam.", true);
    botao.disabled = false;
    botao.textContent = "Enviar fotos";
    return;
  }
  botao.textContent = "Refazendo o PDF...";
  let pdf = null;
  try { pdf = await chamarApi({ acao: "gerarPdfChecklist", id_os: idOS }); } catch (e) {}
  mensagem(pdf && pdf.sucesso ? "Fotos enviadas e PDF refeito." : "Fotos enviadas, mas o PDF não foi refeito agora. Abra a OS em Visualizar e gere de novo.", !(pdf && pdf.sucesso));
  botao.textContent = "Fotos enviadas";
});

if (usuario) {
  document.getElementById("nome-usuario").textContent = usuario.nome;
  document.getElementById("perfil-usuario").textContent = usuario.perfil;
  iniciar();
}
