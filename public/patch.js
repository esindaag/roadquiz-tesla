const RQ_CHAR_NAMES=['VOLT','NOVA','CHAME','DRIFT','SPROUT','JELLY','ORBIT','ZIP','BIP','CHILL'];
const RQ_CHAR_FILES=['volt','nova','chame','drift','sprout','jelly','orbit','zip','bip','chill'];
function rqCharIndex(p){const d=pdata(p.name);return Math.max(0,CHARACTERS.findIndex(c=>c.id===d.char.id))}
function characterArt(i,cls=''){const safe=Math.max(0,Math.min(RQ_CHAR_FILES.length-1,Number(i)||0));return `<img class="rq-char-png ${cls}" src="/characters/${RQ_CHAR_FILES[safe]}.webp" alt="${RQ_CHAR_NAMES[safe]}" loading="eager" decoding="async">`}

const rqStyle=document.createElement('style');rqStyle.textContent=`
.rq-char-png{display:block;max-width:100%;max-height:100%;object-fit:contain}
.rq-chargrid .charpick{overflow:hidden}
.rq-chargrid .charpick>.char-art{width:100%;height:92px;object-fit:contain}
.avatar-stage{display:flex;align-items:center;justify-content:center;overflow:visible}
.avatar-stage .avatar-art{width:100%;height:100%;object-fit:contain}
.home-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:stretch;margin-top:18px}
.home-actions .btn{flex:1 1 220px}
.btn.secondary{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);color:#fff}
.passenger-box{display:none;margin-top:14px;padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.05)}
.passenger-box.open{display:block}
.passenger-row{display:flex;gap:10px}
.passenger-row .input{flex:1;min-width:0;text-align:center;letter-spacing:.22em;font-weight:800}
.passenger-row .btn{white-space:nowrap}
.home-err{min-height:20px;margin:8px 2px 0;color:#ff9a9a;font-size:13px}
.final-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.final-actions .btn{min-width:210px}

/* Tesla host quiz: compact answers + persistent live score panel */
.game{position:relative}
.game .question-stage{margin-right:286px}
.game .question{font-size:clamp(22px,2.45vw,36px);max-width:960px;margin-bottom:4px}
.game .answers{gap:8px}
.game .answer{font-size:clamp(15px,1.28vw,20px);padding:10px 13px;border-radius:14px}
.game .ansicon{width:31px;height:31px;border-radius:9px}
.game .bottomdock{min-height:22px}
.game .scorebar{position:absolute;right:0;top:132px;width:264px;display:flex;flex-direction:column;align-items:stretch;gap:7px;overflow:visible;padding:12px;background:linear-gradient(180deg,rgba(20,25,31,.97),rgba(12,16,20,.96));border:1px solid #303842;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.28);z-index:5}
.scorepanel-title{display:flex;justify-content:space-between;align-items:center;padding:0 2px 4px;border-bottom:1px solid #293039;font-size:10px;font-weight:950;letter-spacing:.14em;color:#89949f}
.scorepanel-title b{color:#d8dde2;font-size:9px}
.game .scorechip{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 10px;border-radius:13px;background:#171d23;border:1px solid #2d353e}
.game .scorechip:first-of-type{border-color:#4b5967;background:#1b2229}
.game .scorechip .avatar.micro{width:38px;height:38px;border-radius:11px}
.game .scorechip .ranktext{display:flex;flex-direction:column;gap:1px;min-width:0}
.game .scorechip .ranktext span{font-size:9px;color:#788591;font-weight:900}
.game .scorechip .ranktext b{font-size:14px;max-width:118px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#f1f4f6}
.game .scorechip strong{font-size:19px;line-height:1;font-weight:1000;color:#fff;letter-spacing:-.02em}
.game .scorechip strong small{display:block;margin-top:4px;font-size:7px;letter-spacing:.14em;color:#788591;text-align:right}
@media(max-width:1100px){
 .game .question-stage{margin-right:0}
 .game .scorebar{position:static;width:100%;flex-direction:row;align-items:center;padding:6px;background:transparent;border:0;box-shadow:none;overflow:hidden}
 .scorepanel-title{display:none}
 .game .scorechip{display:flex;flex:1;min-width:0;padding:6px 8px}
 .game .scorechip .avatar.micro{width:28px;height:28px}
 .game .scorechip .ranktext span{display:none}
 .game .scorechip .ranktext b{font-size:12px}
 .game .scorechip strong{font-size:13px;margin-left:auto}
 .game .scorechip strong small{display:none}
}
@media(max-width:640px){.passenger-row{flex-direction:column}.home-actions{flex-direction:column}.home-actions .btn{width:100%}}
`;document.head.appendChild(rqStyle);

confetti=function(){if(document.querySelector('.confetti-radial'))return;const host=document.createElement('div');host.className='confetti-radial';for(let i=0;i<78;i++){const p=document.createElement('i'),a=Math.random()*Math.PI*2,d=150+Math.random()*390;p.dataset.c=i%6;p.style.setProperty('--dx',Math.cos(a)*d+'px');p.style.setProperty('--dy',Math.sin(a)*d*.68+'px');p.style.setProperty('--fall',(260+Math.random()*420)+'px');p.style.setProperty('--rot',(220+Math.random()*760)+'deg');p.style.setProperty('--delay',(Math.random()*.12)+'s');p.style.setProperty('--dur',(1.85+Math.random()*.45)+'s');host.appendChild(p)}document.body.appendChild(host);setTimeout(()=>host.remove(),2700)};

avatar=function(p,cls=''){const idx=rqCharIndex(p);return `<div class="avatar avatar3d char-${idx} ${cls}" title="${RQ_CHAR_NAMES[idx]}"><div class="avatar-stage">${characterArt(idx,'avatar-art')}<div class="avatar-shadow"></div></div><div class="avatar-tag">${RQ_CHAR_NAMES[idx]}</div></div>`};

scoreBar=function(ps){return `<div class="scorebar"><div class="scorepanel-title"><span>LIVE SCORE</span><b>TOP ${Math.min(ps.length,5)}</b></div>${ps.slice(0,5).map((p,i)=>{const d=pdata(p.name);return `<div class="scorechip">${avatar(p,'micro')}<div class="ranktext"><span>#${i+1}</span><b>${esc(d.name)}</b></div><strong>${p.score.toLocaleString('tr-TR')}<small>PUAN</small></strong></div>`}).join('')}</div>`};

home=function(){page(`${topbar('READY')}<main class="homegrid homegrid-solo"><section class="homecopy"><div class="eyebrow">PASSENGER ARCADE</div><h1>Yolculuğu<br><span>oyuna çevir.</span></h1><p>Tesla ekranı sahne, telefonlar kumanda. 1000 soruluk havuzdan her tur 20 soru.</p><div class="home-actions"><button id="create" class="btn primary bigbtn">Oyun Odası Oluştur <span>→</span></button><button id="passenger" class="btn secondary bigbtn">Ben Yolcuyum</button></div><div id="passengerBox" class="passenger-box"><div class="smallcaps">ODA KODUNU GİR</div><div class="passenger-row"><input id="roomInput" class="input" inputmode="numeric" maxlength="6" placeholder="000000"><button id="confirmRoom" class="btn primary">Onayla →</button></div><div id="homeErr" class="home-err"></div></div><div class="specrow"><div><b>20</b><span>SORU</span></div><div><b>15s</b><span>SÜRE</span></div><div><b>10</b><span>KARAKTER</span></div></div></section></main>`);$('#create').onclick=createRoom;$('#passenger').onclick=()=>{const box=$('#passengerBox');box.classList.toggle('open');if(box.classList.contains('open'))setTimeout(()=>$('#roomInput')?.focus(),50)};const go=async()=>{const input=$('#roomInput'),err=$('#homeErr'),code=(input.value||'').replace(/\D/g,'').slice(0,6);input.value=code;err.textContent='';if(code.length!==6){err.textContent='6 haneli oda kodunu gir.';return}try{await api(`/api/rooms/${code}`);location.href=`/join/${code}`}catch(e){err.textContent=e.message==='room_not_found'?'Bu oda bulunamadı. Kodu kontrol et.':'Odaya bağlanılamadı.'}};$('#confirmRoom').onclick=go;$('#roomInput').onkeydown=e=>{if(e.key==='Enter')go()};$('#roomInput').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6)}};

joinScreen=function(){let selected='0';page(`<div class="phoneJoin"><div class="mobile-top"><div class="rqmark">RQ</div><div><div class="brand">ROADQUIZ</div><div class="statusline">ROOM ${esc(roomCode)}</div></div></div><div class="joinCard"><div class="eyebrow">PLAYER PROFILE</div><h1>Yolcu profilini oluştur</h1><input id="name" class="input" maxlength="13" placeholder="Adın" autocomplete="off"><div class="smallcaps charlabel">KARAKTERİNİ SEÇ</div><div class="chargrid rq-chargrid">${CHARACTERS.map((c,i)=>`<button type="button" class="charpick ${i===0?'selected':''}" data-id="${c.id}">${characterArt(i,'char-art')}<b>${RQ_CHAR_NAMES[i]}</b><small>ROADQUIZ CREW</small></button>`).join('')}</div><button type="button" id="join" class="btn primary full joinbtn">Araca Bağlan ⚡</button><p id="err" class="small error"></p></div></div>`,'phone');document.querySelectorAll('.charpick').forEach(b=>b.onclick=()=>{selected=b.dataset.id;document.querySelectorAll('.charpick').forEach(x=>x.classList.remove('selected'));b.classList.add('selected')});$('#join').onclick=async()=>{const btn=$('#join');try{btn.disabled=true;const n=$('#name').value.trim();if(!n)throw Error('Adını yazmalısın');const d=await api(`/api/rooms/${roomCode}/join`,{method:'POST',body:JSON.stringify({name:`${n}~${selected}`})});playerId=d.playerId;sessionStorage.playerId=playerId;sessionStorage.playerRoom=roomCode;playerLoop()}catch(e){btn.disabled=false;$('#err').textContent=e.message}}};

finishedHost=function(s){if(document.querySelector('.final-v3'))return;const w=s.players[0],second=s.players[1],third=s.players[2],wd=w?pdata(w.name):{name:'Şampiyon'};const pblock=(p,place,cls)=>p?`<div class="victory-podium ${cls}">${avatar(p,'podium-avatar')}<div class="podium-meta"><span>${place}</span><b>${esc(pdata(p.name).name)}</b><strong>${p.score.toLocaleString('tr-TR')}</strong><small>PUAN</small></div></div>`:`<div class="victory-podium ${cls} empty"><div class="podium-meta"><span>${place}</span></div></div>`;page(`<div class="final-screen final-v3">${topbar('TRIP COMPLETE')}<section class="victory-head"><div class="victory-title">Tebrikler!</div><div class="victory-sub">YOLUN BİLGİ ŞAMPİYONU</div></section><section class="victory-stage"><div class="winner-glow"></div><div class="victory-podiums">${pblock(second,2,'second')}${pblock(w,1,'first')}${pblock(third,3,'third')}</div></section><div class="winner-summary"><b>${esc(wd.name)}</b><strong>${w?w.score.toLocaleString('tr-TR'):'0'}</strong><span>PUAN</span></div><div class="final-actions"><button id="newGame" class="btn primary bigbtn">Aynı Ekiple Yeni Oyun ⚡</button><button id="goHome" class="btn secondary bigbtn">Ana Sayfaya Dön</button></div></div>`);confetti();const ng=$('#newGame');if(ng)ng.onclick=async()=>{try{ng.disabled=true;ng.textContent='Yeni oyun başlıyor…';await api(`/api/rooms/${roomCode}/start`,{method:'POST',body:JSON.stringify({hostId})})}catch(e){ng.disabled=false;ng.textContent='Aynı Ekiple Yeni Oyun ⚡';console.error(e)}};const gh=$('#goHome');if(gh)gh.onclick=()=>{sessionStorage.removeItem('hostId');hostId=null;roomCode=null;location.href='/'}};

pFinished=function(s){if(document.querySelector('.phone-finish'))return;const d=pdata(s.me.name),rank=s.players.findIndex(p=>p.id===s.me.id)+1,isWinner=rank===1;page(`<div class="locked phone-finish ${isWinner?'phone-winner':'phone-loser'}">${avatar(s.me,'phone-avatar')}<div class="eyebrow">TRIP COMPLETE</div><h1>${isWinner?'Tebrikler!':'Yarışma bitti'}</h1><div class="phone-final-score"><strong>${s.me.score.toLocaleString('tr-TR')}</strong><span>PUAN</span></div><div class="phone-rank">#${rank}</div><p>${isWinner?'Yolun bilgi şampiyonu sensin.':'Podyum araç ekranında.'}</p><p>Sunucu yeni oyun başlatırsa otomatik devam edeceksin.</p></div>`,'phone')};

if(parts[0]==='join'&&parts[1]){clearInterval(timer);if(playerId&&sessionStorage.playerRoom===roomCode)playerLoop();else{playerId=null;sessionStorage.removeItem('playerId');sessionStorage.removeItem('playerRoom');joinScreen()}}
else if(parts.length===0){clearInterval(timer);home()}
document.documentElement.classList.add('rq-ready');