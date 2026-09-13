const BASE=(process.env.BASE_URL||'https://roadquiz-tesla.onrender.com').replace(/\/$/,'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];
function ok(name,detail=''){results.push({status:'PASS',name,detail});console.log(`PASS | ${name}${detail?' | '+detail:''}`)}
function fail(name,detail=''){results.push({status:'FAIL',name,detail});console.error(`FAIL | ${name}${detail?' | '+detail:''}`);throw new Error(`${name}: ${detail}`)}
async function req(path,{method='GET',body,expect}={}){
  const r=await fetch(BASE+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data=text}
  if(expect!==undefined && r.status!==expect) throw new Error(`${method} ${path} expected ${expect}, got ${r.status}: ${text.slice(0,200)}`);
  return {r,data,text};
}
async function room(code,playerId){return (await req(`/api/rooms/${code}${playerId?`?playerId=${encodeURIComponent(playerId)}`:''}`)).data}
async function waitFor(fn,timeout=20000,step=250){const end=Date.now()+timeout;let last;while(Date.now()<end){last=await fn();if(last)return last;await sleep(step)}throw new Error('wait_timeout')}
async function playGame(code,hostId,players,gameNo,priorTexts){
  const seen=[];let lastIndex=-1;let safety=0;
  while(safety++<2000){
    const s=await room(code);
    if(s.phase==='finished')break;
    if(s.phase==='question' && s.questionIndex!==lastIndex){
      lastIndex=s.questionIndex;
      const q=s.question?.q;
      if(!q) fail(`Game ${gameNo} question ${lastIndex+1} payload`,'missing question');
      if(seen.includes(q)) fail(`Game ${gameNo} duplicate within game`,q);
      if(priorTexts.has(q)) fail(`Game ${gameNo} repeated previous-game question`,q);
      seen.push(q);
      console.log(`QUESTION | game=${gameNo} index=${lastIndex+1} | ${q}`);
      for(let i=0;i<players.length;i++){
        const ps=await room(code,players[i].id);
        if(!ps.me) fail(`Player session ${players[i].name}`,'me missing');
        const option=i%4;
        const a=await req(`/api/rooms/${code}/answer`,{method:'POST',body:{playerId:players[i].id,option}});
        if(a.r.status!==200) fail(`Answer accepted ${players[i].name}`,`status ${a.r.status}`);
      }
      if(lastIndex===0){
        const dup=await req(`/api/rooms/${code}/answer`,{method:'POST',body:{playerId:players[0].id,option:1}});
        if(dup.r.status===200) fail('Duplicate answer blocked','second answer unexpectedly accepted'); else ok('Duplicate answer blocked',`HTTP ${dup.r.status}`);
      }
    }
    await sleep(220);
  }
  const end=await room(code);
  if(end.phase!=='finished') fail(`Game ${gameNo} reaches finish`,`phase=${end.phase}`);
  if(seen.length!==20) fail(`Game ${gameNo} has 20 questions`,`saw ${seen.length}`);
  ok(`Game ${gameNo} completed`,'20 questions');
  ok(`Game ${gameNo} unique questions`,'20/20 unique');
  const scores=end.players.map(p=>p.score);
  for(let i=1;i<scores.length;i++) if(scores[i]>scores[i-1]) fail(`Game ${gameNo} leaderboard sorting`,JSON.stringify(scores));
  ok(`Game ${gameNo} leaderboard sorted`,JSON.stringify(scores));
  return {state:end,seen};
}

console.log(`RoadQuiz live QA against ${BASE}`);
try{
  const home=await req('/'); if(home.r.status!==200) fail('Homepage loads',`HTTP ${home.r.status}`); ok('Homepage loads','HTTP 200');
  if(!home.text.includes('rqConfirmPassenger')) fail('Passenger confirmation gate present','marker missing'); ok('Passenger confirmation gate present');
  for(const asset of ['/app.js','/patch.js','/analytics.js','/styles.css']){const a=await req(asset);if(a.r.status!==200)fail(`Asset ${asset}`,`HTTP ${a.r.status}`);ok(`Asset ${asset}`,'HTTP 200')}
  for(const ch of ['volt','nova','chame','drift','sprout','jelly','orbit','zip','bip','chill']){const a=await req(`/characters/${ch}.webp`);if(a.r.status!==200)fail(`Character ${ch}`,`HTTP ${a.r.status}`)} ok('All 10 character assets load');
  const fakeJoin=await req('/join/000000'); if(fakeJoin.r.status!==200) fail('SPA join route loads',`HTTP ${fakeJoin.r.status}`); ok('SPA join route loads');
  const fakeHost=await req('/host/000000'); if(fakeHost.r.status!==200) fail('SPA host route loads',`HTTP ${fakeHost.r.status}`); ok('SPA host route loads');
  const missing=await req('/api/rooms/000000'); if(missing.r.status===200) fail('Missing room rejected','HTTP 200'); ok('Missing room rejected',`HTTP ${missing.r.status}`);

  const cr=await req('/api/rooms',{method:'POST',body:{}}); if(cr.r.status!==200) fail('Create room',`HTTP ${cr.r.status}`);
  const {code,hostId}=cr.data; if(!code||!hostId) fail('Create room response','missing code/hostId'); ok('Create room',`room ${code}`);
  let s=await room(code); if(s.phase!=='lobby'||s.players.length!==0) fail('Fresh room lobby state',JSON.stringify({phase:s.phase,players:s.players?.length})); ok('Fresh room lobby state');
  const badStart=await req(`/api/rooms/${code}/start`,{method:'POST',body:{hostId:'wrong'}}); if(badStart.r.status===200) fail('Invalid host rejected','start accepted'); ok('Invalid host rejected',`HTTP ${badStart.r.status}`);

  const names=['QA_Ada','QA_Mert','QA_Luna','QA_Efe']; const players=[];
  for(let i=0;i<names.length;i++){
    const j=await req(`/api/rooms/${code}/join`,{method:'POST',body:{name:`${names[i]}~${i}`}});
    if(j.r.status!==200||!j.data.playerId) fail(`Join ${names[i]}`,`HTTP ${j.r.status}`);
    players.push({name:names[i],id:j.data.playerId}); ok(`Join ${names[i]}`);
  }
  s=await room(code); if(s.players.length!==4) fail('Four players visible',`count ${s.players.length}`); ok('Four players visible');
  const badAnswer=await req(`/api/rooms/${code}/answer`,{method:'POST',body:{playerId:'bad-player',option:0}}); if(badAnswer.r.status===200) fail('Invalid player rejected','answer accepted'); ok('Invalid player rejected',`HTTP ${badAnswer.r.status}`);

  const start=await req(`/api/rooms/${code}/start`,{method:'POST',body:{hostId}}); if(start.r.status!==200) fail('Start game',`HTTP ${start.r.status}`); ok('Start game');
  const g1=await playGame(code,hostId,players,1,new Set());
  const firstSet=new Set(g1.seen);

  const replay=await req(`/api/rooms/${code}/start`,{method:'POST',body:{hostId}}); if(replay.r.status!==200) fail('Same-team replay starts',`HTTP ${replay.r.status}`); ok('Same-team replay starts');
  const replayState=await waitFor(async()=>{const x=await room(code);return x.phase==='question'?x:null});
  if(replayState.players.some(p=>p.score!==0)) fail('Replay score reset',JSON.stringify(replayState.players.map(p=>p.score))); ok('Replay score reset','all players at 0');
  for(const p of players){const ps=await room(code,p.id);if(!ps.me)fail(`Replay keeps ${p.name}`,'session missing')} ok('Replay keeps same 4 player sessions');
  const g2=await playGame(code,hostId,players,2,firstSet);
  const overlap=g2.seen.filter(q=>firstSet.has(q)); if(overlap.length) fail('No repeat across games',overlap.join(' | ')); ok('No repeat across first two games','40 distinct questions');

  const third=await req(`/api/rooms/${code}/start`,{method:'POST',body:{hostId}}); if(third.r.status!==200) fail('Third game starts',`HTTP ${third.r.status}`);
  const g3s=await waitFor(async()=>{const x=await room(code);return x.phase==='question'?x:null});
  const first40=new Set([...g1.seen,...g2.seen]); if(first40.has(g3s.question.q)) fail('Third game first question is fresh',g3s.question.q); ok('Third game first question is fresh');
  if(g3s.players.some(p=>p.score!==0)) fail('Third-game score reset',JSON.stringify(g3s.players.map(p=>p.score))); ok('Third-game score reset');

  const returnHome=await req('/'); if(returnHome.r.status!==200) fail('Return-home target loads',`HTTP ${returnHome.r.status}`); ok('Return-home target loads');
  console.log('\nQA_SUMMARY_START');
  for(const x of results)console.log(`${x.status}\t${x.name}\t${x.detail||''}`);
  console.log('QA_SUMMARY_END');
  process.exit(0);
}catch(e){
  console.error('\nQA_FATAL',e.stack||e);
  console.log('\nQA_SUMMARY_START');for(const x of results)console.log(`${x.status}\t${x.name}\t${x.detail||''}`);console.log('QA_SUMMARY_END');process.exit(1);
}
