const STORAGE_KEY = "bingoApp_v1";

const state = {
    dados: carregarDados(),
    partidaId: null,
    editandoCartelaId: null,
    ultimoNumero: null,
    fotoCartelaDataUrl: null
};

state.dados.partidas.forEach(partida => {
    if (!partida.padrao) partida.padrao = "qualquer";
});

const $ = (id) => document.getElementById(id);

function carregarDados() {
    try {
        const dados = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (dados && Array.isArray(dados.partidas)) {
            return dados;
        }
    } catch (erro) {
        console.error("Erro ao ler localStorage:", erro);
    }

    return {
        partidas: []
    };
}

function salvarDados() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dados));
}

function gerarId() {
    return Date.now() + Math.floor(Math.random() * 10000);
}

function escaparHTML(valor) {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatarData(timestamp) {
    return new Date(timestamp).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function obterPartidaAtual() {
    return state.dados.partidas.find(p => p.id === state.partidaId) || null;
}

function mostrarTela(id) {
    document.querySelectorAll(".screen").forEach(tela => {
        tela.classList.remove("active");
    });

    $(id).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarCabecalho() {
    const partida = obterPartidaAtual();

    if (partida) {
        $("partidaAtual").textContent = partida.nome;
    } else {
        $("partidaAtual").textContent = "Nenhuma partida aberta";
    }
}

function mostrarInicio() {
    state.partidaId = null;
    state.editandoCartelaId = null;
    state.ultimoNumero = null;

    atualizarCabecalho();
    renderizarPartidas();
    mostrarTela("telaInicio");
}

function renderizarPartidas() {
    const container = $("listaPartidas");

    if (state.dados.partidas.length === 0) {
        container.innerHTML = `
            <div class="empty">
                Nenhuma partida cadastrada.<br>
                Toque em <strong>Nova partida</strong> para começar.
            </div>
        `;
        return;
    }

    const partidas = [...state.dados.partidas].sort((a, b) => b.criadaEm - a.criadaEm);

    container.innerHTML = partidas.map(partida => {
        const quantidade = partida.cartelas.length;
        const sorteados = partida.numerosSorteados.length;

        return `
            <div class="saved-card">
                <div class="saved-info">
                    <strong>${escaparHTML(partida.nome)}</strong>
                    <span>${quantidade} cartela(s) • ${sorteados} número(s) sorteado(s)</span>
                    <span>Padrão: ${escaparHTML(nomePadraoBingo(partida.padrao || "qualquer"))}</span>
                    <span>Criada em ${formatarData(partida.criadaEm)}</span>
                </div>
                <div class="saved-actions">
                    <button class="primary-btn" onclick="abrirPartida(${partida.id})">Abrir</button>
                    <button class="danger-btn" onclick="excluirPartida(${partida.id})">Excluir</button>
                </div>
            </div>
        `;
    }).join("");
}

function abrirModalPartida() {
    $("nomePartida").value = "";
    $("padraoPartida").value = "qualquer";
    $("modalPartida").classList.remove("hidden");
    setTimeout(() => $("nomePartida").focus(), 100);
}

function fecharModalPartida() {
    $("modalPartida").classList.add("hidden");
}

function criarPartida() {
    const nome = $("nomePartida").value.trim();
    const padrao = $("padraoPartida").value;

    if (!nome) {
        mostrarToast("Informe o nome da partida.");
        $("nomePartida").focus();
        return;
    }

    const partida = {
        id: gerarId(),
        nome,
        padrao,
        criadaEm: Date.now(),
        numerosSorteados: [],
        cartelas: []
    };

    state.dados.partidas.push(partida);
    salvarDados();

    fecharModalPartida();
    abrirPartida(partida.id);
}

function abrirPartida(id) {
    const partida = state.dados.partidas.find(p => p.id === id);

    if (!partida) {
        mostrarToast("Partida não encontrada.");
        return;
    }

    state.partidaId = id;
    state.ultimoNumero = partida.numerosSorteados.at(-1) || null;

    atualizarCabecalho();
    renderizarPartida();
    mostrarTela("telaPartida");
}

function excluirPartida(id) {
    const partida = state.dados.partidas.find(p => p.id === id);

    if (!partida) return;

    const confirmar = confirm(
        `Excluir a partida "${partida.nome}"?\n\nTodas as cartelas e números sorteados serão apagados.`
    );

    if (!confirmar) return;

    state.dados.partidas = state.dados.partidas.filter(p => p.id !== id);
    salvarDados();

    if (state.partidaId === id) {
        mostrarInicio();
    } else {
        renderizarPartidas();
    }
}

function renderizarPartida() {
    const partida = obterPartidaAtual();
    if (!partida) return;

    $("tituloPartida").textContent = partida.nome;
    $("resumoPartida").textContent =
        `${partida.cartelas.length} cartela(s) • ${partida.numerosSorteados.length} número(s) sorteado(s)`;

    renderizarPainelNumeros();
    renderizarUltimoNumero();
    renderizarCartelas();
}

function colunaBingo(numero) {
    if (numero >= 1 && numero <= 15) return "B";
    if (numero >= 16 && numero <= 30) return "I";
    if (numero >= 31 && numero <= 45) return "N";
    if (numero >= 46 && numero <= 60) return "G";
    if (numero >= 61 && numero <= 75) return "O";
    return "";
}

function renderizarPainelNumeros() {
    const partida = obterPartidaAtual();
    if (!partida) return;

    const sorteados = new Set(partida.numerosSorteados);

    $("painelNumeros").innerHTML = Array.from({ length: 75 }, (_, i) => i + 1)
        .map(numero => {
            const classes = [
                "number-btn",
                sorteados.has(numero) ? "drawn" : "",
                state.ultimoNumero === numero ? "last" : ""
            ].filter(Boolean).join(" ");

            return `
                <button
                    class="${classes}"
                    onclick="sortearNumero(${numero})"
                    aria-label="Número ${numero}"
                >
                    ${numero}
                </button>
            `;
        }).join("");

    $("btnDesfazer").disabled = partida.numerosSorteados.length === 0;
}

function renderizarUltimoNumero() {
    const partida = obterPartidaAtual();

    if (!partida || partida.numerosSorteados.length === 0) {
        $("ultimoNumero").textContent = "—";
        $("ultimoColuna").textContent = "Aguardando sorteio";
        return;
    }

    const numero = partida.numerosSorteados.at(-1);
    $("ultimoNumero").textContent = numero;
    $("ultimoColuna").textContent = `Coluna ${colunaBingo(numero)}`;
}

function sortearNumero(numero) {
    const partida = obterPartidaAtual();
    if (!partida) return;

    if (partida.numerosSorteados.includes(numero)) {
        mostrarToast(`O número ${numero} já foi sorteado.`);
        return;
    }

    partida.numerosSorteados.push(numero);
    state.ultimoNumero = numero;

    salvarDados();
    renderizarPartida();

    atualizarMarcacoes();

    const vencedores = verificarVencedores(partida);

    if (vencedores.length > 0) {
        abrirModalBingo(vencedores);
    }
}

function desfazerUltimo() {
    const partida = obterPartidaAtual();
    if (!partida || partida.numerosSorteados.length === 0) return;

    const removido = partida.numerosSorteados.pop();

    state.ultimoNumero = partida.numerosSorteados.at(-1) || null;

    salvarDados();
    renderizarPartida();

    mostrarToast(`Número ${removido} removido.`);
}

function abrirCadastroCartela(cartelaId = null) {
    state.editandoCartelaId = cartelaId;
    state.fotoCartelaDataUrl = null;

    const partida = obterPartidaAtual();
    if (!partida) return;

    $("erroCartela").classList.add("hidden");
    $("erroCartela").textContent = "";

    if (cartelaId) {
        const cartela = partida.cartelas.find(c => c.id === cartelaId);

        if (!cartela) return;

        $("tituloCadastro").textContent = "Editar cartela";
        $("nomeCartela").value = cartela.nome;

        criarEditorCartela(cartela.numeros);
        if (cartela.foto) state.fotoCartelaDataUrl = cartela.foto;
    } else {
        $("tituloCadastro").textContent = "Nova cartela";
        $("nomeCartela").value = "";

        criarEditorCartela(Array(24).fill(""));
    }

    alternarModoCadastro("manual");
    const inputFoto = $("fotoCartela");
    if (inputFoto) inputFoto.value = "";
    $("previewFoto")?.classList.add("hidden");
    $("btnReconhecerFoto")?.classList.add("hidden");
    $("statusOCR")?.classList.add("hidden");

    mostrarTela("telaCadastro");
    atualizarCabecalho();
}

function criarEditorCartela(numeros) {
    const letras = ["B", "I", "N", "G", "O"];
    const editor = $("editorCartela");

    let html = letras.map(letra =>
        `<div class="ticket-cell header">${letra}</div>`
    ).join("");

    let indiceNumero = 0;

    for (let linha = 0; linha < 5; linha++) {
        for (let coluna = 0; coluna < 5; coluna++) {
            if (linha === 2 && coluna === 2) {
                html += `<div class="ticket-cell free">LIVRE</div>`;
            } else {
                const valor = numeros[indiceNumero] ?? "";
                html += `
                    <div class="ticket-cell number">
                        <input
                            class="numero-cartela"
                            type="number"
                            inputmode="numeric"
                            min="1"
                            max="75"
                            maxlength="2"
                            value="${valor}"
                            data-index="${indiceNumero}"
                            aria-label="Número da cartela ${indiceNumero + 1}"
                        >
                    </div>
                `;
                indiceNumero++;
            }
        }
    }

    editor.innerHTML = html;
}

function salvarCartela() {
    const partida = obterPartidaAtual();
    if (!partida) return;

    const nome = $("nomeCartela").value.trim() || `Cartela ${String(partida.cartelas.length + 1).padStart(3, "0")}`;

    const inputs = [...document.querySelectorAll(".numero-cartela")];
    const numeros = inputs.map(input => Number(input.value));

    const validacao = validarCartela(numeros);

    if (!validacao.ok) {
        mostrarErroCartela(validacao.mensagem);
        return;
    }

    if (state.editandoCartelaId) {
        const cartela = partida.cartelas.find(c => c.id === state.editandoCartelaId);

        if (cartela) {
            cartela.nome = nome;
            cartela.numeros = numeros;
            if (state.fotoCartelaDataUrl) cartela.foto = state.fotoCartelaDataUrl;
        }
    } else {
        partida.cartelas.push({
            id: gerarId(),
            nome,
            numeros,
            marcados: [],
            foto: state.fotoCartelaDataUrl || null
        });
    }

    salvarDados();

    state.editandoCartelaId = null;

    mostrarToast("Cartela salva com sucesso!");
    renderizarPartida();
    mostrarTela("telaPartida");
}

function validarCartela(numeros) {
    if (numeros.length !== 24) return { ok:false, mensagem:"A cartela precisa ter 24 números." };
    if (numeros.some(n => !Number.isInteger(n) || n < 1 || n > 75)) return { ok:false, mensagem:"Todos os números devem estar entre 1 e 75." };
    const repetidos = numeros.filter((n,i)=>numeros.indexOf(n)!==i);
    if (repetidos.length) return { ok:false, mensagem:`Existem números repetidos: ${[...new Set(repetidos)].join(", ")}.` };
    const faixas=[[1,15],[16,30],[31,45],[46,60],[61,75]], letras=["B","I","N","G","O"];
    let i=0;
    for(let l=0;l<5;l++){ for(let c=0;c<5;c++){ if(l===2&&c===2) continue; const n=numeros[i++]; const [min,max]=faixas[c]; if(n<min||n>max) return {ok:false,mensagem:`O número ${n} está fora da faixa da coluna ${letras[c]}. A coluna ${letras[c]} aceita ${min} a ${max}.`}; }}
    return {ok:true};
}

function mostrarErroCartela(mensagem) {
    $("erroCartela").textContent = mensagem;
    $("erroCartela").classList.remove("hidden");
}


function alternarModoCadastro(modo) {
    const manual = modo === "manual";
    $("btnModoManual")?.classList.toggle("active", manual);
    $("btnModoFoto")?.classList.toggle("active", !manual);
    $("areaFotoCartela")?.classList.toggle("hidden", manual);
}
function mostrarStatusOCR(mensagem, erro=false) {
    const el=$("statusOCR"); if(!el)return; el.textContent=mensagem; el.classList.remove("hidden"); el.classList.toggle("error",erro);
}
function comprimirImagem(dataUrl,maxLado=1200){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const e=Math.min(1,maxLado/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*e));c.height=Math.max(1,Math.round(img.height*e));c.getContext("2d").drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72));};img.onerror=reject;img.src=dataUrl;});}
async function selecionarFotoCartela(event){const arquivo=event.target.files?.[0];if(!arquivo)return;if(!arquivo.type.startsWith("image/")){mostrarStatusOCR("Escolha uma imagem válida.",true);return;}try{const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(arquivo);});state.fotoCartelaDataUrl=await comprimirImagem(data);$("previewFoto").innerHTML=`<img src="${state.fotoCartelaDataUrl}" alt="Foto da cartela">`;$("previewFoto").classList.remove("hidden");$("btnReconhecerFoto").classList.remove("hidden");mostrarStatusOCR("Foto pronta. Toque em “Reconhecer números”.");}catch(e){console.error(e);mostrarStatusOCR("Não foi possível carregar a foto.",true);}}
function agrupar5(vals){const a=[...vals].sort((x,y)=>x-y);if(a.length<5)return[];let c=[a[0],a[Math.floor(a.length*.25)],a[Math.floor(a.length*.5)],a[Math.floor(a.length*.75)],a[a.length-1]];for(let r=0;r<12;r++){const g=[[],[],[],[],[]];for(const v of a){let b=0,d=Math.abs(v-c[0]);for(let i=1;i<5;i++){const nd=Math.abs(v-c[i]);if(nd<d){d=nd;b=i;}}g[b].push(v);}const nc=c.map((v,i)=>g[i].length?g[i].reduce((x,y)=>x+y,0)/g[i].length:v);if(nc.every((v,i)=>Math.abs(v-c[i])<.5))break;c=nc;}return c.sort((x,y)=>x-y);}
function clusterIndice(v,c){let b=0,d=Math.abs(v-c[0]);for(let i=1;i<c.length;i++){const nd=Math.abs(v-c[i]);if(nd<d){d=nd;b=i;}}return b;}
function preencherEditorCartela(nums){[...document.querySelectorAll(".numero-cartela")].forEach((input,i)=>input.value=nums[i]??"");$("erroCartela")?.classList.add("hidden");}
async function reconhecerFotoCartela(){if(!state.fotoCartelaDataUrl){mostrarStatusOCR("Selecione uma foto primeiro.",true);return;}if(typeof Tesseract==="undefined"){mostrarStatusOCR("O mecanismo de OCR não foi carregado. Verifique a conexão com a internet e tente novamente.",true);return;}const botao=$("btnReconhecerFoto");botao.disabled=true;mostrarStatusOCR("Preparando reconhecimento... na primeira vez pode demorar um pouco.");let worker;try{worker=await Tesseract.createWorker("eng",1,{logger:i=>{if(i.status&&typeof i.progress==="number")mostrarStatusOCR(`${i.status} ${Math.round(i.progress*100)}%`);}});await worker.setParameters({tessedit_char_whitelist:"0123456789",preserve_interword_spaces:"1",tessedit_pageseg_mode:"6"});const r=await worker.recognize(state.fotoCartelaDataUrl);const palavras=(r.data.words||[]).map(w=>{const t=String(w.text||"").replace(/[^0-9]/g,"");return{texto:t,conf:Number(w.confidence??w.conf??0),x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2};}).filter(w=>/^\d{1,2}$/.test(w.texto)).map(w=>({...w,numero:Number(w.texto)})).filter(w=>w.numero>=1&&w.numero<=75&&w.conf>=20);await worker.terminate();worker=null;if(palavras.length<20)throw new Error(`Foram reconhecidos apenas ${palavras.length} números. Tire uma foto mais nítida e de frente.`);const xs=agrupar5(palavras.map(w=>w.x)),ys=agrupar5(palavras.map(w=>w.y));if(xs.length!==5||ys.length!==5)throw new Error("Não foi possível identificar as 5 colunas e 5 linhas da cartela.");const grade=Array(24).fill(null),ocupadas=new Set();for(const w of palavras.sort((a,b)=>b.conf-a.conf)){const c=clusterIndice(w.x,xs),l=clusterIndice(w.y,ys);if(l===2&&c===2)continue;const pos=l*5+c;if(ocupadas.has(pos))continue;ocupadas.add(pos);let idx=0;for(let ll=0;ll<5;ll++)for(let cc=0;cc<5;cc++){if(ll===2&&cc===2)continue;if(ll===l&&cc===c)grade[idx]=w.numero;idx++;}}const nums=grade.filter(v=>Number.isInteger(v));if(nums.length!==24){preencherEditorCartela(grade.map(v=>v??""));throw new Error(`Foram preenchidas ${nums.length} de 24 posições. Confira e corrija os números destacados.`);}preencherEditorCartela(nums);const val=validarCartela(nums);if(!val.ok)throw new Error(`Reconhecimento concluído, mas precisa de correção: ${val.mensagem}`);mostrarStatusOCR("✅ 24 números reconhecidos. Confira a cartela antes de salvar.");}catch(e){if(worker)try{await worker.terminate();}catch(_){}console.error("OCR:",e);mostrarStatusOCR(e.message||"Não foi possível reconhecer a cartela.",true);}finally{botao.disabled=false;}}

function cancelarCadastro() {
    state.editandoCartelaId = null;
    mostrarTela("telaPartida");
    renderizarPartida();
}

function excluirCartela(cartelaId) {
    const partida = obterPartidaAtual();
    if (!partida) return;

    const cartela = partida.cartelas.find(c => c.id === cartelaId);
    if (!cartela) return;

    if (!confirm(`Excluir a cartela "${cartela.nome}"?`)) return;

    partida.cartelas = partida.cartelas.filter(c => c.id !== cartelaId);

    salvarDados();
    renderizarPartida();
    mostrarToast("Cartela excluída.");
}

function contarMarcados(cartela, partida) {
    const sorteados = new Set(partida.numerosSorteados);

    return cartela.numeros.filter(numero => sorteados.has(numero)).length;
}

function cartelaCompleta(cartela, partida) {
    return cartela.numeros.every(numero =>
        partida.numerosSorteados.includes(numero)
    );
}

function percentualCartela(cartela, partida) {
    return Math.round((contarMarcados(cartela, partida) / 24) * 100);
}

function verificarVencedores(partida) {
    const vencedores = [];
    const padrao = partida.padrao || "qualquer";
    const sorteados = new Set(partida.numerosSorteados);

    for (const cartela of partida.cartelas) {
        const marcadas = Array(25).fill(false);
        let idx = 0;

        for (let linha = 0; linha < 5; linha++) {
            for (let coluna = 0; coluna < 5; coluna++) {
                const pos = linha * 5 + coluna;
                if (linha === 2 && coluna === 2) {
                    marcadas[pos] = true; // LIVRE
                } else {
                    marcadas[pos] = sorteados.has(cartela.numeros[idx]);
                    idx++;
                }
            }
        }

        const linhas = Array.from({length:5}, (_,l) => Array.from({length:5}, (_,c)=>l*5+c));
        const colunas = Array.from({length:5}, (_,c) => Array.from({length:5}, (_,l)=>l*5+c));
        const diagonais = [[0,6,12,18,24],[4,8,12,16,20]];
        const cantos = [[0,4,20,24]];
        const x = [[0,6,12,18,24,4,8,16,20]];
        const cruz = [[2,7,12,17,22,10,11,13,14]];
        const cheia = [Array.from({length:25}, (_,i)=>i)];

        let padroes = [];
        if (padrao === "linha") padroes = linhas;
        else if (padrao === "coluna") padroes = colunas;
        else if (padrao === "diagonal") padroes = diagonais;
        else if (padrao === "quatro-cantos") padroes = cantos;
        else if (padrao === "x") padroes = x;
        else if (padrao === "cruz") padroes = cruz;
        else if (padrao === "cheia") padroes = cheia;
        else padroes = [...linhas, ...colunas, ...diagonais];

        if (padroes.some(p => p.every(pos => marcadas[pos]))) vencedores.push(cartela);
    }
    return vencedores;
}

function nomePadraoBingo(padrao) {
    const nomes = {
        qualquer: "Qualquer linha, coluna ou diagonal",
        linha: "Linha horizontal",
        coluna: "Coluna vertical",
        diagonal: "Diagonal",
        "quatro-cantos": "4 cantos",
        x: "X",
        cruz: "Cruz (+)",
        cheia: "Cartela cheia"
    };
    return nomes[padrao] || nomes.qualquer;
}

function renderizarCartelas() {
    const partida = obterPartidaAtual();

    if (!partida) return;

    const container = $("listaCartelas");

    if (partida.cartelas.length === 0) {
        container.innerHTML = `
            <div class="empty">
                Nenhuma cartela cadastrada.<br>
                Toque em <strong>＋ Cartela</strong> para cadastrar a primeira.
            </div>
        `;
        return;
    }

    const cartelas = [...partida.cartelas].sort((a, b) => {
        return percentualCartela(b, partida) - percentualCartela(a, partida);
    });

    container.innerHTML = cartelas.map((cartela, posicao) => {
        const marcados = contarMarcados(cartela, partida);
        const percentual = percentualCartela(cartela, partida);
        const ganhou = cartelaCompleta(cartela, partida);

        return `
            <div class="ticket-card">
                <div class="ticket-card-top">
                    <strong>${posicao + 1}. ${escaparHTML(cartela.nome)}</strong>
                    <span class="ticket-status">
                        ${ganhou ? "🏆 BINGO!" : `${marcados}/24 marcados`}
                    </span>
                </div>

                ${cartela.foto ? `<div class="foto-salva">📷 Foto cadastrada</div>` : ""}

                ${criarVisualCartela(cartela, partida)}

                <div class="progress">
                    <div style="width:${percentual}%"></div>
                </div>

                <div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px;">
                    <button class="secondary-btn" onclick="abrirCadastroCartela(${cartela.id})">
                        Editar
                    </button>
                    <button class="danger-btn" onclick="excluirCartela(${cartela.id})">
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function criarVisualCartela(cartela, partida) {
    const sorteados = new Set(partida.numerosSorteados);
    const letras = ["B", "I", "N", "G", "O"];

    let html = letras.map(letra =>
        `<div class="ticket-cell header">${letra}</div>`
    ).join("");

    let indexNumero = 0;

    for (let linha = 0; linha < 5; linha++) {
        for (let coluna = 0; coluna < 5; coluna++) {
            if (linha === 2 && coluna === 2) {
                html += `<div class="ticket-cell free">LIVRE</div>`;
                continue;
            }

            const numero = cartela.numeros[indexNumero];
            const marcado = sorteados.has(numero);

            html += `
                <div class="ticket-cell number ${marcado ? "marked" : ""}">
                    ${numero}
                </div>
            `;

            indexNumero++;
        }
    }

    return `<div class="ticket-grid">${html}</div>`;
}

function atualizarMarcacoes() {
    // As marcações são calculadas automaticamente com base nos números sorteados.
    // Não precisamos armazenar cada marcação separadamente.
    renderizarCartelas();
}

function abrirModalBingo(vencedores) {
    const nomes = vencedores.map(cartela => escaparHTML(cartela.nome)).join(", ");

    $("textoBingo").innerHTML =
        vencedores.length === 1
            ? `A cartela <strong>${nomes}</strong> completou um padrão de bingo!`
            : `As cartelas <strong>${nomes}</strong> completaram um padrão de bingo!`;

    $("modalBingo").classList.remove("hidden");
}

function fecharModalBingo() {
    $("modalBingo").classList.add("hidden");
}

let toastTimer;

function mostrarToast(mensagem) {
    const toast = $("toast");

    toast.textContent = mensagem;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// Eventos
$("btnNovaPartida").addEventListener("click", abrirModalPartida);
$("btnFecharModal").addEventListener("click", fecharModalPartida);
$("btnCriarPartida").addEventListener("click", criarPartida);
$("btnInicio").addEventListener("click", mostrarInicio);

$("btnAdicionarCartela").addEventListener("click", () => {
    abrirCadastroCartela();
});

$("btnCancelarCartela").addEventListener("click", cancelarCadastro);
$("btnSalvarCartela").addEventListener("click", salvarCartela);
$("btnDesfazer").addEventListener("click", desfazerUltimo);
$("btnFecharBingo").addEventListener("click", fecharModalBingo);
$("btnModoManual")?.addEventListener("click",()=>alternarModoCadastro("manual"));
$("btnModoFoto")?.addEventListener("click",()=>alternarModoCadastro("foto"));
$("fotoCartela")?.addEventListener("change",selecionarFotoCartela);
$("btnReconhecerFoto")?.addEventListener("click",reconhecerFotoCartela);

$("nomePartida").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        criarPartida();
    }
});

document.addEventListener("input", (event) => {
    if (event.target.classList.contains("numero-cartela")) {
        if (event.target.value.length > 2) {
            event.target.value = event.target.value.slice(0, 2);
        }

        $("erroCartela").classList.add("hidden");
    }
});

window.abrirPartida = abrirPartida;
window.excluirPartida = excluirPartida;
window.sortearNumero = sortearNumero;
window.abrirCadastroCartela = abrirCadastroCartela;
window.excluirCartela = excluirCartela;

mostrarInicio();
