const LINK_BASE_API = 'https://servicodados.ibge.gov.br/api/v3/agregados/7063';
const URL_METADADOS = `${LINK_BASE_API}/metadados`;
const URL_PERIODOS = `${LINK_BASE_API}/periodos`;
//Conexao com os Endpoints

// Mapas de elementos da tela (DOM) para o código conseguir interagir
//DOM (interface que o navegador cria para transformar o seu código HTML em uma árvore de objetos)

const $ = (id) => document.getElementById(id);//Função de pegar elemento por id dos Endpoints

// Centralização de todos os elementos manipulados na interface
const ELEMENTOS_TELA = {
    grupoA: $('FiltroGrupo_A'), subgrupoA: $('FiltroSubgrupo_A'), itemA: $('FiltroItem_A'),
    variavelA: $('FiltroVariavel_A'), periodoA: $('FiltroPeriodo_A'),//usei $()como atalho para selecionar e manipular elementos do HTML

    grupoB: $('FiltroGrupo_B'), subgrupoB: $('FiltroSubgrupo_B'), itemB: $('FiltroItem_B'),
    variavelB: $('FiltroVariavel_B'), periodoB: $('FiltroPeriodo_B'),

    statusCarregando: $('CarregandoStatus'), statusErro: $('ErroStatus'), mensagemErro: $('errorMessage'),
    botaoGerar: $('btnGerarGraficos'), limparFiltro: $('LimparFiltro'),
    tabelaAnual: $('Tabela1'), tabelaCompCabecalho: $('TabelaComparativaCabecalho'),
    tabelaCompCorpo: $('TabelaComparativaCorpo'), alternarMetricaTabela: $('AlternarMetricaTabela')
};

// Controle do estado dos gráficos (guarda os gráficos ativos na tela,por isso esta vazio)
let graficosAtivos = { comparacao: null, categorias: null };
let cacheComparacao = null;
const tiposDeGraficoDisponiveis = ['line', 'bar'];

// Estrutura em árvore para a cascata de filtros: Grupos -> Subgrupos -> Itens
let mapeamentoCategorias = { grupos: [], subgrupos: {}, itens: {} };
//FUNÇÕES AUXILIARES / INTERFACE
// Deixa apenas a primeira letra do mês em Maiúscula (Ex: "janeiro" para "Janeiro")
const capitalizarMes = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';

// Preenche qualquer <select> dinamicamente limpando as opções antigas
function preencherCaixaSelecao(select, dados, campoValor, campoTexto, textoPadrao) {
    if (!select) return;// Se o elemento não existir na tela, sai da função,evitando erro no html
    select.innerHTML = `<option value="">${textoPadrao}</option>` +//Espera como "Selecione o Produto" 
        dados.map(item => `<option value="${item[campoValor]}">${item[campoTexto]}</option>`).join('');
}
// Inicializa as 4 estatísticas do INPC nos menus correspondentes
function preencherOpcoesInpc() {//Parte de Estatisticas

    const opcoes = [
        { id: '44', nome: 'INPC - Variação mensal' },
        { id: '68', nome: 'INPC - Variação acumulada no ano' },
        { id: '2292', nome: 'INPC - Variação acumulada em 12 meses' },
        { id: '45', nome: 'INPC - Peso mensal' }
    ];
    [ELEMENTOS_TELA.variavelA, ELEMENTOS_TELA.variavelB].forEach(sel => //Usaremos A e B para simplificar o código
        preencherCaixaSelecao(sel, opcoes, 'id', 'nome', 'Selecione a Estatística')
    );
}
// Faz os cálculos matemáticos básicos dos dados mensais
function calcularEstatisticas(valores) {
    if (!valores.length) return { media: 0, maior: 0, menor: 0, ultimo: 0 };
    const soma = valores.reduce((a, b) => a + b, 0);
    return {
        media: (soma / valores.length).toFixed(2),
        maior: Math.max(...valores).toFixed(2),
        menor: Math.min(...valores).toFixed(2),
        ultimo: valores.at(-1).toFixed(2)
    };
}
// Converte a string de valores da API ("0,52") para floats válidos (0.52)
const converterValores = (registros) => registros.map(r => parseFloat(String(r.V).replace(',', '.')));

//Charts.js calculando a diferença real no gráfico de linha/barra
const pluginDiferencaLinhaBarra = {
    id: 'pluginDiferencaLinhaBarra',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        if (chart.data.datasets.length < 2) return;

        const [ds1, ds2] = [chart.getDatasetMeta(0), chart.getDatasetMeta(1)];
        ctx.save();
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';

        ds1.data.forEach((p1, i) => {
            const p2 = ds2.data[i];
            if (!p1 || !p2) return;

            const v1 = Number(chart.data.datasets[0].data[i]);
            const v2 = Number(chart.data.datasets[1].data[i]);
            const dif = Math.abs(v2 - v1).toFixed(2);
            const y = (p1.y + p2.y) / 2;

            ctx.fillStyle = 'rgba(255,255,255,.85)';
            ctx.fillRect(p1.x - 18, y - 7, 36, 14);
            ctx.fillStyle = '#000';
            ctx.fillText(`Δ:${dif}`, p1.x, y + 4);
        });
        ctx.restore();
    }
};
Chart.register(pluginDiferencaLinhaBarra);

function criarNovoGrafico(canvas, tipo, labels, datasets, tituloCustomizado = null) {
    if (!canvas) return null;
    return new Chart(canvas, {
        type: tipo,
        data: { labels, datasets },
        options: {
            responsive: true,
            plugins: { title: { display: !!tituloCustomizado, text: tituloCustomizado || '', font: { size: 16, weight: 'bold' } } },
            scales: {
                x: { ticks: { color: '#000000', font: { weight: 'bold' } } },
                y: { ticks: { color: '#000', font: { weight: 'bold' } } }
            }
        }
    });
}

function alternarTipoDeGrafico(grafico, IDdoGrafico) {
    if (!grafico) return;//Se não existir o gráfico ele não faz nada
    if (IDdoGrafico === 'chartCategorias' && grafico.data.datasets[1]) {
        grafico.data.datasets[1].type = grafico.data.datasets[1].type === 'line' ? 'bar' : 'line';
    } else {
        const atual = grafico.data.datasets[0].type || grafico.config.type;
        const proximoTipo = tiposDeGraficoDisponiveis[(tiposDeGraficoDisponiveis.indexOf(atual) + 1) % tiposDeGraficoDisponiveis.length];
        grafico.data.datasets.forEach(ds => ds.type = proximoTipo);
    }
    grafico.update();
}
// Cria as caixas internas de estilo (Célula Verde se subiu / Vermelha se caiu comparado ao mês anterior)
function criarEstiloBolsa(valorAtual, valorAnterior) {
    if (valorAtual === null) return { seta: '', css: '' };
    if (valorAnterior === null) return { seta: '', css: 'background-color: #f8f9fa; color: #333;' }; // Janeiro fica neutro

    if (valorAtual > valorAnterior) {
        return { seta: '<span style="color: green;">▲ </span>', css: 'background-color: #edf7ed; color: green; font-weight: bold;' };
    } else if (valorAtual < valorAnterior) {
        return { seta: '<span style="color: red;">▼ </span>', css: 'background-color: #fdeded; color: red; font-weight: bold;' };
    }
    return { seta: '', css: 'background-color: #f8f9fa; color: #333;' };
}

function renderizarTabelaComparativaBolsa/*Indices*/(registrosA, registrosB, nomeA, nomeB, anoA, anoB) {
    ELEMENTOS_TELA.tabelaCompCabecalho.innerHTML = `
        <tr>
            <th>MÊS</th><th>${nomeA.toUpperCase()} (${anoA})</th>
            <th>MÊS</th><th>${nomeB.toUpperCase()} (${anoB})</th>
            <th>DIFERENÇA</th>
        </tr>`;

    const totalLinhas = Math.max(registrosA.length, registrosB.length);
    let linhasHtml = [];

    for (let i = 0; i < totalLinhas; i++) {
        const [regA, regB] = [registrosA[i], registrosB[i]];
        const [antA, antB] = [i > 0 ? registrosA[i - 1] : null, i > 0 ? registrosB[i - 1] : null];

        const [valA, valB] = [regA ? parseFloat(String(regA.V).replace(',', '.')) : null, regB ? parseFloat(String(regB.V).replace(',', '.')) : null];
        const [vAntA, vAntB] = [antA ? parseFloat(String(antA.V).replace(',', '.')) : null, antB ? parseFloat(String(antB.V).replace(',', '.')) : null];

        const estiloA = criarEstiloBolsa(valA, vAntA);
        const estiloB = criarEstiloBolsa(valB, vAntB);
        // Processa a diferença final das colunas
        let campoDiferenca = '-', corDiferenca = 'inherit';
        if (valA !== null && valB !== null) {
            const dif = (valB - valA).toFixed(2);
            campoDiferenca = dif >= 0 ? `+${dif}%` : `${dif}%`;
            corDiferenca = dif >= 0 ? 'green' : 'red';
        }

        linhasHtml.push(`
            <tr>
                <td style="text-transform: capitalize; font-weight: 500;">${regA ? regA.D3N.split(' ')[0] : '-'}</td>
                <td style="${estiloA.css}">${estiloA.seta}${regA ? regA.V : '-'}${regA ? '%' : ''}</td>
                <td style="text-transform: capitalize; font-weight: 500;">${regB ? regB.D3N.split(' ')[0] : '-'}</td>
                <td style="${estiloB.css}">${estiloB.seta}${regB ? regB.V : '-'}${regB ? '%' : ''}</td>
                <td style="font-weight: bold; color: ${corDiferenca};">${campoDiferenca}</td>
            </tr>`);
    }
    ELEMENTOS_TELA.tabelaCompCorpo.innerHTML = linhasHtml.join('');
}

function preencherTabelaAnual(nomeA, nomeB, estA, estB, metaA, metaB) {
    const gerarBlocoHtml = (nome, meta, est) => `
        <tr><td colspan="2" style="background:#f2f2f2;text-align:center;">
            <strong>${nome}</strong><br><span style="font-size:11px;color:#666;font-weight:normal;">(${meta.inpc} / ${meta.ano})</span>
        </td></tr>
        <tr><td>Média</td><td>${est.media}%</td></tr><tr><td>Maior</td><td>${est.maior}%</td></tr> 
        <tr><td>Menor</td><td>${est.menor}%</td></tr><tr><td>Último</td><td>${est.ultimo}%</td></tr>`;
    //Recebe e calcula os valores para media,maior,menor e ultimo

    ELEMENTOS_TELA.tabelaAnual.innerHTML = gerarBlocoHtml(nomeA, metaA, estA) + gerarBlocoHtml(nomeB, metaB, estB);
}

// Conexão com o servidor (api) e comportamento cascata,onde conforme for selecionando vai liberando as outras opçoes
function estruturarMetadadosProdutos(categorias) {
    let grupoAtual = null, subgrupoAtual = null;

    categorias.forEach(cat => {
        if (cat.nivel === 1) {
            grupoAtual = cat.id;//1-grupos
            mapeamentoCategorias.grupos.push({ id: cat.id, nome: cat.nome });
            mapeamentoCategorias.subgrupos[grupoAtual] = [];//Cria um array vazio aguardando dados
        } else if (cat.nivel === 2 && grupoAtual) {
            subgrupoAtual = cat.id;//2-subgrupos
            mapeamentoCategorias.subgrupos[grupoAtual].push({ id: cat.id, nome: cat.nome });
            mapeamentoCategorias.itens[subgrupoAtual] = [];
        } else if (cat.nivel === 3 && subgrupoAtual) {//3-itens
            mapeamentoCategorias.itens[subgrupoAtual].push({ id: cat.id, nome: cat.nome });
        }
    });/*Codigo baseado nos primeiros numeros dos id de grupos,subgrupos e itens*/
    [ELEMENTOS_TELA.grupoA, ELEMENTOS_TELA.grupoB].forEach(sel => preencherCaixaSelecao(sel, mapeamentoCategorias.grupos, 'id', 'nome', 'Selecione o Grupo'));
}

function configurarCascata(grupoSelect, subgrupoSelect, itemSelect) {
    grupoSelect.addEventListener('change', e => {
        preencherCaixaSelecao(subgrupoSelect, mapeamentoCategorias.subgrupos[e.target.value] || [], 'id', 'nome', 'Selecione o Subgrupo');
        //Preencheu o subgrupo de acordo com o grupo selecionado 
        //e.target.value captura o id que o usurio acabou de selecionar 
        preencherCaixaSelecao(itemSelect, [], 'id', 'nome', 'Selecione o Item');
        //Preencheu os itens de acordo com o grupo selecionado 
    });
    subgrupoSelect.addEventListener('change', e => {
        preencherCaixaSelecao(itemSelect, mapeamentoCategorias.itens[e.target.value] || [], 'id', 'nome', 'Selecione o Item');
    });
}
async function carregarDadosIniciaisDoServidor() {//Assíncrona, porque faz requisições fetch para APIs externas.
    try {
        // Dispara as duas buscas na internet ao mesmo tempo e espera ambas voltarem
        const [metaRes, periodoRes] = await Promise.all([fetch(URL_METADADOS), fetch(URL_PERIODOS)]);
        if (!metaRes.ok || !periodoRes.ok)
            throw new Error('Erro ao carregar dados do IBGE');
        //metaRes=respostaMetadados,periodoRes=respostaPeriodos

        const meta = await metaRes.json();
        const periodos = await periodoRes.json();

        // Limita e agrupa os períodos vindo do servidor apenas para opções Anuais de 2020 até 2026
        const anosVistos = new Set();
        const listaPeriodos = [];

        periodos.forEach(p => {
            const ano = p.id.slice(0, 4); // Extrai o ano

            // O JavaScript converte 'ano' para número automaticamente nas comparações
            if (ano >= 2020 && ano <= 2026 && !anosVistos.has(ano)) {
                anosVistos.add(ano);
                listaPeriodos.push({ id: p.id, texto: ano });
            }
        });
        listaPeriodos.reverse();

        [ELEMENTOS_TELA.periodoA, ELEMENTOS_TELA.periodoB].forEach(sel =>
            preencherCaixaSelecao(sel, listaPeriodos, 'id', 'texto', 'Selecione o Período'));
        /*Cria um array com os dois elementos [selA, selB] e roda um forEach. 
        Para cada um,chama a função "preencherCaixaSelecao" usando "listaPeriodos" que filtrou no código anterior (com os anos entre 2020 e 2026).*/

        if (meta.classificacoes?.[0]?.categorias) estruturarMetadadosProdutos(meta.classificacoes[0].categorias);
        //verifica se meta possui a lista de categorias dentro de classificações
        //obs:"?" foi utilizado para caso estiver vazio,o codigo não quebrar nem aparecer vazio,somente o ignorando

    } catch (erro) {
        ELEMENTOS_TELA.statusErro?.classList.remove('hidden');
        if (ELEMENTOS_TELA.mensagemErro) ELEMENTOS_TELA.mensagemErro.textContent = erro.message;
        console.error(erro);//em caso de erro de carregamento,vai mandar para console.log o erro detalhado
    } finally {
        ELEMENTOS_TELA.statusCarregando?.classList.add('hidden');
    }
}
async function buscarSerie(variavel, periodo, categoria) {
    const ano = periodo.substring(0, 4);//pega o ano selecionado e monta strings de janeiro a dezembro(202501-202512)
    const resposta = await fetch(`https://apisidra.ibge.gov.br/values/t/7063/n1/1/v/${variavel}/p/${ano}01-${ano}12/c315/${categoria}`);
    const json = await resposta.json();
    return json.slice(1);//retorna somente dados numericos puros
}
// Captura de eventos de botões / cliques
if (ELEMENTOS_TELA.botaoGerar) {
    ELEMENTOS_TELA.botaoGerar.addEventListener('click', async () => {
        try {
            const itemA = ELEMENTOS_TELA.itemA.value || ELEMENTOS_TELA.subgrupoA.value || ELEMENTOS_TELA.grupoA.value;
            const itemB = ELEMENTOS_TELA.itemB.value || ELEMENTOS_TELA.subgrupoB.value || ELEMENTOS_TELA.grupoB.value;
            //Se o usuario escolher somente o subgrupo sem o item especifico,o sistema retornará da mesma forma sem necessitar do item

            if (!itemA || !itemB || !ELEMENTOS_TELA.variavelA.value || !ELEMENTOS_TELA.variavelB.value || !ELEMENTOS_TELA.periodoA.value || !ELEMENTOS_TELA.periodoB.value) {
                return alert('Preencha todos os filtros necessários.');
            }

            const varIdA = ELEMENTOS_TELA.variavelA.value;
            const promessas = [
                buscarSerie(varIdA, ELEMENTOS_TELA.periodoA.value, itemA),
                buscarSerie(ELEMENTOS_TELA.variavelB.value, ELEMENTOS_TELA.periodoB.value, itemB)
            ];

            if (varIdA !== '44') promessas.push(buscarSerie('44', ELEMENTOS_TELA.periodoA.value, itemA));

            const [dadosA, dadosB, dadosAMensalFixa] = await Promise.all(promessas);
            const valoresA = converterValores(dadosA);
            const valoresB = converterValores(dadosB);
            const valoresAMensalFixa = dadosAMensalFixa ? converterValores(dadosAMensalFixa) : valoresA;

            // Coleta os rótulos de texto das opções selecionadas para títulos das tabelas
            const capturarTexto = (el) => el.options[el.selectedIndex]?.text || '';
            const nomeA = ELEMENTOS_TELA.itemA.value ? capturarTexto(ELEMENTOS_TELA.itemA) : (ELEMENTOS_TELA.subgrupoA.value ? capturarTexto(ELEMENTOS_TELA.subgrupoA) : capturarTexto(ELEMENTOS_TELA.grupoA));
            const nomeB = ELEMENTOS_TELA.itemB.value ? capturarTexto(ELEMENTOS_TELA.itemB) : (ELEMENTOS_TELA.subgrupoB.value ? capturarTexto(ELEMENTOS_TELA.subgrupoB) : capturarTexto(ELEMENTOS_TELA.grupoB));

            const inpcTextoA = capturarTexto(ELEMENTOS_TELA.variavelA);
            const inpcTextoB = capturarTexto(ELEMENTOS_TELA.variavelB);
            const anoTextoA = capturarTexto(ELEMENTOS_TELA.periodoA);
            const anoTextoB = capturarTexto(ELEMENTOS_TELA.periodoB);

            cacheComparacao = { dadosA, dadosB, nomeA, nomeB, anoA: anoTextoA, anoB: anoTextoB };

            graficosAtivos.comparacao?.destroy();
            graficosAtivos.categorias?.destroy();

            // Rótulo horizontal com os meses capitalizados para os gráficos
            const labelsGrafico = dadosA.map(r => capitalizarMes(r.D3N.split(' ')[0]));

            graficosAtivos.comparacao = criarNovoGrafico($('chartComparacao'), 'line', labelsGrafico, [
                { label: `${nomeA} (${anoTextoA})`, data: valoresA, borderColor: '#36A2EB', backgroundColor: '#36A2EB', borderWidth: 2, fill: false },
                { label: `${nomeB} (${anoTextoB})`, data: valoresB, borderColor: '#1e7979', backgroundColor: '#1e7979', borderWidth: 2, fill: false }
            ]);

            const datasetsGrafico2 = [{ label: `INPC - Variação mensal`, data: valoresAMensalFixa, backgroundColor: '#1e7979', borderColor: '#1e7979', type: 'bar', order: 2 }];
            if (varIdA !== '44') {
                datasetsGrafico2.push({ label: inpcTextoA, data: valoresA, backgroundColor: '#36A2EB', borderColor: '#36A2EB', type: 'line', fill: false, order: 1 });
            } else {
                delete datasetsGrafico2[0].type;
            }

            graficosAtivos.categorias = criarNovoGrafico($('chartCategorias'), 'bar', labelsGrafico, datasetsGrafico2, `Evolução Mensal do Ano Selecionado (${anoTextoA}) - ${nomeA}`);

            preencherTabelaAnual(nomeA, nomeB, calcularEstatisticas(valoresA), calcularEstatisticas(valoresB), { inpc: inpcTextoA, ano: anoTextoA }, { inpc: inpcTextoB, ano: anoTextoB });
            renderizarTabelaComparativaBolsa(dadosA, dadosB, nomeA, nomeB, anoTextoA, anoTextoB);

        } catch (erro) {
            console.error(erro);
            alert('Ocorreu um erro ao gerar os gráficos.');
        }
    });
}

if (ELEMENTOS_TELA.alternarMetricaTabela) {
    ELEMENTOS_TELA.alternarMetricaTabela.addEventListener('change', async e => {
        if (!cacheComparacao) return;
        let varId = e.target.value === 'var_12m' ? '2292' : (e.target.value === 'peso_mensal' ? '45' : '44');

        const itemA = ELEMENTOS_TELA.itemA.value || ELEMENTOS_TELA.subgrupoA.value || ELEMENTOS_TELA.grupoA.value;
        const itemB = ELEMENTOS_TELA.itemB.value || ELEMENTOS_TELA.subgrupoB.value || ELEMENTOS_TELA.grupoB.value;

        const [dadosA, dadosB] = await Promise.all([
            buscarSerie(varId, ELEMENTOS_TELA.periodoA.value, itemA),
            buscarSerie(varId, ELEMENTOS_TELA.periodoB.value, itemB)
        ]);
        renderizarTabelaComparativaBolsa(dadosA, dadosB, cacheComparacao.nomeA, cacheComparacao.nomeB, cacheComparacao.anoA, cacheComparacao.anoB);
    });//codigo para mudança de escolha caso desejavel alterar a metrica de comparação
}

if (ELEMENTOS_TELA.limparFiltro) {
    ELEMENTOS_TELA.limparFiltro.addEventListener('click', () => {
        Object.values(ELEMENTOS_TELA).forEach(el => { if (el && el.selectedIndex !== undefined) el.selectedIndex = 0; });
        ELEMENTOS_TELA.tabelaAnual.innerHTML = '';
        ELEMENTOS_TELA.tabelaCompCabecalho.innerHTML = `<tr><th>Mês</th><th>A</th><th>Mês</th><th>B</th><th>Diferença</th></tr>`;
        ELEMENTOS_TELA.tabelaCompCorpo.innerHTML = '';
        cacheComparacao = null;
        graficosAtivos.comparacao?.destroy();
        graficosAtivos.categorias?.destroy();
        graficosAtivos.comparacao = null;
        graficosAtivos.categorias = null;
    });
}
document.querySelectorAll('.changeChartBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (target === 'chartComparacao') alternarTipoDeGrafico(graficosAtivos.comparacao, 'chartComparacao');
        if (target === 'chartCategorias') alternarTipoDeGrafico(graficosAtivos.categorias, 'chartCategorias');
    });
});
// Ponto de entrada da aplicação
document.addEventListener('DOMContentLoaded', () => {
    preencherOpcoesInpc();
    configurarCascata(ELEMENTOS_TELA.grupoA, ELEMENTOS_TELA.subgrupoA, ELEMENTOS_TELA.itemA);
    configurarCascata(ELEMENTOS_TELA.grupoB, ELEMENTOS_TELA.subgrupoB, ELEMENTOS_TELA.itemB);
    carregarDadosIniciaisDoServidor();
}); 