1. Resumo do Projeto

O objetivo deste projeto foi o desenvolvimento de uma aplicação web responsiva (HTML5, CSS3 e JavaScript) integrada a uma API pública do IBGE (Serviço de Dados).
A aplicação visa consumir, tratar e renderizar dados estatísticos econômicos de forma visual e interativa.

Os requisitos iniciais de consumo de dados da API englobavam três pilares:

    Metadados: Itens e variáveis da tabela.

    Períodos: Linha temporal dos dados disponíveis.

    Localidades: Filtro por regiões, estados ou municípios.

Obs:Limitações Técnicas Encontradas (API IBGE)

O projeto obteve sucesso integral na coleta e renderização dos dados de Metadados e Períodos. 
No entanto, a integração com o endpoint de Localidades apresentou limitações estritas por parte do provedor (IBGE).
A URL gerada pelos filtros da API do agregado 7063 restringia o escopo de dados a poucas cidades específicas (como Rio Branco/AC e São Luís/MA).
 A tentativa de expandir a requisição para abranger outros estados ou regiões metropolitanas elevaria drasticamente a complexidade do tratamento de erros, gerando falhas nas requisições (requests) e comprometendo a performance das outras URLs estáveis do projeto. 
 Por esse motivo, o escopo de localidades foi mitigado nesta versão para garantir a estabilidade da aplicação.

Endpoints para Verificação. 

Localizades:
https://servicodados.ibge.gov.br/api/v3/agregados/7063/periodos/202001%7C202002%7C202003%7C202004%7C202005%7C202006%7C202007%7C202008%7C202009%7C202010%7C202011%7C202012%7C202101%7C202102%7C202103%7C202104%7C202105%7C202106%7C202107%7C202108%7C202109%7C202110%7C202111%7C202112%7C202201%7C202202%7C202203%7C202204%7C202205%7C202206%7C202207%7C202208%7C202209%7C202210%7C202211%7C202212%7C202301%7C202302%7C202303%7C202304%7C202305%7C202306%7C202307%7C202308%7C202309%7C202310%7C202311%7C202312%7C202401%7C202402%7C202403%7C202404%7C202405%7C202406%7C202407%7C202408%7C202409%7C202410%7C202411%7C202412%7C202501%7C202502%7C202503%7C202504%7C202505%7C202506%7C202507%7C202508%7C202509%7C202510%7C202511%7C202512%7C202601%7C202602%7C202603%7C202604/variaveis/44%7C68%7C2292%7C45?localidades=N1[all]|N6[1200401,2111300]&classificacao=315[7169]

Metadados(Itens da Tabela)
https://servicodados.ibge.gov.br/api/v3/agregados/7063/metadados

Periodos:
https://servicodados.ibge.gov.br/api/v3/agregados/7063/periodos

2.Requisitos do Sistema e Ambiente de Desenvolvimento

1-Sistema Operacional Windows 10 (ou superior) ou distribuições Linux homologadas.
2-Conexão ativa com a internet (Velocidade mínima recomendada: 2 Mbps para requisições assíncronas).
3-IDE/Editor de Código: Visual Studio Code, Eclipse ou similar com suporte a web design.
4-Navegadores Homologados: Mozilla Firefox, Google Chrome, Microsoft Edge ou Safari (versões atualizadas).
5-Estrutura de Diretorios Recomendada 
 css/style.css
 js/script.js
 index.html

Manual Passo a Passo de Uso de Aplicação:
 Para Fazer Pesquisas no Site Siga o Exemplo:
 
1. A aplicação permite consultas utilizando apenas Grupo, Grupo + Subgrupo ou Grupo + Subgrupo + Item, exibindo os dados correspondentes ao nível selecionado.
Não é obrigatório selecionar todos os níveis da hierarquia. 

2. Selecione o índice estatístico desejado. Como exemplo, pode ser utilizada a opção "INPC - Variação Mensal".

3. Defina o período de referência da consulta, por exemplo, 2025.

4. Clique no botão "Gerar Gráficos" para processar os dados e exibir os resultados.

5. O primeiro gráfico apresenta uma comparação entre dois itens selecionados, exibindo a evolução do índice escolhido ao longo dos meses de janeiro a dezembro dos anos consultados. 
A visualização permite analisar o comportamento dos índices e suas variações durante o período selecionado.

6. O segundo gráfico exibe exclusivamente os dados do primeiro item selecionado, 
comparando o índice escolhido com o indicador "INPC - Variação Mensal", que permanece fixo em formato de barras.

7. Quando o filtro principal estiver configurado para "INPC - Variação Mensal", o segundo gráfico exibirá apenas a série correspondente à variação mensal, sem realizar comparações adicionais.

8. A seção "Tabela Comparativa Anual" apresenta indicadores consolidados dos dados consultados, incluindo:Média;Maior valor;Menor valor; Último valor disponível.Essas informações permitem uma análise estatística resumida do período selecionado.

9. A tabela "Comparação Entre Índices" disponibiliza três modalidades de análise: 
Variação Mensal; Acumulada em 12 Meses e Peso Mensal.
Ao alterar a modalidade selecionada, os dois índices comparados são atualizados automaticamente, bem como o cálculo da diferença entre eles, permitindo uma análise comparativa mais detalhada.

10. Todos os gráficos possuem a opção "Trocar Gráfico", permitindo alternar a visualização entre os formatos de linha e barras.
Independentemente do formato selecionado, ao posicionar o cursor do mouse sobre um elemento gráfico, serão exibidas informações detalhadas referentes ao mês, ano e valor correspondente.

11. No topo da página encontra-se a opção "Limpar Filtros", responsável por remover todos os filtros aplicados e restaurar o estado inicial da aplicação, permitindo a realização de uma nova consulta.


