const fs=require('fs'),path=require('path'),Module=require('module');
let code=fs.readFileSync(path.join(__dirname,'bootstrap.js'),'utf8');
const from="let pool=questionBank[level].filter(q=>q.cat===cat);";
const to="let pool=questionBank[level].filter(q=>q.cat===cat);if(!pool.length)pool=questionBank.flat().filter(q=>q.cat===cat);";
if(!code.includes(from))throw new Error('Safe question picker patch target not found');
code=code.replace(from,to);

const historyFrom="if(recentQuestionTexts.length>40)recentQuestionTexts.splice(0,recentQuestionTexts.length-40);";
const historyTo="if(recentQuestionTexts.length>1000)recentQuestionTexts.splice(0,recentQuestionTexts.length-1000);";
if(!code.includes(historyFrom))throw new Error('Question history patch target not found');
code=code.replace(historyFrom,historyTo);

const fallbackFrom="if(!candidates.length)candidates=pool.filter(q=>!usedText.has(q.q));if(!candidates.length)candidates=pool;";
const fallbackTo="if(!candidates.length)candidates=questionBank.flat().filter(q=>q.cat===cat&&!usedText.has(q.q)&&!recent.has(q.q));if(!candidates.length)candidates=questionBank.flat().filter(q=>!usedText.has(q.q)&&!recent.has(q.q));if(!candidates.length)candidates=pool.filter(q=>!usedText.has(q.q));";
if(!code.includes(fallbackFrom))throw new Error('Question fallback patch target not found');
code=code.replace(fallbackFrom,fallbackTo);

const replayFrom="room.phase='question';room.questionIndex=0;room.answers.clear();room.questionStartedAt=Date.now();room.revealStartedAt=null;return json(res,200,{ok:true})";
const replayTo="for(const p of room.players.values())p.score=0;room.questions=pickGameQuestions();room.phase='question';room.questionIndex=0;room.answers.clear();room.questionStartedAt=Date.now();room.revealStartedAt=null;return json(res,200,{ok:true})";
if(!code.includes(replayFrom))throw new Error('Replay reset patch target not found');
code=code.replace(replayFrom,replayTo);

const runtime=new Module(path.join(__dirname,'bootstrap-runtime.js'),module);
runtime.filename=path.join(__dirname,'bootstrap-runtime.js');
runtime.paths=module.paths;
runtime._compile(code,runtime.filename);
