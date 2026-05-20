#!/usr/bin/env node
// 自分宛 Gmail 送信ヘルパー (SMTP + アプリパスワード方式)
//
// 環境変数:
//   GMAIL_USER         送信元 Gmail アドレス (SMTP認証用)
//   GMAIL_APP_PASSWORD Gmail アプリパスワード (16桁、スペース除去)
//   MAIL_TO            デフォルト宛先 (カンマ区切り複数可)
//                      未設定時は GMAIL_USER にフォールバック
//
// 使い方:
//   node send_to_self.cjs --subject "件名" --body "本文"
//   node send_to_self.cjs --subject "DD完成" --body-file report.md --attach output.xlsx
//   node send_to_self.cjs --subject "HTML" --body "<h1>Hi</h1>" --html
//   node send_to_self.cjs --subject "添付複数" --body "..." --attach a.pdf --attach b.xlsx
//   node send_to_self.cjs --subject "宛先上書き" --body "..." --to "other@example.com"
//
// 戻り値: messageIdをstdoutに出力。失敗時は exit 1。

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { attach: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--subject') args.subject = argv[++i];
    else if (a === '--body') args.body = argv[++i];
    else if (a === '--body-file') args.bodyFile = argv[++i];
    else if (a === '--attach') args.attach.push(argv[++i]);
    else if (a === '--html') args.html = true;
    else if (a === '--to') args.to = argv[++i];  // override (debug用)
    else if (a === '--cc') args.cc = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(l => l.startsWith('//')).join('\n'));
      process.exit(0);
    }
  }
  return args;
}

(async () => {
  const args = parseArgs(process.argv);
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.error('ERROR: GMAIL_USER と GMAIL_APP_PASSWORD の環境変数を設定してください');
    console.error('PowerShell例:');
    console.error('  [Environment]::SetEnvironmentVariable("GMAIL_USER", "you@gmail.com", "User")');
    console.error('  [Environment]::SetEnvironmentVariable("GMAIL_APP_PASSWORD", "xxxxxxxxxxxxxxxx", "User")');
    process.exit(1);
  }
  if (!args.subject) { console.error('ERROR: --subject 必須'); process.exit(1); }

  let body = args.body;
  if (args.bodyFile) {
    if (!fs.existsSync(args.bodyFile)) { console.error('ERROR: body-file not found:', args.bodyFile); process.exit(1); }
    body = fs.readFileSync(args.bodyFile, 'utf8');
  }
  if (!body) { console.error('ERROR: --body または --body-file 必須'); process.exit(1); }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    console.error('ERROR: nodemailer がインストールされていません。次を実行してください:');
    console.error('  cd workspace/scripts && npm install');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  const attachments = args.attach.map(p => {
    if (!fs.existsSync(p)) { console.error('ERROR: attachment not found:', p); process.exit(1); }
    return { filename: path.basename(p), path: path.resolve(p) };
  });

  // 宛先: --to 指定 > MAIL_TO 環境変数 > GMAIL_USER (フォールバック)
  const to = args.to || process.env.MAIL_TO || user;
  const mail = {
    from: user,
    to,
    subject: args.subject,
    attachments,
  };
  if (args.cc) mail.cc = args.cc;
  if (args.html) mail.html = body;
  else mail.text = body;

  try {
    const info = await transporter.sendMail(mail);
    console.log('Sent:', info.messageId, 'to', to);
    if (attachments.length > 0) console.log('Attachments:', attachments.map(a => a.filename).join(', '));
  } catch (e) {
    console.error('SEND FAILED:', e.message);
    if (e.code === 'EAUTH') {
      console.error('→ アプリパスワードが正しいか、2段階認証がONかを確認してください');
    }
    process.exit(1);
  }
})();
