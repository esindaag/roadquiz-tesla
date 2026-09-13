const {auditQuestions,CATEGORY_TARGETS}=require('../question-quality');

const defs=[
 ['Tarih','HIS',['history-01','history-02','history-03','history-04']],
 ['Bilim','SCI',['science-01','science-02','science-03','science-04']],
 ['Coğrafya','GEO',['geography-01','geography-02','geography-03','geography-04','geography-05']],
 ['Kültür & Sanat','CUL',['culture-01','culture-02','culture-03','culture-04']],
 ['Genel Kültür','GEN',['general-01','general-02','general-03','general-04']],
 ['Teknoloji','TEC',['technology-01','technology-02','technology-03']],
 ['Spor','SPO',['sports-01','sports-02']],
 ['Matematik','MAT',['math-01','math-02']]
];

function shuffled(values){
 const a=[...values];
 for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
 return a;
}

const clamp=(n,min=1,max=20)=>Math.max(min,Math.min(max,Math.round(n)));
function hasAny(t,words){return words.some(w=>t.includes(w))}
function calibratedLevel(cat,raw){
 const t=`${raw.q} ${raw.correct}`.toLocaleLowerCase('tr-TR');
 let level=Number(raw.level)||1;

 // Template-generated questions previously became harder merely because they
 // appeared later in an array. Calibrate them by actual knowledge required.
 if(cat==='Coğrafya'&&/başkent/.test(t)){
   if(hasAny(t,['türkiye','fransa','italya','japonya','almanya','birleşik krallık','çin','yunanistan','abd','rusya'])) return 2;
   if(hasAny(t,['ispanya','portekiz','hollanda','belçika','avusturya','isviçre','kanada','avustralya','brezilya','hindistan','mısır','güney kore','azerbaycan','iran','ırak','suudi arabistan'])) return 4;
   if(hasAny(t,['norveç','isveç','finlandiya','danimarka','polonya','çekya','macaristan','romanya','bulgaristan','sırbistan','hırvatistan','irlanda','izlanda','meksika','arjantin','şili','peru','kolombiya','yeni zelanda','pakistan','fas','tayland','vietnam','singapur','katar','ürdün','gürcistan','ermenistan','cezayir','tunus'])) return 6;
   if(hasAny(t,['slovenya','slovakya','endonezya','malezya','filipinler','nepal','bangladeş','birleşik arap emirlikleri','etiyopya','gana','kenya'])) return 9;
   return clamp(level,4,11);
 }

 if(cat==='Genel Kültür'&&/para birimi/.test(t)){
   if(hasAny(t,['türk lirası','abd doları','sterlin','yen','yuan','euro'])) return 2;
   if(hasAny(t,['won','isviçre frangı','kanada doları','avustralya doları','ruble','hindistan rupisi'])) return 4;
   if(hasAny(t,['zlot','zloti','forint','grivna','rupi','koruna','lev','dinar','ley','ringgit','guarani'])) return 7;
   return clamp(level,4,10);
 }

 if(cat==='Bilim'&&/(kimyasal sembol|elementinin kimyasal sembolü)/.test(t)){
   if(hasAny(t,['hidrojen','oksijen','karbon','azot','demir','altın','gümüş','sodyum','kalsiyum',' h ',' o ',' c ',' n ','fe','au','ag','na','ca'])) return 4;
   if(hasAny(t,['helyum','lityum','flor','neon','magnezyum','alüminyum','silisyum','fosfor','kükürt','klor','potasyum','nikel','bakır','çinko'])) return 7;
   return clamp(level,9,15);
 }

 if(cat==='Matematik'){
   if(/\+/.test(t)&&/işleminin sonucu/.test(t)) return clamp(1+Math.floor((Number(raw.correct)||20)/30),2,4);
   if(/yüzde/.test(t)) return clamp(4+Math.floor(level/5),5,8);
   if(/karesi kaçtır/.test(t)) return clamp(5+Math.floor(level/4),6,10);
 }

 if(cat==='Tarih'&&/(hangi yılda|hangi yıl|yılıyla doğru eşleşen)/.test(t)){
   if(hasAny(t,['1071','1453','1923','1919','1920','1922','cumhuriyet','istanbul’un fethi','malazgirt'])) return 5;
   if(hasAny(t,['1402','1514','1526','1908','1911','1912','1913','tanzimat','ıslahat','meşrutiyet'])) return 8;
   if(hasAny(t,['miryokefalon','kösedağ','mercidabık','ridaniye','preveze','zitvatorok','karlofça','pasarofça','küçük kaynarca','sened-i ittifak'])) return 12;
   return clamp(level,6,14);
 }

 return clamp(level);
}

const questions=[];
for(const [cat,prefix,files] of defs){
 const raws=files.flatMap(name=>require(`./${name}`));
 raws.forEach((raw,i)=>{
   const options=shuffled([String(raw.correct),...raw.wrong.map(String)]);
   questions.push({
     id:`TR-${prefix}-${String(i+1).padStart(4,'0')}`,
     level:calibratedLevel(cat,raw),cat,q:String(raw.q),options,
     answer:options.indexOf(String(raw.correct))
   });
 });
}

const audit=auditQuestions(questions);
if(audit.total!==1000)throw new Error(`TR question count must be 1000, got ${audit.total}`);
if(audit.uniqueTexts!==1000)throw new Error(`TR questions must have 1000 unique texts, got ${audit.uniqueTexts}; duplicates=${JSON.stringify(audit.duplicateTexts)}`);
if(audit.duplicateIds.length)throw new Error(`TR duplicate question ids: ${JSON.stringify(audit.duplicateIds.slice(0,5))}`);
if(audit.invalid.length)throw new Error(`TR invalid questions: ${JSON.stringify(audit.invalid.slice(0,5))}`);
for(const [cat,target] of Object.entries(CATEGORY_TARGETS)){
 if(audit.categoryCounts[cat]!==target)throw new Error(`TR ${cat} target ${target}, got ${audit.categoryCounts[cat]||0}`);
}

function byLevel(){
 const bank=Array.from({length:20},()=>[]);
 for(const q of questions)bank[q.level-1].push(q);
 return bank;
}

module.exports={questions,audit,byLevel,calibratedLevel};
