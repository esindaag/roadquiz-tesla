const http=require('http');
const originalCreateServer=http.createServer;
const stats={startedAt:new Date().toISOString(),counts:Object.create(null),visitors:new Set(),sources:Object.create(null)};

function safe(v,re){v=String(v||'');return re.test(v)?v:''}
function record(event,visitor,source){
  event=safe(event,/^[a-z0-9_-]{1,40}$/); if(!event)return;
  stats.counts[event]=(stats.counts[event]||0)+1;
  visitor=safe(visitor,/^[a-zA-Z0-9_-]{1,40}$/); if(visitor)stats.visitors.add(visitor);
  source=safe(source,/^[a-zA-Z0-9_-]{1,40}$/);
  if(source){if(!stats.sources[source])stats.sources[source]=Object.create(null);stats.sources[source][event]=(stats.sources[source][event]||0)+1}
}

http.createServer=function(handler){
  return originalCreateServer.call(http,async(req,res)=>{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    const m=url.pathname.match(/^\/__rq_event\/([a-z0-9_-]{1,40})\/([a-zA-Z0-9_-]{1,40})$/);
    if(req.method==='GET'&&m){record(m[1],m[2],url.searchParams.get('source'));res.writeHead(204,{'Cache-Control':'no-store'});return res.end()}
    if(req.method==='GET'&&url.pathname==='/api/analytics'){
      res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      return res.end(JSON.stringify({startedAt:stats.startedAt,uniqueVisitors:stats.visitors.size,counts:stats.counts,sources:stats.sources}));
    }
    return handler(req,res);
  });
};

require('./bootstrap-safe');
