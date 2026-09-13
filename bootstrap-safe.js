const fs=require('fs'),path=require('path'),Module=require('module');
let code=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');

// Make the generated server country-aware. TR is the first real country pack;
// future packs can plug into the same picker contract without changing room flow.
const engineHead="const engine=`const questionBank=buildBank();";
const engineHeadNext="const engine=`const {DEFAULT_COUNTRY,getCountryPack}=require('./countries/registry');\nconst questionBank=buildBank();";
if(!code.includes(engineHead))throw new Error('Country engine patch target not found');
code=code.replace(engineHead,engineHeadNext);

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

const historyFrom="if(recentQuestionTexts.length>40)recentQuestionTexts.splice(0,recentQuestionTexts.length-40);";
const historyTo="if(!excludedTexts){recentQuestionTexts.push(...picked.map(q=>q.q));if(recentQuestionTexts.length>5000)recentQuestionTexts.splice(0,recentQuestionTexts.length-5000)}";
if(!code.includes(historyFrom))throw new Error('Question history patch target not found');
// The original function already pushes once immediately before historyFrom.
// Remove that push too so room-specific history is authoritative during a game series.
code=code.replace("recentQuestionTexts.push(...picked.map(q=>q.q));"+historyFrom,historyTo);

const fallbackFrom="if(!candidates.length)candidates=pool.filter(q=>!usedText.has(q.q));if(!candidates.length)candidates=pool;";
const fallbackTo="if(!candidates.length){const all=[...questionBank.flat(),...Object.values(extraByCategory).flat()];candidates=all.filter(q=>!usedText.has(q.q)&&!recent.has(q.q))}if(!candidates.length)throw new Error('question_pool_exhausted');";
if(!code.includes(fallbackFrom))throw new Error('Question fallback patch target not found');
code=code.replace(fallbackFrom,fallbackTo);

// Count actual unique question texts, not generated entries. This is the number that
// matters for the cumulative same-room no-repeat guarantee.
const familyFrom="function questionFamily(q)";
const familyTo="const uniqueQuestionCount=new Set([...questionBank.flat(),...Object.values(extraByCategory).flat()].map(q=>q.q)).size;\nfunction questionFamily(q)";
if(!code.includes(familyFrom))throw new Error('Unique question count patch target not found');
code=code.replace(familyFrom,familyTo);

// Patch server.js after bootstrap.js has inserted the question engine.
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
code=code.replace("bankSize:questionBank.reduce((a,p)=>a+p.length,0)","bankSize:uniqueQuestionCount,country:room.country||DEFAULT_COUNTRY,gameCount:room.gameCount||0");
code=code.replace("question bank: \\${questionBank.reduce((a,p)=>a+p.length,0)}","question bank unique: \\${uniqueQuestionCount}; generated entries: \\${questionBank.reduce((a,p)=>a+p.length,0)}; country: \\${DEFAULT_COUNTRY}");`;
if(!code.includes(injectFrom))throw new Error('Bootstrap injection target not found');
code=code.replace(injectFrom,injectTo);

const runtime=new Module(path.join(__dirname,'bootstrap-runtime.js'),module);
runtime.filename=path.join(__dirname,'bootstrap-runtime.js');
runtime.paths=module.paths;
runtime._compile(code,runtime.filename);
