// Gera o template DOCX do contrato com variáveis {variavel} para o docxtemplater
// Execute: node scripts/gerar-contrato-template.js

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  BorderStyle, WidthType, AlignmentType, VerticalAlign, Header,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Métricas de página ──────────────────────────────────────────────────────
// A4: 21cm = 11906 twips; margens 2.5cm = 1418 twips cada lado
// Largura útil: 16cm = 9072 twips
const CONTENT_W = 9072;
const COL_LABEL = 2600;  // coluna "atributo" em tabelas 2-col
const COL_VALUE = CONTENT_W - COL_LABEL; // 6472

// ─── Cores ───────────────────────────────────────────────────────────────────
const DARK   = "1D3557";
const GRAY_H = "3A3A3A";
const GRAY_L = "F4F4F4";
const WHITE  = "FFFFFF";
const BORDER = "CCCCCC";
const BLACK  = "1A1A1A";

// ─── Helpers texto ───────────────────────────────────────────────────────────
const pt = (n) => n * 2;

const run = (text, opts = {}) =>
  new TextRun({ text, size: pt(10), color: BLACK, font: "Arial", ...opts });

const bold = (text, sz = 10) =>
  new TextRun({ text, bold: true, size: pt(sz), color: BLACK, font: "Arial" });

const spacer = (pts = 6) =>
  new Paragraph({ text: "", spacing: { after: pt(pts) } });

const hr = () =>
  new Paragraph({
    text: "",
    border: { bottom: { color: BORDER, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: pt(6) },
  });

const p = (runs, opts = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: pt(5) },
    ...opts,
  });

const pCenter = (runs, opts = {}) =>
  new Paragraph({
    children: Array.isArray(runs) ? runs : [run(runs)],
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(4) },
    ...opts,
  });

const titulo = (text) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(13), color: DARK, font: "Arial", allCaps: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: pt(4), before: pt(4) },
  });

const cabecalhoSecao = (text) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true, size: pt(10), color: WHITE, font: "Arial" })],
    alignment: AlignmentType.LEFT,
    spacing: { before: pt(10), after: pt(2) },
    shading: { type: "solid", color: DARK, fill: DARK },
    indent: { left: 120 },
  });

const sub = (text) =>
  p([run(text)], { indent: { left: 720, hanging: 360 } });

const item = (text) =>
  p([run(text)], { indent: { left: 1440, hanging: 360 } });

// ─── Helpers de tabela ───────────────────────────────────────────────────────
const borda = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left:   { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right:  { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

const mkCell = (text, { w, shade = false, center = false, isHeader = false, span = 1, color } = {}) =>
  new TableCell({
    columnSpan: span,
    width: w ? { size: w, type: WidthType.DXA } : undefined,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        bold: isHeader,
        size: pt(9.5),
        color: isHeader ? WHITE : (color ?? BLACK),
        font: "Arial",
      })],
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    })],
    shading: shade
      ? { type: "solid", color: GRAY_L, fill: GRAY_L }
      : isHeader
        ? { type: "solid", color: DARK, fill: DARK }
        : undefined,
    borders: borda,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });

// Tabela 2 colunas: label | value
const tabela2col = (rows) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: rows.map(([label, value, shade]) =>
      new TableRow({
        children: [
          mkCell(label, { w: COL_LABEL, shade: !!shade }),
          mkCell(value, { w: COL_VALUE, shade: !!shade }),
        ],
      })
    ),
  });

const headerFullWidth = (text) =>
  new TableRow({
    children: [mkCell(text, { w: CONTENT_W, isHeader: true, span: 2, center: true })],
  });

// ─── Tabela de qualificação das partes ──────────────────────────────────────
const tabelaPartes = () =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: [
      headerFullWidth("VENDEDOR (LOJA)"),
      new TableRow({ children: [mkCell("Razão Social / Nome", { w: COL_LABEL, shade: true }), mkCell("{nome_empresa}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("Nome Fantasia", { w: COL_LABEL }), mkCell("{nome_fantasia}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("CNPJ / CPF", { w: COL_LABEL, shade: true }), mkCell("{cnpj_empresa}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("Endereço", { w: COL_LABEL }), mkCell("{endereco_completo_empresa}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Telefone / WhatsApp", { w: COL_LABEL, shade: true }), mkCell("{telefone_empresa}  |  {whatsapp_empresa}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("E-mail", { w: COL_LABEL }), mkCell("{email_empresa}", { w: COL_VALUE })] }),
      // espaço separador
      new TableRow({ children: [
        new TableCell({ columnSpan: 2, children: [spacer(2)],
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
      ]}),
      headerFullWidth("COMPRADOR (CLIENTE)"),
      new TableRow({ children: [mkCell("Nome Completo", { w: COL_LABEL, shade: true }), mkCell("{nome_cliente}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("CPF", { w: COL_LABEL }), mkCell("{cpf_cliente}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("RG", { w: COL_LABEL, shade: true }), mkCell("{rg_cliente}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("Data de Nascimento", { w: COL_LABEL }), mkCell("{nascimento_cliente}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Endereço", { w: COL_LABEL, shade: true }), mkCell("{endereco_cliente}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("CEP", { w: COL_LABEL }), mkCell("{cep_cliente}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Telefone / E-mail", { w: COL_LABEL, shade: true }), mkCell("{telefone_cliente}  |  {email_cliente}", { w: COL_VALUE, shade: true })] }),
    ],
  });

// ─── Tabela de produto ───────────────────────────────────────────────────────
const tabelaProduto = () =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL_LABEL, COL_VALUE],
    rows: [
      new TableRow({ children: [mkCell("ATRIBUTO", { w: COL_LABEL, isHeader: true, center: true }), mkCell("ESPECIFICAÇÃO TÉCNICA", { w: COL_VALUE, isHeader: true, center: true })] }),
      new TableRow({ children: [mkCell("Fabricante / Marca", { w: COL_LABEL }), mkCell("{marca}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Linha / Modelo", { w: COL_LABEL, shade: true }), mkCell("{modelo}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("Cor", { w: COL_LABEL }), mkCell("{cor}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Capacidade de Armazenamento", { w: COL_LABEL, shade: true }), mkCell("{capacidade}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("IMEI 1", { w: COL_LABEL }), mkCell("{imei}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Número de Série (S/N)", { w: COL_LABEL, shade: true }), mkCell("{serial}", { w: COL_VALUE, shade: true })] }),
      new TableRow({ children: [mkCell("Estado de Conservação", { w: COL_LABEL }), mkCell("{condicao}", { w: COL_VALUE })] }),
      new TableRow({ children: [mkCell("Saúde da Bateria", { w: COL_LABEL, shade: true }), mkCell("{saude_bateria}", { w: COL_VALUE, shade: true })] }),
    ],
  });

// ─── Tabela de pagamento ─────────────────────────────────────────────────────
const C5 = Math.floor(CONTENT_W / 5); // ~1814 twips por coluna
const tabelaPagamento = () =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [C5, C5, C5, C5, CONTENT_W - C5 * 4],
    rows: [
      new TableRow({ children: [
        mkCell("VALOR TOTAL", { w: C5, isHeader: true, center: true }),
        mkCell("ENTRADA", { w: C5, isHeader: true, center: true }),
        mkCell("PARCELAS", { w: C5, isHeader: true, center: true }),
        mkCell("VALOR DA PARCELA", { w: C5, isHeader: true, center: true }),
        mkCell("FORMA DE PAGAMENTO", { w: CONTENT_W - C5 * 4, isHeader: true, center: true }),
      ]}),
      new TableRow({ children: [
        mkCell("{valor_total}", { w: C5, center: true }),
        mkCell("{valor_entrada}", { w: C5, center: true }),
        mkCell("{quantidade_parcelas}x", { w: C5, center: true }),
        mkCell("{valor_parcela}", { w: C5, center: true }),
        mkCell("{forma_pagamento}", { w: CONTENT_W - C5 * 4, center: true }),
      ]}),
    ],
  });

// ─── Tabela de garantia ───────────────────────────────────────────────────────
const G = [2500, 1400, 3200, CONTENT_W - 2500 - 1400 - 3200];
const tabelaGarantia = () =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: G,
    rows: [
      new TableRow({ children: [
        mkCell("TIPO DE GARANTIA", { w: G[0], isHeader: true }),
        mkCell("PRAZO", { w: G[1], isHeader: true, center: true }),
        mkCell("ABRANGÊNCIA", { w: G[2], isHeader: true }),
        mkCell("FUNDAMENTO", { w: G[3], isHeader: true }),
      ]}),
      new TableRow({ children: [
        mkCell("Garantia Contratual do Vendedor", { w: G[0] }),
        mkCell("{garantia} da entrega", { w: G[1], center: true }),
        mkCell("Defeitos técnicos de fabricação comprovados", { w: G[2] }),
        mkCell("Previsão contratual", { w: G[3] }),
      ]}),
      new TableRow({ children: [
        mkCell("Garantia Legal – CDC (bem durável)", { w: G[0], shade: true }),
        mkCell("90 dias", { w: G[1], center: true, shade: true }),
        mkCell("Vícios ocultos não identificáveis na entrega", { w: G[2], shade: true }),
        mkCell("Art. 26, II, CDC", { w: G[3], shade: true }),
      ]}),
      new TableRow({ children: [
        mkCell("Garantia do Fabricante (Apple) – se novo", { w: G[0] }),
        mkCell("1 ano", { w: G[1], center: true }),
        mkCell("Defeitos de fabricação na cadeia original", { w: G[2] }),
        mkCell("Política Apple", { w: G[3] }),
      ]}),
    ],
  });

// ─── Assinaturas ─────────────────────────────────────────────────────────────
const HALF = Math.floor(CONTENT_W / 2);
const assinaturas = (t1, sub1, t2, sub2) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [HALF, CONTENT_W - HALF],
    rows: [
      new TableRow({ children: [
        new TableCell({
          width: { size: HALF, type: WidthType.DXA },
          children: [
            new Paragraph({ children: [run("_".repeat(38))], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [bold(t1)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [run(sub1, { size: pt(9) })], alignment: AlignmentType.CENTER }),
          ],
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
        new TableCell({
          width: { size: CONTENT_W - HALF, type: WidthType.DXA },
          children: [
            new Paragraph({ children: [run("_".repeat(38))], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [bold(t2)], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [run(sub2, { size: pt(9) })], alignment: AlignmentType.CENTER }),
          ],
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        }),
      ]}),
    ],
  });

// ─── DOCUMENTO ───────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: pt(10), color: BLACK } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1134, bottom: 1134, left: 1418, right: 1418 }, // 2cm topo/baixo, 2.5cm lados
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "{nome_empresa}", bold: true, size: pt(10), color: DARK, font: "Arial" }),
              new TextRun({ text: "   |   Contrato nº {numero_contrato}   |   {data}", size: pt(9), color: "666666", font: "Arial" }),
            ],
            alignment: AlignmentType.LEFT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BORDER } },
            spacing: { after: pt(3) },
          }),
        ],
      }),
    },
    children: [
      // ── TÍTULO
      spacer(4),
      titulo("INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE APARELHO CELULAR"),
      pCenter([
        run("Contrato nº "),
        bold("{numero_contrato}"),
        run("   —   "),
        bold("{data_extenso}"),
      ]),
      hr(),
      spacer(4),

      // ── PARTES
      cabecalhoSecao("QUALIFICAÇÃO DAS PARTES"),
      spacer(4),
      tabelaPartes(),
      spacer(6),

      p([
        run("Pelo presente instrumento particular, as partes acima qualificadas, doravante denominadas simplesmente "),
        bold("VENDEDOR"), run(" e "), bold("COMPRADOR"),
        run(", celebram o presente "), bold("Contrato de Compra e Venda"),
        run(", que se regerá pelas cláusulas e condições a seguir estabelecidas, tendo por objeto o bem descrito na Cláusula Primeira."),
      ]),

      spacer(6),

      // ── CLÁUSULA 1
      cabecalhoSecao("CLÁUSULA 1ª – DO OBJETO DO CONTRATO"),
      spacer(4),
      p("O presente contrato tem por objeto a compra e venda do aparelho celular pertencente ao VENDEDOR, identificado pelas especificações técnicas a seguir:"),
      spacer(4),
      tabelaProduto(),
      spacer(6),

      sub("§ 1º O número de série (S/N) registrado neste instrumento poderá ser utilizado pelo VENDEDOR como prova de propriedade em sede de eventual procedimento administrativo junto à Apple Inc. ou perante o Poder Judiciário."),
      sub("§ 2º O COMPRADOR declara ter vistoriado o aparelho, conferido suas características físicas e funcionais e recebido o equipamento em conformidade com as especificações descritas nesta cláusula."),
      sub("§ 3º No momento da entrega, o COMPRADOR declara, sob as penas da lei, que: inspecionou o BEM minuciosamente e testou todas as funcionalidades essenciais, incluindo: chamadas, câmeras, Face ID / Touch ID, Wi-Fi, dados móveis 4G/5G, Bluetooth, GPS e carregamento."),

      spacer(6),

      // ── CLÁUSULA 2
      cabecalhoSecao("CLÁUSULA 2ª – DO PREÇO, FORMA E CONDIÇÕES DE PAGAMENTO"),
      spacer(4),
      p([run("O COMPRADOR compromete-se a pagar ao VENDEDOR o valor total de "), bold("{valor_total}"), run(", conforme condições abaixo:")]),
      spacer(4),
      tabelaPagamento(),
      spacer(6),

      p([bold("Parcelas: "), run("{parcelas}")]),
      spacer(4),

      sub("§ 1º O pagamento das parcelas será realizado exclusivamente por meio de PIX, dinheiro, cartão de crédito ou cartão de débito na conta titular fornecida pelo VENDEDOR, não sendo admitida qualquer outra modalidade de pagamento não prevista neste instrumento, salvo ajuste expresso entre as partes por escrito."),
      sub("§ 2º O COMPRADOR está ciente de que os valores pagos a título de entrada não serão devolvidos em caso de desistência imotivada, ressalvadas as hipóteses de vício do produto ou rescisão por descumprimento contratual imputável ao VENDEDOR."),
      sub("§ 3º O atraso no pagamento de qualquer parcela implicará incidência de multa moratória de 2%, juros de mora de 1% ao mês e correção monetária conforme índice oficial aplicável."),
      sub("§ 4º Fica facultado ao COMPRADOR realizar a quitação antecipada, total ou parcial, das parcelas vincendas, com redução proporcional dos juros, nos termos do art. 52, § 2º, do CDC."),

      spacer(6),

      // ── CLÁUSULA 3
      cabecalhoSecao("CLÁUSULA 3ª – DA CLÁUSULA DE RESERVA DE DOMÍNIO"),
      spacer(4),
      p("Nos termos dos artigos 521 a 528 do Código Civil (Lei n. 10.406/2002), as partes estipulam a CLÁUSULA DE RESERVA DE DOMÍNIO, pela qual a transmissão da propriedade plena do BEM ao COMPRADOR fica condicionada ao pagamento integral de todas as parcelas previstas na Cláusula 2ª, incluindo eventuais encargos moratórios."),
      sub("§ 1º O COMPRADOR recebe o BEM na qualidade de mero detentor e depositário fiel, assumindo as responsabilidades civis e criminais decorrentes da guarda, conservação e uso adequado do aparelho."),
      sub("§ 2º Enquanto perdurar a reserva de domínio, o COMPRADOR está expressamente proibido de:"),
      item("I – vender, ceder, transferir ou alienar o BEM a terceiros;"),
      item("II – oferecer o BEM em garantia, penhor, caução ou alienação fiduciária;"),
      item("III – realizar modificações técnicas ou de software sem autorização prévia escrita do VENDEDOR;"),
      item("IV – afastar-se do domicílio declarado por período superior a 30 dias sem comunicação ao VENDEDOR;"),
      item("V – sujeitar o BEM a penhora, aresto, sequestro ou constrição judicial por dívidas perante terceiros."),
      sub("§ 3º O descumprimento das vedações acima importará: (I) vencimento antecipado da dívida; (II) responsabilidade criminal (art. 179 do Código Penal); (III) obrigação de indenizar o VENDEDOR por perdas e danos (art. 402 do Código Civil)."),

      spacer(6),

      // ── CLÁUSULA 4
      cabecalhoSecao("CLÁUSULA 4ª – DO VENCIMENTO ANTECIPADO E DO INADIMPLEMENTO"),
      spacer(4),
      p("O inadimplemento de 02 (duas) parcelas, consecutivas ou não, bem como o descumprimento de qualquer obrigação prevista neste contrato, acarretará o vencimento antecipado das parcelas vincendas, tornando exigível todo o saldo devedor."),
      sub("§ 1º Verificado o inadimplemento, o VENDEDOR poderá, independentemente de notificação judicial:"),
      item("I – Exigir o pagamento integral do saldo devedor;"),
      item("II – Promover cobrança judicial ou extrajudicial;"),
      item("III – Protestar o débito e/ou inscrever o nome do COMPRADOR nos órgãos de proteção ao crédito;"),
      item("IV – Exigir a devolução imediata do aparelho;"),
      item("V – Promover as medidas judiciais cabíveis para recuperação do bem e satisfação do crédito."),
      sub("§ 2º Em caso de resolução contratual por culpa do COMPRADOR, os valores pagos poderão ser retidos pelo VENDEDOR para compensação da depreciação do aparelho e prejuízos suportados, observados os limites legais."),

      spacer(6),

      // ── CLÁUSULA 5
      cabecalhoSecao("CLÁUSULA 5ª – DA GARANTIA CONTRATUAL E LEGAL"),
      spacer(4),
      p("O BEM objeto do presente contrato é coberto pelas seguintes garantias:"),
      spacer(4),
      tabelaGarantia(),
      spacer(6),

      sub("§ 1º A garantia contratual NÃO abrange: (a) danos físicos por quedas, impactos ou pressão mecânica; (b) danos por imersão ou exposição a líquidos; (c) danos por mau uso ou operação fora das especificações do fabricante; (d) danos por vírus, jailbreak ou modificações não autorizadas; (e) roubo, furto, extravio, força maior ou caso fortuito."),
      sub("§ 2º Para BEM classificado como SEMINOVO ou USADO, a garantia do fabricante pode estar expirada, sendo a garantia contratual do VENDEDOR a única vigente, além da garantia legal do CDC para vícios ocultos."),

      spacer(6),

      // ── CLÁUSULA 6
      cabecalhoSecao("CLÁUSULA 6ª – DO FORO"),
      spacer(4),
      p([
        run("Fica eleito o foro da Comarca de "),
        bold("{cidade_empresa}/{estado_empresa}"),
        run(", para dirimir quaisquer dúvidas advindas do presente contrato. Dispensam-se reciprocamente as partes o reconhecimento de firma, reconhecendo como verdadeiras as assinaturas apostas, valendo-o como título executivo, mesmo sem assinatura de duas testemunhas (STJ, REsp 400687)."),
      ]),

      spacer(6),

      p("E para firmeza e como prova de assim haverem acordado e contratado, as partes assinam o presente instrumento particular em 2 (duas) vias de igual teor e forma."),
      spacer(4),
      pCenter([bold("{cidade_empresa}/{estado_empresa}, {data_extenso}", 10)]),
      spacer(14),

      // ── ASSINATURAS
      assinaturas(
        "VENDEDOR",
        "{nome_empresa}",
        "COMPRADOR",
        "{nome_cliente}  —  CPF: {cpf_cliente}"
      ),

      spacer(14),

      new Paragraph({
        children: [run("TESTEMUNHAS:", { bold: true, color: "555555", size: pt(9.5) })],
        alignment: AlignmentType.LEFT,
        spacing: { after: pt(2) },
      }),
      assinaturas(
        "Testemunha 1",
        "Nome: ____________________________  CPF: _______________",
        "Testemunha 2",
        "Nome: ____________________________  CPF: _______________"
      ),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const dest = path.join(__dirname, "..", "img", "CONTRATO APPLE.docx");
  fs.writeFileSync(dest, buffer);
  console.log("✅ Contrato gerado em:", dest);
}).catch((err) => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
