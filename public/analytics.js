(function(){
  const PREFIX='/__rq_event/';
  const safe=s=>String(s||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40);
  let visitor=localStorage.getItem('rq_vid');
  if(!visitor){visitor=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,16);localStorage.setItem('rq_vid',visitor)}
  function track(event,onceKey){
    const eventName=safe(event); if(!eventName)return;
    const key=onceKey?`rq_evt_${onceKey}`:null;
    if(key&&sessionStorage.getItem(key))return;
    if(key)sessionStorage.setItem(key,'1');
    fetch(`${PREFIX}${eventName}/${safe(visitor)}`,{method:'GET',cache:'no-store',keepalive:true}).catch(()=>{});
  }
  window.rqTrack=track;
  track('site_visit','site_visit');
  if(location.pathname.startsWith('/join/'))track('join_opened',`join_opened_${location.pathname.split('/')[2]||''}`);

  document.addEventListener('click',function(e){
    const el=e.target.closest('button,a'); if(!el)return;
    if(el.id==='rqConfirmPassenger')track('passenger_confirmed','passenger_confirmed');
    if(el.id==='create'){
      setTimeout(()=>{if(location.pathname.startsWith('/host/'))track('room_created',`room_created_${location.pathname}`)},900);
    }
    if(el.id==='join'){
      setTimeout(()=>{if(sessionStorage.getItem('playerId'))track('player_joined',`player_joined_${sessionStorage.getItem('playerId')}`)},1000);
    }
    if(el.id==='newGame'){
      track('replay_clicked');
      const code=location.pathname.split('/')[2]||'room';
      sessionStorage.removeItem(`rq_evt_game_started_${code}`);
      sessionStorage.removeItem(`rq_evt_game_completed_${code}`);
      setTimeout(()=>track('replay_started'),1200);
    }
    if(el.id==='goHome')track('return_home');
  },true);

  let scanTimer=null;
  function scan(){
    clearTimeout(scanTimer); scanTimer=setTimeout(()=>{
      const code=location.pathname.split('/')[2]||'room';
      if(location.pathname.startsWith('/host/')&&document.querySelector('.game'))track('game_started',`game_started_${code}`);
      if(location.pathname.startsWith('/host/')&&document.querySelector('.final-v3'))track('game_completed',`game_completed_${code}`);
    },80);
  }
  const app=document.getElementById('app');
  if(app){new MutationObserver(scan).observe(app,{childList:true,subtree:true});scan()}
})();
