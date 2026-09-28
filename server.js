const path=require("path"),http=require("http"),express=require("express");
const {WebSocketServer}=require("ws");const app=express();server=http.createServer(app),wss=new WebSocketServer({server}),rooms=new Map();
app.use(express.static(path.join(__dirname,"public")));
const send=(w,m)=>w.readyState===1&&w.send(JSON.stringify(m)),bc=(r,m)=>r.players.forEach(p=>send(p.ws,m));
function code(){let s="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",c;do{c=[...Array(6)].map(()=>s[Math.floor(Math.random()*s.length)]).join("")}while(rooms.has(c));return c}
function state(r){return{type:"room_state",roomCode:r.code,hostId:r.hostId,players:[...r.players.values()].map(p=>({id:p.id,name:p.name,ready:p.ready,dist:p.dist,alive:p.alive,recovery:p.recovery,finished:p.finished}))}}
function leave(ws){if(!ws.player)return;let r=rooms.get(ws.player.room),id=ws.player.id;if(!r)return;r.players.delete(id);if(r.hostId===id)r.hostId=r.players.keys().next().value||null;if(!r.players.size)rooms.delete(r.code);else bc(r,state(r));ws.player=null}
function broadcastRace(r){bc(r,state(r))}
wss.on("connection",ws=>{ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch{return}
if(m.type==="create"){leave(ws);let r={code:code(),hostId:null,started:false,gaps:[400,800,1200,1600].map(x=>({at:x,width:[3,5,7,9][Math.floor(Math.random()*4)]})),players:new Map()};let id=Math.random().toString(36).slice(2,9);r.hostId=id;r.players.set(id,{id,name:String(m.name||"Player").slice(0,18),ready:true,dist:0,recovery:2,alive:true,finished:false,ws});rooms.set(r.code,r);ws.player={room:r.code,id};send(ws,{type:"joined",room:r.code,id,host:true});return bc(r,state(r))}
if(m.type==="join"){leave(ws);let r=rooms.get(String(m.room).toUpperCase());if(!r)return send(ws,{type:"error",message:"Room not found"});if(r.started)return send(ws,{type:"error",message:"Race already started"});if(r.players.size>=8)return send(ws,{type:"error",message:"Room full"});let id=Math.random().toString(36).slice(2,9);r.players.set(id,{id,name:String(m.name||"Player").slice(0,18),ready:false,dist:0,recovery:2,alive:true,finished:false,ws});ws.player={room:r.code,id};send(ws,{type:"joined",room:r.code,id,host:false});return bc(r,state(r))}
if(!ws.player)return;let r=rooms.get(ws.player.room),p=r&&r.players.get(ws.player.id);if(!r||!p)return;
if(m.type==="ready"){p.ready=!!m.value;return bc(r,state(r))}
if(m.type==="start"){if(ws.player.id!==r.hostId)return send(ws,{type:"error",message:"Only host can start"});if(![...r.players.values()].every(x=>x.ready))return send(ws,{type:"error",message:"Everyone must be ready"});r.started=true;bc(r,{type:"race_start",gaps:r.gaps.map(g=>g.at)});return}
if(m.type==="jump"){if(!r.started||!p.alive||p.finished)return;let g=r.gaps.find(x=>x.at>p.dist);if(!g)return;let choice=Number(m.choice);if(![3,5,7,9].includes(choice))return;let result=choice===g.width?"nitro":choice>g.width?"skate":"fall";p.dist=g.at+1;if(result==="nitro")p.dist+=70;else if(result==="skate")p.dist+=35;else{p.recovery--;if(p.recovery<0){p.alive=false;p.dist=g.at}}if(p.dist>=2000){p.dist=2000;p.finished=true}send(ws,{type:"jump_result",result,width:g.width,recovery:p.recovery,dist:p.dist});bc(r,state(r));if([...r.players.values()].every(x=>x.finished||!x.alive))bc(r,{type:"race_over"})}
});
ws.on("close",()=>leave(ws))});
server.listen(process.env.PORT||3000,()=>console.log("4 GAP RUSH Stage 2 running"));
