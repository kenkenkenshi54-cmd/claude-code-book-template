// Generate Sumitomo Corporation Auto Finance Business DD docx
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  convertInchesToTwip,
} = require(path.resolve(__dirname, '..', '..', '..', 'node_modules', 'docx'));

const OUT_FILE = path.resolve(__dirname, '..', 'output', 'sumitomo_autofinance_business_dd_20260501.docx');

const FONT = 'Yu Gothic';

const COLOR = {
  H1: '1F3A5F',
  H2: '2C4F7A',
  H3: '404040',
  HEADER_BG: '1F3A5F',
  HEADER_FG: 'FFFFFF',
  ALT_ROW: 'F2F4F7',
};

// Helpers
function p(text, opts = {}) {
  const { bold = false, size = 21, italic = false, color = '000000', after = 80, before = 0, indent = 0, alignment = AlignmentType.LEFT } = opts;
  return new Paragraph({
    alignment,
    spacing: { before, after, line: 280 },
    indent: indent ? { left: convertInchesToTwip(indent) } : undefined,
    children: [new TextRun({ text, bold, italics: italic, size, color, font: FONT })],
  });
}
function multiRun(parts, opts = {}) {
  const { after = 80, before = 0, alignment = AlignmentType.LEFT } = opts;
  return new Paragraph({
    alignment,
    spacing: { before, after, line: 280 },
    children: parts.map(part => new TextRun({
      text: part.text,
      bold: part.bold,
      italics: part.italic,
      size: part.size || 21,
      color: part.color || '000000',
      font: FONT,
    })),
  });
}
function h1(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLOR.H1, font: FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    spacing: { before: 180, after: 90 },
    children: [new TextRun({ text, bold: true, size: 24, color: COLOR.H2, font: FONT })],
  });
}
function h3(text) {
  return new Paragraph({
    spacing: { before: 140, after: 70 },
    children: [new TextRun({ text, bold: true, size: 22, color: COLOR.H3, font: FONT })],
  });
}
function bullet(text, indent = 0) {
  return new Paragraph({
    bullet: { level: indent },
    spacing: { after: 40, line: 280 },
    children: [new TextRun({ text, size: 21, font: FONT })],
  });
}
function num(text, n) {
  return new Paragraph({
    spacing: { after: 40, line: 280 },
    children: [
      new TextRun({ text: `${n}. `, bold: true, size: 21, font: FONT }),
      new TextRun({ text, size: 21, font: FONT }),
    ],
  });
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '888888' };

function tcell(text, opts = {}) {
  const { bold = false, color = '000000', shading = null, alignment = AlignmentType.LEFT } = opts;
  return new TableCell({
    shading: shading ? { type: ShadingType.CLEAR, fill: shading, color: 'auto' } : undefined,
    children: [new Paragraph({
      alignment,
      spacing: { before: 30, after: 30, line: 220 },
      children: [new TextRun({ text: String(text), bold, size: 18, color, font: FONT })],
    })],
  });
}
function buildTable(headers, rows, opts = {}) {
  const { firstColShade = false, alignFirstLeft = true } = opts;
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => tcell(h, { bold: true, color: COLOR.HEADER_FG, shading: COLOR.HEADER_BG, alignment: AlignmentType.CENTER })),
  });
  const bodyRows = rows.map((row, i) => new TableRow({
    children: row.map((c, j) => tcell(c, {
      shading: i % 2 === 1 ? COLOR.ALT_ROW : (firstColShade && j === 0 ? COLOR.ALT_ROW : null),
      bold: firstColShade && j === 0,
      alignment: alignFirstLeft && j === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT,
    })),
  }));
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    borders: {
      top: BORDER, bottom: BORDER, left: BORDER, right: BORDER,
      insideHorizontal: BORDER, insideVertical: BORDER,
    },
    rows: [headerRow, ...bodyRows],
  });
}
function srcNote(text) {
  return p(text, { italic: true, color: '666666', size: 18, after: 120 });
}
function para(text, opts = {}) {
  return p(text, { after: 100, ...opts });
}

const children = [];

// === Header line ===
children.push(multiRun([
  { text: '住友商事 自動車本部（自動車グループ）ファイナンス機能 ビジネスDDレポート（2026年5月）', bold: true, size: 24 },
], { after: 200 }));

// === Executive Summary ===
children.push(h1('エグゼクティブサマリー'));

children.push(h3('主要観察事実 (Key Observations)'));
[
  '対象事業の境界：住友商事の自動車本部（2024年4月組織改正後は「自動車グループ」）のファイナンス機能は、(i) 国内法人オートリース最大級の住友三井オートサービス（SMAS、住商持分40.43%）、(ii) インドネシア小売販売金融OTO Group（住商マイノリティ34%）、(iii) 連結子会社Summit Capital Leasing（タイ、99.73%）、(iv) インド（SMAS Auto Leasing India 2013年）・豪州（SMAS Australia 1997年）等のSMAS海外子会社、で構成される [出典: 第157期有報 関係会社の状況、SMAS会社概要]',
  '自動車セグメント業績：FY2024（25/3期）は収益7,172億円（+7.3%）、当期利益512億円（▲1.3%）、資産8,486億円。連結当期利益5,619億円に対するセグメント比率は約9% [出典: 有報セグメント情報]',
  'SMAS単体業績：FY2024売上4,145億円（+5.5%）、営業利益318億円（+11.9%）、純利益209億円（+16.3%）、ROE14.4%、管理台数約108万台で国内オートリース第2位（首位はオリックス自動車約143万台）[出典: irbank E34406、SMAS会社概要]',
  '海外ポートフォリオの変化：2023年12月、インドネシアOTO Group（PT Oto Multiartha＋PT Summit Oto Finance）の持分構成が再編、住商系（PT Summit Auto Group）は49.9%→34%にマイノリティ化、Bank BTPN（=SMBC Indonesia）が51%で過半数を握り、海外オートファイナンスの実質経営権は段階的にSMBC側へ移管 [出典: 住商2023年12月リリース]',
  '国内市場成長：日本のリース取扱高は2024年度5兆847億円（前期比+9.8%）、輸送用機器+12.3%。個人カーリース保有台数は72.4万台で過去最高更新（前期比+7.8%）[出典: リース事業協会統計]',
  '株主構成：SMASの株主は住商40.43%／三井住友ファイナンス＆リース33.4%／三井住友フィナンシャルグループ26.2%。三井住友グループ合計59.6%で過半数を占め、住商は単独支配権を持たない [出典: SMAS会社概要]',
  '資本効率：SMASは有利子負債6,970億円／自己資本1,452億円＝レバレッジ約4.8倍の典型的リース業バランスシート。ROE14.4%は国内大手リース業の中で上位水準（東京センチュリーFY24 ROE約9%）[出典: irbank E34406、東京センチュリーIR]',
].forEach((t, i) => children.push(num(t, i + 1)));

children.push(h3('観察されたリスク要因 (Observed Risk Factors)'));
[
  '金利上昇によるキャリー圧迫：日銀のマイナス金利解除（2024年3月）以降の段階的利上げで、SMAS有利子負債6,970億円に対し金利1%上昇で利息費用約70億円増（粗計算）、純利益209億円に対する相対インパクト大',
  'EV残価リスク：EVは5年残価率がガソリン車並みに低下（日産リーフ3年残価率約36%対カローラスポーツHV約70%）、バッテリー劣化評価基準が未確立。ノンキャプティブのSMASはOEM残価サポートを得にくく、月額上昇による競争劣位化リスク [出典: ユーカーパック、くるまのニュース]',
  '海外オートファイナンスの戦略的縮小：インドネシアOTOは2023年マイノリティ化、米国にSMAS／住商系オートファイナンス子会社の確認なし、北米露出はTBC（タイヤ流通）に集中。海外ファイナンス事業のグローバル展開シナリオは事実上「国内SMAS＋アジア新興国の限定展開」に収斂',
  'キャプティブ参入競争：個人サブスク領域でトヨタKINTOが累計5万件超で年+2.2万件ペース、SUBARU提携も発表。OEM資本のキャプティブが中古車買取保証を武器に伸長する中、ノンキャプティブ商社系の構造的競争劣位が論点',
  '持分法処理による連結貢献の限定性：SMASは持分法適用関連会社のため、住商連結への寄与は持分法投資損益のみ（FY24自動車セグメント持分法損益149億円のうちSMAS推定寄与は84.5億円≒SMAS純利益209億円×40.43%）。連結ベースの売上・資産は計上されない',
].forEach(t => children.push(bullet(t)));

children.push(h3('追加DDで詰めるべき論点 (Open Questions)'));
[
  'SMAS単体の過去5期の収益・契約台数・新規組成額の時系列：irbankは1期分のみ。SMASの第40-44期有報PDFを直接取得し、トップライン・利益率・残高ベースで5期推移を構築',
  'SMAS国内顧客集中度：法人フリート顧客の上位集中度、業種別構成、SMB／中堅／大企業セグメント別の新規組成シェア。中計上「中堅・SMB拡大」を掲げているが進捗未開示',
  'EV比率と残価設定方針：SMASポートフォリオに占めるEV／HV／PHEV／ICEの台数構成、EV残価設定の保守度、損保（特にSOMPOのバッテリー保証）との連携状況',
  'インドネシアOTO Group以外の海外オートファイナンス事業の持分構成・損益：Summit Capital Leasing（タイ）、SMAS India、SMAS Australia、その他アジアJVの個別業績は連結上開示なし',
  'TBC Corp（米）住商出資比率の最新値とMidas売却益・リコース有無：2018年JV組成時50%とされるが直近開示なし。2025年4月Midas売却（中計restructuring）の損益寄与とTBC全体の売却・継続方針',
  '組織・ガバナンス論点：自動車グループCEO・モビリティサービスSBU長のKMP契約、後任候補、SMASガバナンス（住商派遣役員と三井住友派遣役員の構成、議決権ロック）、Element-Arval戦略アライアンス契約の解除条件・PMI論点',
  '誤前提の確認：本DDのインプット段階で「住商×Penske」「住商×Tata Motors Finance」関連事業の前提があった場合は誤り（Penskeは三井物産系、Tata Motors Financeは2024年4月にTata Capital吸収合併、住商関与は公開情報で確認できず）',
  '住商の中計2026における自動車グループのfocus／value-up／restructuring分類：個別グループの分類は未開示。SMASの位置づけが「コア／ノンコア」のいずれであるかは住商側のExit意向を読む上で決定的',
].forEach(t => children.push(bullet(t)));

// === ① 事業概要 ===
children.push(h1('① 事業概要'));

children.push(h2('1-1. 事業セグメント構造'));
children.push(para('住友商事は2024年4月1日付で「事業部門・本部・部」を廃止し、SBU（Strategic Business Unit）ベースの9グループ制に移行した。「自動車本部」は新組織下では「自動車グループ」として独立セグメント化され、6 SBU（自動車製造・エンジニアリング、自動車流通販売、モビリティサービス、タイヤ、Beyond Mobility、CFOオフィス）で構成される。'));
children.push(para('ファイナンス・リース機能はモビリティサービスSBUに統括されている（推定）。'));
children.push(p('⚠️ データ取得上の制約：旧組織下では自動車関連は「輸送機・建機事業部門」に内包されており、自動車単独の5期セグメント業績は FY2023・FY2024 の2期分しか取得不可（FY2024提出有報での組替開示）。FY2020-FY2022は旧「輸送機・建機」セグメント数値で代替する。', { color: '7A1F1F', after: 100 }));

children.push(h3('必須テーブル A：自動車／旧輸送機・建機セグメント 5期推移（IFRS、百万円）'));
children.push(buildTable(
  ['区分', '指標', 'FY2020', 'FY2021', 'FY2022', 'FY2023', 'FY2024'],
  [
    ['旧 輸送機・建機（自動車含む）', '収益', '684,439', '894,124', '1,053,184', '不開示※', '不開示※'],
    ['', '当期利益（親会社株主帰属）', '△17,472', '34,938', '91,968', '不開示※', '不開示※'],
    ['', '資産合計', '1,748,545', '1,751,865', '2,004,969', '不開示※', '不開示※'],
    ['新 自動車セグメント（独立化後）', '収益', '–', '–', '–', '668,203', '717,214'],
    ['', '売上総利益', '–', '–', '–', '156,424', '166,245'],
    ['', '持分法投資損益', '–', '–', '–', '31,887', '14,908'],
    ['', '当期利益（親会社株主帰属）', '–', '–', '–', '51,825', '51,173'],
    ['', '資産合計', '–', '–', '–', '839,644', '848,551'],
    ['', '当期利益率（対収益）', '–', '–', '–', '7.8%', '7.1%'],
  ],
  { firstColShade: true }
));
children.push(srcNote('※ FY2023以降は新自動車グループとして独立開示、旧輸送機・建機は航空機・船舶・建機等のみに再編。FY2020-FY2022の自動車単独業績は連結開示上は復元不可。設備投資・減価償却費はセグメント別に有報本表で開示なし（不開示）。出所：住友商事 第153-157期有報セグメント情報'));

children.push(h3('必須テーブル B：直近期セグメント構成比（FY2024、IFRS、住商連結）'));
children.push(buildTable(
  ['セグメント', '収益（百万円）', '収益構成比', '当期利益（百万円）', '当期利益構成比', '利益率'],
  [
    ['鉄鋼', '1,629,640', '22.3%', '68,375', '12.1%', '4.2%'],
    ['自動車', '717,214', '9.8%', '51,173', '9.1%', '7.1%'],
    ['輸送機・建機', '795,093', '10.9%', '101,477', '18.0%', '12.8%'],
    ['都市総合開発', '424,085', '5.8%', '77,075', '13.7%', '18.2%'],
    ['メディア・デジタル', '612,037', '8.4%', '45,247', '8.1%', '7.4%'],
    ['ライフスタイル', '1,016,661', '13.9%', '14,123', '2.5%', '1.4%'],
    ['資源', '298,300', '4.1%', '91,118', '16.2%', '30.5%'],
    ['化学・電子・農業', '1,096,546', '15.0%', '21,398', '3.8%', '2.0%'],
    ['エネルギートランスフォーメーション', '710,261', '9.7%', '96,379', '17.2%', '13.6%'],
    ['消去・全社', '△7,753', '–', '△4,506', '–', '–'],
    ['連結合計', '7,292,084', '100.0%', '561,859', '100.0%', '7.7%'],
  ],
  { firstColShade: true }
));
children.push(para('自動車セグメントは連結収益の約1割、当期利益の約1割を占める中堅セグメント。ファイナンス機能（SMAS等）の貢献はこのうち持分法投資損益149億円のうち推定85億円程度で、当期利益512億円の約17%（推定）。'));

children.push(h2('1-2. 製品・サービス'));
children.push(para('自動車本部のファイナンス機能は (a) 国内法人オートリース、(b) アジア新興国小売販売金融、(c) 海外法人フリートリース・ファイナンス の3類型に整理される。'));
children.push(para('(a) 国内法人オートリース（SMAS主軸）：ファイナンスリース、メンテナンスリース、ワンストップEVソリューション（車両＋充電器設置＋運用支援）、フリートマネジメント、関連サービス（車検・タイヤ・代車・事故対応）。中計KPIとして個人カーリース・サブスクリプション領域への参入も明記されているが、トヨタKINTO等のキャプティブと比較して個人領域での認知度は限定的。'));
children.push(para('(b) アジア新興国小売販売金融：インドネシアでOTO Multiartha（四輪、店舗160超）、Summit Oto Finance（二輪、店舗174）。住商マイノリティ化（34%）後はBank BTPN（SMBC Indonesia）の戦略下で運営。タイではSummit Capital Leasing（住商99.73%）が二輪・小型四輪向け販売金融。'));
children.push(para('(c) 海外法人フリートリース：SMAS Australia（1997年）、SMAS Auto Leasing India（2013年）、SMAS Asia Pacific（タイ）、PT SMAS Mobility Indonesia（2023年12月）。Element Fleet Management（カナダ系世界4位）×Arval（仏BNPパリバ系世界6位）との Element-Arval Global Alliance（56カ国440万台ネットワーク）に加盟し、グローバル多拠点フリート顧客に対応可能なポジション。'));

children.push(h2('1-3. 顧客構造'));
children.push(para('住友商事は商社モデル全般の顧客分散が高く、有報「主要な販売先」開示はない（連結ベースで顧客集中度が低いため）。SMAS単体の主要顧客類型は (i) 大企業フリート、(ii) 中堅企業（売上シェア過半、推定）、(iii) 中計2026で重点拡大領域として位置付けられたSMB（中小企業）の3層。具体的な顧客名・上位集中度はSMAS有報PDFから別途抽出が必要（追加DD論点）。'));
children.push(para('(b) インドネシアOTO Groupは、四輪・二輪を購入する個人消費者および小規模事業者が主要顧客。地理的にはインドネシア全土（人口約2.7億人）の都市部・地方都市の約160-170拠点をカバー。過去20年で累計600万人以上に与信。出所：住商2015年OTO関連リリース。'));

children.push(h2('1-4. バリューチェーン上のポジション'));
children.push(para('オートリース・販売金融バリューチェーンは「OEM／インポーター → ディーラー → リース／ファイナンス会社 → 法人・個人エンドユーザー → 中古車流通／バッテリーリサイクル」と展開する。SMASを軸とする住商系オートファイナンス事業の典型的ポジションは「ディーラー後・エンドユーザー前」の中間。'));
children.push(para('実態としては (i) マルチOEM対応で特定OEMに依存しない調達自由度、(ii) Element-Arval提携によるグローバルカバレッジ、(iii) 住商グループとしての自動車流通販売SBU（Toyota Ukraine、Moto-Pfohe等）／製造SBU（キリウ、Hirotec等）／タイヤSBU（TBC、住商パワー＆モビリティ等）との横の連携可能性、を持つ点がノンキャプティブ系専業（オリックス自動車、芙蓉オートリース等）に対する差別化要素。ただしOEMキャプティブ（トヨタファイナンシャルサービス、KINTO等）と比べた残価設定支援の薄さは構造劣位。'));

children.push(h2('1-5. 主要競合'));
children.push(buildTable(
  ['競合名', '上場区分', '売上規模', '営業利益率', '主領域', '強み・特徴'],
  [
    ['オリックス自動車', 'オリックス8591子会社（非上場）', '不開示（オリックス連結内）', '不開示', '法人・個人カーリース、レンタカー、中古車', '国内管理台数約143万台で首位、レンタカー・中古車との垂直統合'],
    ['住友三井オートサービス（SMAS）', '非上場（住商40.4%、SMFG/SMFL59.6%）', '4,145億円（FY24）', '7.7%', '法人フリート中心、グローバル提携', '国内2位約108万台、Element-Arvalグローバル提携'],
    ['三菱HCキャピタル', '8593（東証P）', '連結1.8兆円超（FY24、オートは内数）', 'n.a.', '総合リース、自動車は1セグメント', '2021年三菱UFJリース＋日立キャピタル統合、業界2位'],
    ['トヨタモビリティサービス', 'TFS傘下（非上場）', '非開示', '非開示', '法人カーリース、KINTO（個人サブスク）', 'フルOEMキャプティブ、KINTO累計5万件超'],
    ['芙蓉オートリース', '芙蓉総合リース8424子会社', '売上329億円（FY24/3期、推定）', '不開示', '法人カーリース', 'みずほ系、マルチOEM、規模では下位'],
  ],
  { alignFirstLeft: true }
));
children.push(para('国内法人カーリースはオリックス自動車とSMASの2強寡占（合計250万台超）で、3位以下は管理台数で大きく離される構造。個人サブスク領域はトヨタKINTOがOEMキャプティブとして急伸し、ノンキャプティブとは別市場。'));
children.push(srcNote('出所：オリックス自動車「数字で見る」、業界動向サーチ、各社IR'));

children.push(h2('1-6. 沿革・資本構成'));
children.push(para('SMASの沿革：1981年に住友商事オートリース設立、2007年10月に住商オートリース＋三井住友銀オートリース合併でSMAS発足、2019年にSMFG・住商・SMFL・SMASの4社でリース共同事業再編完了（住商40.4%、SMFL33.4%、SMFG26.2%の現行体制確立）、2023年12月にPT SMAS Mobility Indonesia設立（SMAS60%、住商40%）。'));
children.push(para('OTO Group再編史：2015年に住商Group 49.9%／SMBC 35.1%／SMMA 15%、2023年12月にBank BTPN（SMBC Indonesia）51%／PT Summit Auto Group 34%／SMMA 15%へ再編（住商は過半→マイノリティ化）。'));

children.push(h3('住友商事8053の大株主上位10名（2025年3月31日現在）'));
children.push(buildTable(
  ['順位', '株主名', '所有株数（千株）', '持株比率'],
  [
    ['1', '日本マスタートラスト信託銀行（信託口）', '198,114', '16.37%'],
    ['2', 'BNYM AS AGT/CLTS 10 PERCENT', '119,617', '9.89%'],
    ['3', '日本カストディ銀行（信託口）', '62,996', '5.21%'],
    ['4', '住友生命保険', '30,855', '2.55%'],
    ['5', 'STATE STREET BANK WEST CLIENT - TREATY 505234', '21,653', '1.79%'],
    ['6', 'STATE STREET BANK AND TRUST COMPANY 505001', '17,846', '1.47%'],
    ['7', 'JPモルガン証券', '17,509', '1.45%'],
    ['8', 'ゴールドマン・サックス証券 BNYM', '16,737', '1.38%'],
    ['9', 'JP MORGAN CHASE BANK 385781', '16,643', '1.38%'],
    ['10', '三井住友海上火災保険', '15,000', '1.24%'],
    ['計', '–', '516,974', '42.72%'],
  ],
  { firstColShade: true }
));
children.push(para('特記事項：2025年3月17日の大量保有報告書変更（実質確認は未了で大株主表非掲載）にて、Berkshire Hathaway子会社のNational Indemnity Companyが9.29%（11,246万株）保有を報告。Warren Buffettによる日本5大商社投資の一環。'));
children.push(srcNote('出所：住友商事 第157期有報 大株主の状況'));

// === ② 事業の堅牢性 ===
children.push(h1('② 事業の堅牢性'));
children.push(para('売上・利益の構造は3層で分解される：(i) 市場規模（日本オートリース＋アジア小売販売金融）×シェア、(ii) 単価（リース料＝車両調達コスト＋金利＋残価ロス＋粗利マージン）、(iii) コスト（調達金利、車両減価、メンテコスト）。'));

children.push(h2('2-1. 市場性'));
children.push(para('観察事実：日本のオートリース市場は2024年度総取扱高5兆847億円（前期比+9.8%）、輸送用機器（自動車含む）は+12.3%と2桁成長で過去最高水準。個人カーリース保有台数は72.4万台（前期比+7.8%）と継続伸長。グローバル auto finance 市場は調査機関により幅があるが概ね2024年USD 290-330B水準、2030年代前半までCAGR 6-8%が中央値（仮置）。出所：リース事業協会2025年4月統計、GMI/Market.us/GlobalGrowthInsights/Mordor Intelligence。'));

children.push(h3('数量／市場規模ドライバーの分解'));
children.push(para('第1のドライバーは「所有から利用へ」のシフトである。コーポレートサステナビリティ調達文脈でのScope3対応（社用車のEV移行）、人手不足によるメンテナンス・車両管理アウトソース需要、IFRS16号導入後の運用上の簡便性が、企業の購入から法人リース転換を後押ししている。'));
children.push(para('第2のドライバーは個人サブスクリプション市場の活性化である。トヨタKINTOが累計5万件超で年+2.2万件ペース、SUBARUとの協業で2024年初夏より新車サブスク参入。定額カルモ、ENEOSワタシのクルマ等のノンキャプティブもCM露出を増やし、特に若年層・地方の「車離れ」層を取り込んでいる（仮説）。'));
children.push(para('第3のドライバーは新興国市場の所得増加に伴う二輪・小型四輪の販売金融需要拡大である。インドネシア・インド・タイ等で都市化・中所得層拡大が進み、現金一括ではなく分割払いでの自動車購入が普及している。'));

children.push(h3('市場規模・成長率（時点明示）'));
children.push(buildTable(
  ['市場', '直近規模（年明記）', '期間', '実績/予測', 'CAGR', '出典'],
  [
    ['日本リース総取扱高', '5兆847億円（FY2024）', 'FY2023→FY2024', '実績', '+9.8%（単年）', 'リース事業協会'],
    ['日本リース 輸送用機器', '内訳開示は別表', 'FY2023→FY2024', '実績', '+12.3%（単年）', 'リース事業協会'],
    ['日本個人カーリース保有', '72.4万台（2024年度末）', 'FY2023→FY2024', '実績', '+7.8%（単年）', '日本自動車会議所'],
    ['グローバル auto finance', '$323.3B（2023）', '2023→2032', '予測', '6.2%', 'GMInsights'],
    ['グローバル auto finance', '$297.3B（2024）', '2024→2033', '予測', '7.1%', 'Market.us'],
    ['グローバル auto finance（広義）', '$655B（2025）', '2025→2034', '予測', '8.1%', 'Mordor Intelligence'],
  ],
  { firstColShade: true }
));

children.push(h3('各ドライバーの近年・将来考察'));
children.push(para('法人カーリース（SMASの主戦場）は、所有→利用シフトのトレンドが継続する限り中期的に+5-7%/年の成長余地があると見込まれる（仮説）。EV移行関連の付加サービス（充電インフラ整備、CO2排出量レポート、循環型経済対応）は単価上昇余地を生む。'));
children.push(para('一方、個人サブスクは認知度上昇で市場全体は急拡大するが、OEMキャプティブ（KINTO等）の取り分が大きく、ノンキャプティブの取り分は限定的になる構造（仮説）。'));
children.push(para('新興国販売金融はマクロ経済成長率（インドネシア+5%前後、インド+6-7%）に比例して拡大するが、各国中銀のフィンテック規制による審査基準引き上げ・与信集中規制が中期的な成長ペースを制約する可能性（仮説）。'));

children.push(h2('2-2. シェア'));
children.push(para('観察事実：SMASは国内法人オートリース市場で管理台数約108万台、シェアはオリックス自動車（約143万台）に次ぐ第2位で、2社合計で250万台超の寡占構造。海外では Element-Arval Global Alliance に加盟し、56カ国・440万台のグローバル法人フリート顧客にアクセス可能なポジション。'));
children.push(srcNote('出所：オリックス自動車「数字で見る」、SMAS会社概要'));

children.push(h3('スイッチング発生メカニズム'));
children.push(para('法人カーリースのスイッチングは主に (i) リース満期更新時（通常3-5年）、(ii) フリート規模拡大時の追加発注、(iii) 経営層交代・コスト削減施策発動時 の3トリガーで発生する。'));
children.push(para('スイッチングコストは「車両仕様の標準化／統一車両プールの再構築」「ドライバー教育コスト」「メンテナンス記録の引継ぎ」が中心で、中規模以上のフリート（100台超）では金銭的・運用的コストが高く、契約満期前のスイッチングは限定的。一方、SMB顧客（10-50台）はスイッチング摩擦が小さく、月額単価の比較で乗り換えが起きやすい（仮説）。'));
children.push(para('新規顧客獲得は (i) 新事業所開設に伴う新規フリート組成、(ii) 競合からの満期切替、(iii) 顧客自社所有車両のリース移行、の3類型。'));

children.push(h3('(a) 新規採用時のKBF充足度'));
children.push(buildTable(
  ['KBF', '重要度（仮説）', 'SMAS', 'オリックス自動車', 'トヨタモビリティサービス', '芙蓉オートリース'],
  [
    ['提案力（フリート最適化）', '高', '◎', '◎', '○', '○'],
    ['月額価格競争力', '高', '○', '○', '◎（OEM一体）', '○'],
    ['多OEM対応・グローバル展開', '中-高', '◎', '◎', '△（トヨタ系中心）', '○'],
    ['EV／充電インフラワンストップ', '中-高', '◎', '◎', '◎', '○'],
    ['グループ金融機能（SMFG連携）', '中', '◎', '○', '○', '◎（みずほ）'],
  ],
  { firstColShade: true, alignFirstLeft: true }
));

children.push(h3('(b) 既存契約継続時のKBF充足度'));
children.push(buildTable(
  ['KBF', '重要度（仮説）', 'SMAS', 'オリックス自動車', 'トヨタモビリティサービス', '芙蓉オートリース'],
  [
    ['残価設定の安定性', '高', '○', '○', '◎（OEM残価サポート）', '○'],
    ['メンテ・代車・事故対応の品質', '高', '◎', '◎', '○', '○'],
    ['価格改定の柔軟性', '中', '○', '○', '△', '○'],
    ['業界標準対応（電子帳簿、CO2レポート）', '中-高', '◎', '◎', '○', '○'],
    ['トラブル対応', '高', '○', '◎', '○', '○'],
  ],
  { firstColShade: true, alignFirstLeft: true }
));
children.push(para('KBF充足度はいずれも仮説で、SMASの競争力は「グローバル提携＋多OEM＋SMFG連携」の3要素で差別化されているが、残価設定支援ではOEMキャプティブに劣後する。'));

children.push(h3('その他のシェア変動要因'));
children.push(para('(i) 三菱HCキャピタルがオート領域で本格攻勢に出れば、業界2位のSMASに対する直接競合となる（現状はオート単独セグメント開示なし）。(ii) 海外プレイヤーの日本進出はALD Automotive（仏Société Générale系、現Ayvens）が代表例だが、日本市場では限定的シェア。(iii) 大手企業の自社内製化（フリート管理の社内化）はトレンドとして弱く、むしろ外部委託シフトが優位。(iv) 規制変更（リース会計基準IFRS16号は既に適用済、新規重大リスクなし）。'));

children.push(h2('2-3. 単価・コスト構造'));
children.push(h3('(a) 単価'));
children.push(para('主要コスト構造の推定：オートリース月額単価は、(i) 車両減価（取得原価÷リース期間×（1-残価率））、(ii) 調達金利コスト（取得原価×金利×期間）、(iii) メンテナンス積立、(iv) 自動車保険、(v) 租税公課（自動車税・重量税）、(vi) リース会社マージン、で構成される。車両調達コスト（OEM仕入価格）が単価の60-70%、金利が10-15%、メンテ・保険・税金が15-25%、マージンが5-10%（業界推定）。'));
children.push(para('各コスト要素の直近2-3年動向：(a) 車両調達コストは新車価格上昇（2022-2024年で各メーカー5-10%価格改定）、(b) 調達金利は日銀利上げで10年JGB金利0.1%→1.5%（2024年3月→2025年）と急上昇し、リース会社の調達金利は明確に上昇局面、(c) メンテコストは部品・労務費インフレで上昇、(d) 中古車相場は2022年ピーク後落ち着きつつあり、残価想定の前提が下方修正局面。'));
children.push(para('顧客サイドの圧力：法人フリートの月額単価は社用車経費（人件費含めた営業活動原価）の数%程度に過ぎず、価格圧力は中程度。ただし大企業の調達コスト削減プロジェクト（PMI後の経費見直し等）では切替検討の対象になる。'));
children.push(para('競争環境動向：オリックス自動車は規模の経済で原価優位、SMASは三井住友グループ調達金利優位（推定）。海外プレイヤー流入は限定的、価格は概ね調達金利＋OEM価格動向に応じて段階的改定。'));

children.push(h3('(b) コスト'));
children.push(para('粗利率／営業利益率推移：SMAS単体のFY24営業利益率は7.7%（営業利益318億円÷売上4,145億円）。リース業の特性として「売上総利益率」より「ROA・ROE」が指標として有用で、SMASのROEは14.4%（東京センチュリーFY24 ROE 約9%、三菱HCキャピタルFY24 ROE 約10%）と国内大手リース業の中で上位水準。出所：各社IR。'));
children.push(para('固定費・変動費構成：リース業の主要コストは (i) 支払利息＝変動的（金利連動）かつ大型、(ii) 減価償却費＝固定的（資産計上後一定）、(iii) 人件費・販管費＝固定的、(iv) 保険・メンテ仕入＝変動的（契約数連動）。支払利息／減価償却費がコストの大宗（推定80%超）で、営業利益率は調達金利と残価設定の精度で決まる構造。'));

// === ③ バリューアップ ===
children.push(h1('③ バリューアップの方向性'));

children.push(h2('3-1. オーガニック'));
children.push(h3('(a) 売上'));
children.push(p('1. プライシング改善（単純値上げ）', { bold: true, after: 60 }));
children.push(para('日銀利上げ局面において、新規組成案件のリース料金利スプレッドを拡大する余地。現状の月額リース料は調達金利上昇分の転嫁が部分的（業界一斉の段階的改定に追随）。SMAS単体で月額平均単価+1-2%の改定余地（仮説）。'));
children.push(para('仮置インパクト：売上+40-80億円／年、EBITDA+20-50億円／年、達成2年。リスク：競合（オリックス、芙蓉）が価格据え置きを維持すると新規シェア喪失リスク。'));

children.push(p('2. 新規顧客拡大', { bold: true, after: 60 }));
children.push(para('中計2026で重点とされるSMB（中小企業）セグメントへの拡大。現在は大企業フリート中心と推定されるが、SMB向けには (i) 簡易審査スキーム、(ii) 1台からのワンストップEVソリューション、(iii) 銀行ALMチャネル経由の販売、で新規獲得余地。'));
children.push(para('仮置インパクト：SMB管理台数+10-15万台（現状108万台→120-125万台）で売上+400-600億円／年、EBITDA+30-50億円／年、達成3年。リスク：SMBは月額単価競合が激しく利益率は大企業フリートを下回る。'));

children.push(p('3. 新規製品拡充', { bold: true, after: 60 }));
children.push(para('EV充電インフラのワンストップ提供、フリートDX（運行管理SaaS、ドライバー安全評価AI）、サブスクリプション型（個人含む）、二輪・小型モビリティリース、カーシェア・MaaS連携。'));
children.push(para('仮置インパクト：付加サービス売上+100-200億円／年、EBITDA+20-40億円／年、達成2-3年。リスク：SaaS・DX領域は技術投資先行型で初年度赤字、KINTO等キャプティブとの直接競合。'));

children.push(p('4. 新規地域展開', { bold: true, after: 60 }));
children.push(para('SMAS Mobility Indonesia（2023年12月設立）、SMAS Asia Pacific（タイ）、SMAS India の現地拡大、ベトナム・フィリピン・マレーシア等の未進出ASEAN市場への展開。住商の海外駐在拠点・自動車流通販売SBUとの相乗を活用。'));
children.push(para('仮置インパクト：海外売上+200-400億円／年（5年累計）、EBITDA+15-30億円／年、達成5年。リスク：新興国カントリーリスク（為替・規制・政情）、現地キャプティブ・現地金融機関との競合。'));

children.push(h3('(b) コスト'));
children.push(p('1. 原価改善', { bold: true, after: 60 }));
children.push(para('(i) 車両調達におけるSMFG・三井住友海上の保険調達一括化による保険コスト削減、(ii) AI活用による残価予測精度向上で残価ロス削減、(iii) メンテネットワーク統合による単価低減、(iv) Element-Arvalグローバル提携を活用したアジア地域の調達バンドリング、(v) RPA・AI導入による契約管理・請求業務自動化。'));
children.push(para('仮置インパクト：EBITDA+15-25億円／年、達成2-3年。リスク：システム投資先行で初年度赤字、PMI型システム統合の遅延。'));

children.push(p('2. 販管費改善', { bold: true, after: 60 }));
children.push(para('オペレーションのデジタル化（オンライン契約、デジタル車検証、電子請求）、地方支店の統廃合、Element-Arval提携を活用したグローバル本部機能の効率化。'));
children.push(para('仮置インパクト：EBITDA+10-15億円／年、達成2-3年。リスク：地方拠点削減は地方SMB顧客への販売チャネル弱体化。'));

children.push(h2('3-2. インオーガニック'));
children.push(p('1. 同業ロールアップ', { bold: true, after: 60 }));
children.push(para('日本のオートリース市場はオリックス自動車・SMAS・三菱HCキャピタル・トヨタモビリティサービス・芙蓉オートリース・日本カーソリューションズ等の数社寡占で、ロールアップの余地は限定的。考えられる候補は (i) 三菱HCキャピタル傘下のオート関連事業の取得（同社は2021年合併直後で再編余地あり）、(ii) 芙蓉オートリースの統合（みずほFG×SMFGクロス関係要）、(iii) 日本カーソリューションズの取得（三井物産系、商社間再編論理）。'));
children.push(para('シナジー類型：規模の経済（調達・メンテ集約）、IT統合、間接費削減。PMI論点：システム統合（リース業はIT基盤の互換性が必須）、人員配置、顧客契約の継続性。仮置インパクト：5万-20万台の管理台数追加でEBITDA+30-100億円／年、達成3-4年。'));

children.push(p('2. 隣接企業買収による機能強化', { bold: true, after: 60 }));
children.push(para('(i) EV充電インフラ事業者（イーモビリティパワー、ENEOS充電サービス等のJV化／買収）、(ii) フリート管理SaaS（GO Inc.、ナビタイム関連等の連携／買収）、(iii) 個人カーサブスク事業者（定額カルモを運営するナイル、ニコノリ等のニッチプレイヤー買収による個人領域参入）、(iv) 海外ノンキャプティブ（豪州・東南アジアの中堅オートリース事業者）。'));
children.push(para('シナジー類型：技術／顧客／チャネル／地域補完。PMI論点：技術統合、ブランド統合（個人サブスクは別ブランド維持の選択肢）。仮置インパクト：EBITDA+10-30億円／年、達成2-3年。'));

children.push(h2('3-3. Exitの可能性（エクイティストーリー含む）'));
children.push(p('想定買い手', { bold: true, after: 60 }));
children.push(para('事業会社（戦略買収）：(a) SMFG／SMFL（既に過半数所有、住商持分40.4%取得で完全SMFG化）、(b) 三菱HCキャピタル（業界2位のオート補完）、(c) オリックス（業界1位の更なる集約化、独禁法論点）、(d) 海外大手（Element Fleet Management、Ayvens（旧ALD）、LeasePlan系）。'));
children.push(para('PE（再売却・MBO）：欧米ではApollo、KKR、Blackstone等が大手フリート資産を取得した先例。日本ではPE主体のオートリース取得事例は限定的。'));
children.push(para('IPO（再上場・新規IPO）：SMAS東証プライム上場の選択肢。住商40.4%＋SMFG/SMFL59.6%の既存株主構造のままIPOで一部売出し。'));

children.push(p('想定マルチプル', { bold: true, after: 60 }));
children.push(para('オートリースは総合リース業に内包されるため、純粋ピアは限定的。比較対象としての国内総合リース上場各社の足元マルチプル（仮置）：'));
children.push(buildTable(
  ['ピア', '上場区分', 'EV/EBITDA（仮置）', 'PER（仮置）', 'PBR（仮置）'],
  [
    ['オリックス8591', '東証P', '8-10x', '9-12x', '0.9-1.1x'],
    ['東京センチュリー8439', '東証P', '7-9x', '10-13x', '1.0-1.2x'],
    ['三菱HCキャピタル8593', '東証P', '8-10x', '8-11x', '0.9-1.1x'],
    ['芙蓉総合リース8424', '東証P', '6-8x', '8-11x', '0.8-1.0x'],
  ],
  { firstColShade: true }
));
children.push(srcNote('※全て概算レンジ。直近マルチプルの正確な数値は別途株価データベースから取得が必要（追加DD論点）。'));

children.push(p('5年後Exit想定', { bold: true, after: 60 }));
children.push(para('現状EBITDA（推定SMAS単体EBITDA）≒営業利益+減価償却費≒318億円+（リース資産減価償却=推定600-800億円）= 約900-1,100億円（仮置、SMAS有報PDFで要確認）。バリューアップ後5年想定EBITDAレンジ1,100-1,400億円 × ピア中央値8x = 約8,800-11,200億円のEV（仮置）。'));

children.push(p('エクイティストーリー候補', { bold: true, after: 60 }));
children.push(para('(a)「日本発のグローバルマルチOEMフリート・ソリューションプロバイダー」：Element-Arval提携を軸とした多国籍企業向けクロスボーダー統合提案、(b)「EV移行支援パートナー」：Scope3対応・充電インフラ・残価保証一体型のフルライフサイクルEV運用支援、(c)「SMFG×住商シナジー型 SMB金融プラットフォーム」：銀行チャネル＋商社ネットワークでSMBにフリート＋金融の統合提供。'));

children.push(h3('Value-up Bridge 数値テーブル'));
children.push(buildTable(
  ['項目', 'EBITDA（億円）／レンジ', '寄与の論拠', '達成期間'],
  [
    ['現状EBITDA（SMAS単体推定）', '900-1,100', 'FY24営業利益318＋推定減価償却600-800（仮置、要DD）', '–'],
    ['＋ オーガニック', '+85-180', 'プライシング20-50＋SMB拡大30-50＋新規製品20-40＋海外15-30＋原価15-25＋販管費10-15', '〜5年'],
    ['＋ インオーガニック', '+40-130', '同業ロールアップ30-100＋隣接買収10-30', '〜5年'],
    ['5年後想定EBITDA', '1,025-1,410', '–', '–'],
  ],
  { firstColShade: true, alignFirstLeft: true }
));
children.push(para('3-3で示した想定EVレンジ8,800-11,200億円は本Bridge合計に8x（ピア中央値）を乗じたもの。'));

// === 付録 ===
children.push(h1('付録：出典一覧'));

children.push(h3('有報・公開IR'));
[
  '住友商事 第153-157期有価証券報告書（EDINET docID S100LJW1, S100OE28, S100R1TH, S100TOTW, S100VYV6）',
  '住友商事 中期経営計画2026（sumitomocorp.com/-/media/Files/hq/ir/report/investors-guide/2024/ar2024jp_GrowthStrategy.pdf）',
  '住友商事 2024年4月組織改正リリース',
  '住友三井オートサービス 会社概要（smauto.co.jp/company/profile/）',
  'SMAS第44期有価証券報告書（smauto.co.jp/pdf/company/business-info/finance/report/SecuritiesReport44-2023040120240331.pdf）',
  '住商2023年12月OTO Group再編リリース（住商英語版）',
  '住商2025年4月TBC Corp Midas売却合意リリース',
].forEach(t => children.push(bullet(t)));

children.push(h3('業界統計・データベース'));
[
  '公益社団法人リース事業協会 リース統計（leasing.or.jp/statistics）',
  'リース事業協会 2024年度・2025年4月リース統計発表PDF',
  '日本自動車会議所 個人リース保有解説（aba-j.or.jp/info/industry/24149/）',
  'irbank E02528（住友商事セグメント）、E34406（SMAS）',
].forEach(t => children.push(bullet(t)));

children.push(h3('市場調査・業界分析'));
[
  'GMInsights "Automotive Finance Market"',
  'Market.us "Car Finance Market"',
  'Mordor Intelligence "Automotive Financing Market"',
  '業界動向サーチ リース業界ランキング（gyokai-search.com/3-lease.htm）',
  'オリックス自動車「数字で見る」（orix.co.jp/auto/company/data/）',
  'ユーカーパック EV残価率分析、くるまのニュース 中古EV相場記事',
].forEach(t => children.push(bullet(t)));

children.push(h3('略語集'));
[
  'SMAS：住友三井オートサービス株式会社（Sumitomo Mitsui Auto Service）',
  'SMFG：三井住友フィナンシャルグループ',
  'SMFL：三井住友ファイナンス＆リース',
  'SBU：Strategic Business Unit',
  'OTO：PT Oto Multiartha（オト・ムルティアルタ）',
  'TBC：TBC Corporation（米国タイヤ流通）',
  'KMP：Key Management Personnel',
  'KBF：Key Buying Factor',
].forEach(t => children.push(bullet(t)));

// Build doc
const doc = new Document({
  creator: 'business-dd skill',
  title: '住友商事 自動車本部 ファイナンス機能 ビジネスDDレポート',
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 21 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  if (!fs.existsSync(path.dirname(OUT_FILE))) fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log(`Saved: ${OUT_FILE} (${buf.length} bytes)`);
}).catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
