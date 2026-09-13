(function(){
function clearPlayerSession(){sessionStorage.removeItem('playerId');sessionStorage.removeItem('playerRoom');playerId=null}
function roomClosedScreen(){clearInterval(timer);clearPlayerSession();page(`<div class="locked phone-finish"><div class="eyebrow">ROOM CLOSED</div><h1>Oyun odası kapatıldı</h1><p>Sunucu ana sayfaya döndü. Yeni bir oyun için yeni oda kodunu bekle.</p><button id="rqBackHome" class="btn secondary full">Ana Sayfaya Dön</button></div>`,'phone');const b=$('#rqBackHome');if(b)b.onclick=()=>{location.href='/'}}

const originalJoinScreen=joinScreen;
joinScreen=function(){originalJoinScreen();const btn=$('#join');if(!btn)return;btn.onclick=async()=>{try{btn.disabled=true;const n=$('#name').value.trim();if(!n)throw Error('Adını yazmalısın');const selected=document.querySelector('.charpick.selected')?.dataset.id||'0';const d=await api(`/api/rooms/${roomCode}/join`,{method:'POST',body:JSON.stringify({name:`${n}~${selected}`})});playerId=d.playerId;sessionStorage.playerId=playerId;sessionStorage.playerRoom=roomCode;await playerLoop()}catch(e){btn.disabled=false;const err=$('#err');if(!err)return;if(e.message==='game_started')err.textContent='Bu oyun zaten başladı. Sunucudan yeni bir oda kodu iste.';else if(e.message==='room_closed'||e.message==='room_not_found')err.textContent='Bu oda artık aktif değil. Yeni oda kodunu iste.';else err.textContent=e.message||'Odaya bağlanılamadı.'}}
};

playerLoop=async function(){clearInterval(timer);const tick=async()=>{try{const s=await api(`/api/rooms/${roomCode}?playerId=${playerId}`);if(s.phase==='closed')return roomClosedScreen();if(!s.me){clearPlayerSession();return joinScreen()}s.phase==='lobby'?pLobby(s):s.phase==='finished'?pFinished(s):pQuestion(s)}catch(e){if(e.message==='room_not_found'||e.message==='room_closed')return roomClosedScreen();console.error(e)}};await tick();timer=setInterval(tick,450)};

const originalFinishedHost=finishedHost;
finishedHost=function(s){originalFinishedHost(s);const gh=$('#goHome');if(gh)gh.onclick=async()=>{if(gh.dataset.busy)return;gh.dataset.busy='1';const savedHost=hostId||sessionStorage.hostId;try{gh.disabled=true;gh.textContent='Oda kapatılıyor…';if(savedHost&&roomCode)await api(`/api/rooms/${roomCode}/close`,{method:'POST',body:JSON.stringify({hostId:savedHost})})}catch(e){console.error('RoadQuiz close room failed',e)}finally{sessionStorage.removeItem('hostId');hostId=null;roomCode=null;location.href='/'}}};

const style=document.createElement('style');style.textContent='@media(min-width:1000px){.passenger-card .players{scrollbar-width:none}.passenger-card .players::-webkit-scrollbar{display:none}}';document.head.appendChild(style);
})();
