const http = require('node:http');
const pug = require('pug');
const { URL } = require('node:url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const MAX_INPUT_LENGTH = 200;
const LAB_BADGE = 'LAB{pug_ssti}';

const page = pug.compileFile(`${__dirname}/views/index.pug`);
const safeTemplate = 'p Welcome, #{name}!';

const kiosk = {
  badge() {
    return LAB_BADGE;
  },
};

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
  });
  res.end(html);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const rawName = url.searchParams.get('name') || 'visitor';
  const name = rawName.slice(0, MAX_INPUT_LENGTH);

  if (url.pathname === '/') {
    return sendHtml(res, 200, page({ name, result: '', mode: 'home' }));
  }

  if (url.pathname === '/vulnerable' || url.pathname === '/safe') {
    try {
      const isVulnerable = url.pathname === '/vulnerable';
      let rendered;

      if (isVulnerable) {
        const source = `p Welcome, ${name}!`;
        rendered = pug.render(source, { kiosk });
      } else {
        rendered = pug.render(safeTemplate, { name });
      }

      return sendHtml(res, 200, page({
        name,
        result: rendered,
        mode: isVulnerable ? 'vulnerable' : 'safe',
        won: rendered.includes(LAB_BADGE),
      }));
    } catch (error) {
      return sendHtml(res, 400, page({ name, result: `Template error: ${error.message}`, mode: 'error' }));
    }
  }

  sendHtml(res, 404, page({ name, result: 'Page not found.', mode: 'error' }));
});

server.listen(PORT, HOST, () => {
  console.log(`listening on ${HOST}:${PORT}`);
});
