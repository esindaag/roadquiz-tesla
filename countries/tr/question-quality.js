const CATEGORY_TARGETS={
  'Coğrafya':150,
  'Tarih':160,
  'Bilim':150,
  'Kültür & Sanat':150,
  'Genel Kültür':140,
  'Teknoloji':100,
  'Spor':70,
  'Matematik':80
};

const LEVEL_BANDS=[
  {from:1,to:5,label:'KOLAY'},
  {from:6,to:10,label:'ORTA'},
  {from:11,to:14,label:'ZOR'},
  {from:15,to:17,label:'ÇOK ZOR'},
  {from:18,to:19,label:'UZMAN'},
  {from:20,to:20,label:'1.000.000'}
];

const BLOCKED_PATTERNS=[
  /dünyanın en uzun nehri/i,
  /çanakkale savaşları ağırlıklı olarak/i
];

function normalizeText(value=''){
  return String(value).trim().toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');
}

function isBlockedQuestion(question){
  return BLOCKED_PATTERNS.some(pattern=>pattern.test(question.q||''));
}

function validateQuestion(question){
  const errors=[];
  if(!question||typeof question!=='object')return ['invalid_question'];
  if(!question.id)errors.push('missing_id');
  if(!question.q)errors.push('missing_text');
  if(!question.cat)errors.push('missing_category');
  if(!Number.isInteger(question.level)||question.level<1||question.level>20)errors.push('invalid_level');
  if(!Array.isArray(question.options)||question.options.length!==4)errors.push('invalid_options');
  if(!Number.isInteger(question.answer)||question.answer<0||question.answer>3)errors.push('invalid_answer');
  if(Array.isArray(question.options)&&new Set(question.options.map(normalizeText)).size!==question.options.length)errors.push('duplicate_options');
  if(isBlockedQuestion(question))errors.push('blocked_ambiguous_question');
  return errors;
}

function auditQuestions(questions=[]){
  const textCounts=new Map(),idCounts=new Map(),categoryCounts={},levelCounts={};
  const invalid=[];
  for(const q of questions){
    const text=normalizeText(q.q),id=String(q.id||'');
    textCounts.set(text,(textCounts.get(text)||0)+1);
    idCounts.set(id,(idCounts.get(id)||0)+1);
    categoryCounts[q.cat]=(categoryCounts[q.cat]||0)+1;
    levelCounts[q.level]=(levelCounts[q.level]||0)+1;
    const errors=validateQuestion(q);
    if(errors.length)invalid.push({id:q.id,q:q.q,errors});
  }
  return {
    total:questions.length,
    uniqueTexts:textCounts.size,
    duplicateTexts:[...textCounts].filter(([,count])=>count>1),
    duplicateIds:[...idCounts].filter(([,count])=>count>1),
    categoryCounts,
    levelCounts,
    invalid,
    categoryTargets:CATEGORY_TARGETS,
    levelBands:LEVEL_BANDS
  };
}

module.exports={CATEGORY_TARGETS,LEVEL_BANDS,BLOCKED_PATTERNS,normalizeText,isBlockedQuestion,validateQuestion,auditQuestions};
