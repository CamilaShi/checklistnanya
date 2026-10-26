// Envia as fotos em lotes pequenos (até 3 fotos ou ~1,5 MB por chamada),
// um lote de cada vez, com uma nova tentativa se o lote falhar.
// Mandar tudo numa chamada só falha no celular quando são muitas fotos.
async function enviarFotosEmLote(idOS, fotosParaEnviar) {
  const fotos = fotosParaEnviar.map(function (item) {
    return {
      etapa: "Parte1",
      tipo: item.tipo || "Foto",
      nome_arquivo: item.foto.nomeArquivo,
      tipo_mime: item.foto.tipoMime,
      dados_base64: item.foto.base64,
    };
  });

  const LIMITE_FOTOS = 3;
  const LIMITE_BYTES = 1500000;
  const lotes = [];
  let atual = [];
  let tamanho = 0;
  fotos.forEach(function (foto) {
    const peso = foto.dados_base64.length;
    if (atual.length && (atual.length >= LIMITE_FOTOS || tamanho + peso > LIMITE_BYTES)) {
      lotes.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(foto);
    tamanho += peso;
  });
  if (atual.length) lotes.push(atual);

  const botao = document.getElementById("botao-salvar");
  let enviadas = 0;

  for (let i = 0; i < lotes.length; i++) {
    if (botao) botao.textContent = "Enviando fotos... " + enviadas + "/" + fotos.length;
    let resposta = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        resposta = await chamarApi({ acao: "salvarFotosOS", id_os: idOS, fotos: lotes[i] });
        if (resposta && resposta.sucesso) break;
      } catch (erro) {
        resposta = { sucesso: false, mensagem: "não foi possível conectar ao sistema" };
      }
    }
    if (!resposta || !resposta.sucesso) {
      return {
        sucesso: false,
        mensagem: (resposta && resposta.mensagem ? resposta.mensagem : "erro desconhecido") +
          " (" + enviadas + " de " + fotos.length + " fotos foram enviadas)",
      };
    }
    enviadas += lotes[i].length;
  }
  return { sucesso: true };
}
