import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT='/home/user/Upiri/public';
const T={'.html':'text/html','.js':'application/javascript','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x'); let p=normalize(join(ROOT,decodeURIComponent(u.pathname)));
  if(!p.startsWith(ROOT)){res.writeHead(403).end();return;}
  try{const st=await stat(p); if(st.isDirectory())p=join(p,'index.html');}catch{p=join(ROOT,'index.html');}
  try{const b=await readFile(p);res.writeHead(200,{'content-type':T[extname(p)]||'application/octet-stream'}).end(b);}catch{res.writeHead(404).end();}
}).listen(5182,'127.0.0.1',()=>console.log('ready'));
