const fs=require('fs'),path=require('path'),Module=require('module');
let code=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');

const engineHead="const engine=`const questionBank=buildBank();";
const engineHeadNext="const engine=`const {DEFAULT_COUNTRY,getCountryPack}=require('./countries/registry');\nconst {byLevel:buildTRBank,audit:trQuestionAudit}=require('./countries/tr/questions');\nconst questionBank=buildTRBank();";
if(!code.includes(engineHead))throw new Error('Country engine patch target not found');
code=code.replace(engineHead,engineHeadNext);

const categoryFrom="const a=['Coğrafya','Coğrafya','Coğrafya','Tarih','Tarih','Tarih','Bilim','Bilim','Bilim','Kültür & Sanat','Kültür & Sanat','Kültür & Sanat','Edebiyat','Edebiyat','Teknoloji','Teknoloji','Matematik','Matematik','Genel Kültür','Genel Kültür'];";
const categoryTo="const a=['Coğrafya','Coğrafya','Coğrafya','Tarih','Tarih','Tarih','Bilim','Bilim','Bilim','Kültür & Sanat','Kültür & Sanat','Kültür & Sanat','Genel Kültür','Genel Kültür','Teknoloji','Teknoloji','Matematik','Matematik','Spor','Spor'];";
if(!code.includes(categoryFrom))throw new Error('Balanced category patch target not found');
code=code.replace(categoryFrom,categoryTo);

const extrasFrom="if(extraByCategory[cat])pool=pool.concat(extraByCategory[cat]);if(cat==='Kültür & Sanat')pool=extraByCategory[cat].slice();";
if(!code.includes(extrasFrom))throw new Error('Legacy extras patch target not found');
code=code.replace(extrasFrom,'');

const familyBodyFrom="function questionFamily(q){const t=q.q.toLocaleLowerCase('tr-TR');if(/postgresql|\\bsql\\b|veritaban/.test(t))return'database';if(/kimyasal sembol|element/.test(t))return'element-symbol';if(/başkenti|başkentidir/.test(t))return'capital';return q.cat+'|'+t.replace(/[^a-z0-9çğıöşü ]/gi,'').split(/\\s+/).slice(0,4).join('-')}";
const familyBodyTo="function questionFamily(q){const t=q.q.toLocaleLowerCase('tr-TR');if(/postgresql|\\bsql\\b|veritaban/.test(t))return'database';if(/kimyasal sembol|element/.test(t))return'element-symbol';if(/başkenti|başkentidir/.test(t))return'capital';if(/para birimi/.test(t))return'currency';if(q.cat==='Tarih'&&/(hangi yılda|hangi yıl|yılıyla)/.test(t))return'history-year';return q.cat+'|'+t.replace(/[^a-z0-9çğıöşü ]/gi,'').split(/\\s+/).slice(0,4).join('-')}";
if(!code.includes(familyBodyFrom))throw new Error('Question family patch target not found');
code=code.replace(familyBodyFrom,familyBodyTo);

const from="let pool=questionBank[level].filter(q=>q.cat===cat);";
const to="let pool=questionBank[level].filter(q=>q.cat===cat);if(!pool.length)pool=questionBank.flat().filter(q=>q.cat===cat);";
if(!code.includes(from))throw new Error('Safe question picker patch target not found');
code=code.replace(from,to);

const signatureFrom="function pickGameQuestions(){const cats=";
const signatureTo="function pickGameQuestions(excludedTexts,countryCode=DEFAULT_COUNTRY){const countryPack=getCountryPack(countryCode);if(!countryPack.enabled)throw new Error('country_disabled');if(countryPack.code!=='TR')throw new Error('country_question_pack_missing');const cats=";
if(!code.includes(signatureFrom))throw new Error('Question picker signature patch target not found');
code=code.replace(signatureFrom,signatureTo);

const recentFrom="recent=new Set(recentQuestionTexts);";
const recentTo="recent=new Set(excludedTexts||recentQuestionTexts);";
if(!code.includes(recentFrom))throw new Error('Question exclusion patch target not found');
code=code.replace(recentFrom,recentTo);

const historyFrom="recentQuestionTexts.push(...picked.map(q=>q.q));if(recentQuestionTexts.length>40)recentQuestionTexts.splice(0,recentQuestionTexts.length-40);";
const historyTo="if(!excludedTexts){recentQuestionTexts.push(...picked.map(q=>q.q));if(recentQuestionTexts.length>5000)recentQuestionTexts.splice(0,recentQuestionTexts.length-5000)}";
if(!code.includes(historyFrom))throw new Error('Question history patch target not found');
code=code.replace(historyFrom,historyTo);

const diversityFrom="if(cat==='Coğrafya'){const nonRepeatType=candidates.filter(q=>!(questionFamily(q)==='capital'&&usedFamilies.has('capital')));if(nonRepeatType.length)candidates=nonRepeatType}";
const diversityTo="if(cat==='Coğrafya'){const nonRepeatType=candidates.filter(q=>!(questionFamily(q)==='capital'&&usedFamilies.has('capital')));if(nonRepeatType.length)candidates=nonRepeatType}const familyFresh=candidates.filter(q=>!usedFamilies.has(questionFamily(q)));if(familyFresh.length)candidates=familyFresh;";
if(!code.includes(diversityFrom))throw new Error('Question diversity patch target not found');
code=code.replace(diversityFrom,diversityTo);

const fallbackFrom="if(!candidates.length)candidates=pool.filter(q=>!usedText.has(q.q));if(!candidates.length)candidates=pool;";
const fallbackTo="if(!candidates.length)candidates=questionBank.flat().filter(q=>!usedText.has(q.q)&&!recent.has(q.q));if(!candidates.length)throw new Error('question_pool_exhausted');";
if(!code.includes(fallbackFrom))throw new Error('Question fallback patch target not found');
code=code.replace(fallbackFrom,fallbackTo);

const familyFrom="function questionFamily(q)";
const familyTo="const uniqueQuestionCount=trQuestionAudit.uniqueTexts;\nfunction questionFamily(q)";
if(!code.includes(familyFrom))throw new Error('Unique question count patch target not found');
code=code.replace(familyFrom,familyTo);

const injectFrom="code=code.replace(target,engine);";
const injectTo=`code=code.replace(target,engine);
const roomCreateFrom="rooms.set(code,{code,hostId,players:new Map(),phase:'lobby',questionIndex:0,answers:new Map(),durationMs:15000,revealMs:4000,questionStartedAt:null,revealStartedAt:null,questions:pickGameQuestions()});";
const roomCreateTo="rooms.set(code,{code,hostId,country:DEFAULT_COUNTRY,countryPack:getCountryPack(DEFAULT_COUNTRY),gameCount:0,usedQuestionTexts:new Set(),players:new Map(),phase:'lobby',questionIndex:0,answers:new Map(),durationMs:15000,revealMs:4000,questionStartedAt:null,revealStartedAt:null,questions:pickGameQuestions(new Set(),DEFAULT_COUNTRY)});";
if(!code.includes(roomCreateFrom))throw new Error('Country room patch target not found');
code=code.replace(roomCreateFrom,roomCreateTo);
const replayFrom="room.phase='question';room.questionIndex=0;room.answers.clear();room.questionStartedAt=Date.now();room.revealStartedAt=null;return json(res,200,{ok:true})";
const replayTo="if(room.phase!=='lobby'&&room.phase!=='finished')return json(res,409,{error:'already_started'});for(const p of room.players.values())p.score=0;if(!room.usedQuestionTexts)room.usedQuestionTexts=new Set();if(room.phase==='finished')room.questions=pickGameQuestions(room.usedQuestionTexts,room.country||DEFAULT_COUNTRY);for(const q of room.questions)room.usedQuestionTexts.add(q.q);room.gameCount=(room.gameCount||0)+1;room.phase='question';room.questionIndex=0;room.answers.clear();room.questionStartedAt=Date.now();room.revealStartedAt=null;return json(res,200,{ok:true})";
if(!code.includes(replayFrom))throw new Error('Replay reset patch target not found');
code=code.replace(replayFrom,replayTo);
const lobbyMeFrom="if(room.phase==='lobby')return s;";
const lobbyMeTo="if(playerId&&room.players.has(playerId))s.me={id:playerId,...room.players.get(playerId),answered:room.answers.has(playerId)};if(room.phase==='lobby'||room.phase==='closed')return s;";
if(!code.includes(lobbyMeFrom))throw new Error('Lobby player-state patch target not found');
code=code.replace(lobbyMeFrom,lobbyMeTo);
const joinStateFrom="if(req.method==='POST'&&action==='join'){if(room.phase!=='lobby')return json(res,409,{error:'game_started'});";
const joinStateTo="if(req.method==='POST'&&action==='join'){if(room.phase==='closed')return json(res,410,{error:'room_closed'});if(room.phase!=='lobby')return json(res,409,{error:'game_started'});";
if(!code.includes(joinStateFrom))throw new Error('Join room-state patch target not found');
code=code.replace(joinStateFrom,joinStateTo);
const answerFrom="if(req.method==='POST'&&action==='answer'){";
const answerTo="if(req.method==='POST'&&action==='close'){if(!hostOk)return json(res,403,{error:'forbidden'});room.phase='closed';room.questionStartedAt=null;room.revealStartedAt=null;return json(res,200,{ok:true})}if(req.method==='POST'&&action==='answer'){";
if(!code.includes(answerFrom))throw new Error('Close room patch target not found');
code=code.replace(answerFrom,answerTo);
code=code.replace("bankSize:questionBank.reduce((a,p)=>a+p.length,0)","bankSize:uniqueQuestionCount,country:room.country||DEFAULT_COUNTRY,gameCount:room.gameCount||0");`;
if(!code.includes(injectFrom))throw new Error('Bootstrap injection target not found');
code=code.replace(injectFrom,injectTo);

const runtime=new Module(path.join(__dirname,'bootstrap-runtime.js'),module);
runtime.filename=path.join(__dirname,'bootstrap-runtime.js');
runtime.paths=module.paths;
runtime._compile(code,runtime.filename);
