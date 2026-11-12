'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { WebSocketServer } = WebSocket;
const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, 'public');
const CARS = {
  viper: { name: 'Viper GT', perf: 0.14 },
  comet: { name: 'Comet RS', perf: 0.08 },
  phantom: { name: 'Phantom X', perf: 0.18 },
  bolt: { name: 'Bolt ZR', perf: 0.04 },
  retro: { name: 'Retro R', perf: 0.11 },
  nova: { name: 'Nova EV', perf: 0.06 },
};
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((req, res) => {
  let route = (req.url || '/').split('?')[0];
  try { route = decodeURIComponent(route); } catch {res.writeHead(400);return res.end('Bad request');}
  if (route === '/') route = '/index.html';
  const full = path.resolve(ROOT, '.'+route);
  if (!full.startsWith(ROOT + path.sep)) {res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(full, (e, data) => {
    if(e){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200, {'Content-Type':MIME[path.extname(full)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  });
});
const wss = new WebSocketServer({server});
const rooms = new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(){let c;do{c=Array.from({length:6},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('')}while(rooms.has(c));return c;}
function send(ws, event, data={}) {if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({event,...data}));}
function broadcast(room, event, data={}){room.players.forEach(p=>send(p.ws,event,data));}
function view(room){return {code:room.code,phase:room.phase,greenAt:room.greenAt,players:room.players.map(p=>({id:p.id,name:p.name,car:p.car,ready:p.ready,score:p.score, reaction:p.reaction, falseStart:p.falseStart})),round:room.round};}
function update(room){broadcast(room,'state',{room:view(room)});}
function clean(room){if(!room.players.length){clearTimeout(room.timer);rooms.delete(room.code)}else update(room);}
function reset(room){clearTimeout(room.timer);room.phase='lobby';room.greenAt=null;room.players.forEach(p=>{p.ready=false;p.reaction=null;p.falseStart=false;});update(room);}
function finish(room){if(room.phase!=='countdown'&&room.phase!=='racing')return;
 room.phase='result';clearTimeout(room.timer);
 const [a,b]=room.players;
 if(!a||!b){reset(room);return;}
 // A car's acceleration advantage is intentionally small; reaction remains decisive.
 const time=p=>p.falseStart?Infinity:((p.reaction===null?Infinity:p.reaction)+CARS[p.car].perf*1000);
 const diff=time(a)-time(b);
 let winner = Math.abs(diff)<1 ? null : diff<0?a:b;
 if(!Number.isFinite(time(a))&&!Number.isFinite(time(b)))winner=null;
 if(winner)winner.score++;
 broadcast(room,'result',{winnerId:winner?.id||null,players:room.players.map(p=>({id:p.id,name:p.name,car:p.car,reaction:p.reaction,falseStart:p.falseStart,score:p.score,effectiveMs:Number.isFinite(time(p))?Math.round(time(p)):null}))});
 update(room);
}
function start(room){if(room.players.length!==2||room.phase!=='lobby'||!room.players.every(p=>p.ready))return;
 room.phase='countdown';room.greenAt=Date.now()+4300;room.round++;
 room.players.forEach(p=>{p.reaction=null;p.falseStart=false;});
 broadcast(room,'start',{greenAt:room.greenAt,round:room.round});update(room);
 room.timer=setTimeout(()=>finish(room),8400);
}
let nextId=1;
wss.on('connection',(ws)=>{
 ws.player=null;ws.room=null;
 send(ws,'hello',{serverNow:Date.now()});
 ws.on('message',(buf)=>{
  if(buf.length>4096)return;
  let m;try{m=JSON.parse(String(buf))}catch{return;}
  if(!m||typeof m!=='object')return;
  if(m.event==='ping'){send(ws,'pong',{serverNow:Date.now(),clientAt:m.clientAt});return;}
  if(m.event==='join'){
   if(ws.room)return send(ws,'error',{message:'Du bist bereits in einem Raum.'});
   const requested=String(m.code||'').trim().toUpperCase();
   const room=requested?rooms.get(requested):null;
   if(requested&&!room)return send(ws,'error',{message:'Diesen Raum gibt es nicht mehr. Erstelle einen neuen Raum.'});
   if(room&&(room.players.length>=2||room.phase!=='lobby'))return send(ws,'error',{message:'Der Raum ist voll oder das Rennen läuft bereits.'});
   const r=room||{code:code(),phase:'lobby',players:[],greenAt:null,round:0,timer:null};if(!room)rooms.set(r.code,r);
   const name=String(m.name||'Racer').replace(/[<>\x00-\x1F]/g,'').trim().slice(0,18)||'Racer';
   const player={id:nextId++,ws,name,car:CARS[m.car]?m.car:'viper',ready:false,score:0,reaction:null,falseStart:false};
   r.players.push(player);ws.room=r;ws.player=player;
   send(ws,'joined',{playerId:player.id,code:r.code});update(r);return;
  }
  const r=ws.room,p=ws.player;if(!r||!p)return;
  if(m.event==='select'&&r.phase==='lobby'&&!p.ready&&CARS[m.car]){p.car=m.car;update(r)}
  else if(m.event==='ready'&&r.phase==='lobby'){p.ready=!!m.ready;update(r);start(r)}
  else if(m.event==='launch'&&(r.phase==='countdown'||r.phase==='racing')&&p.reaction===null&&!p.falseStart){
   const now=Date.now();const delta=now-r.greenAt;
   if(delta < 0){p.falseStart=true;broadcast(r,'launch',{playerId:p.id,falseStart:true,reaction:null});}
   else{p.reaction=delta;broadcast(r,'launch',{playerId:p.id,falseStart:false,reaction:delta});}
   r.phase='racing';update(r);
   if(r.players.every(q=>q.reaction!==null||q.falseStart))setTimeout(()=>finish(r),550);
  }
  else if(m.event==='rematch'&&r.phase==='result'){reset(r)}
 });
 ws.on('close',()=>{const r=ws.room;if(!r)return;r.players=r.players.filter(p=>p.ws!==ws);if(r.phase!=='lobby')reset(r);clean(r)});
});
server.listen(PORT,()=>console.log(`LAUNCHLINE Racing on http://localhost:${PORT}`));