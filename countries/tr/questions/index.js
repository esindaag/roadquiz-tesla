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

const questions=[];
for(const [cat,prefix,files] of defs){
 const raws=files.flatMap(name=>require(`./${name}`));
 raws.forEach((raw,i)=>{
   const options=shuffled([String(raw.correct),...raw.wrong.map(String)]);
   questions.push({
     id:`TR-${prefix}-${String(i+1).padStart(4,'0')}`,
     level:Number(raw.level),cat,q:String(raw.q),options,
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

module.exports={questions,audit,byLevel};
