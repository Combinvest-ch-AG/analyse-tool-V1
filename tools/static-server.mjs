import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.argv[2] || 8765);
const mime = { ".css":"text/css", ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const relative = normalize(pathname.replace(/^[/\\]+/, ""));
  let file = join(root, relative || "index.html");
  if (!file.startsWith(root) || !existsSync(file)) { response.writeHead(404); response.end("Not found"); return; }
  if (statSync(file).isDirectory()) file = join(file, "index.html");
  response.writeHead(200, { "Content-Type": `${mime[extname(file)] || "application/octet-stream"}; charset=utf-8`, "Cache-Control":"no-store" });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1");
