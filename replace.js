const fs = require('fs');

function replaceIt(file, replacement, regex) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf-8');
}

const replacementBookInfo = `const htmlDoc = \\\`<!DOCTYPE html>
<html lang="vi" data-theme="sepia">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\\\${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
\\\${OFFLINE_READER_STYLES}
</style>
</head>
<body>
\\\${OFFLINE_READER_TOOLBAR_HTML}
<div class="content-wrapper">
\\\${htmlBody}
</div>
\\\${OFFLINE_READER_SCRIPT}
</body>
</html>\\\`;`;

let regex = /const htmlDoc = `<!DOCTYPE html>.*?<\/html>`;/s;
replaceIt('src/app/core/book.store.ts', replacementBookInfo, regex);

const replacementChapterInfo = `const htmlDoc = \\\`<!DOCTYPE html>
<html lang="vi" data-theme="sepia">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>\\\${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
\\\${OFFLINE_READER_STYLES}
</style>
</head>
<body>
\\\${OFFLINE_READER_TOOLBAR_HTML}
<div class="content-wrapper">
\\\${htmlBody}
</div>
\\\${OFFLINE_READER_SCRIPT}
</body>
</html>\\\`;`;

replaceIt('src/app/features/translator/components/chapter-item.ts', replacementChapterInfo, regex);
