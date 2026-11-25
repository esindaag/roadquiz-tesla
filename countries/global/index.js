'use strict';
const seed=require('./questions.seed.json');
const labels={GEO:['Geography','Geografía','Geografie'],HIS:['History','Historia','Geschichte'],SCI:['Science','Ciencia','Wissenschaft'],CUL:['Arts & Culture','Arte y cultura','Kunst & Kultur'],GEN:['General Knowledge','Cultura general','Allgemeinwissen'],TEC:['Technology','Tecnología','Technologie'],SPO:['Sports','Deportes','Sport'],MAT:['Mathematics','Matemáticas','Mathematik']};
const languages=['en','es','de'];
function validate(rows){
 const ids=new Set(),texts=Object.fromEntries(languages.map(l=>[l,new Set()]));
 for(const r of rows){
  if(ids.has(r.id)||!labels[r.category]||!Number.isInteger(r.level)||r.level<1||r.level>20||!Number.isInteger(r.answer)||r.answer<0||r.answer>3)throw Error('Invalid question: '+r.id);
  ids.add(r.id);
  for(const l of languages){
   const t=r.translations[l];
   if(!t||!t.q.trim()||t.options.length!==4||t.options.some(x=>!x.trim())||new Set(t.options.map(x=>x.trim().toLowerCase())).size!==4||texts[l].has(t.q.trim().toLowerCase()))throw Error('Invalid translation: '+r.id+' '+l);
   texts[l].add(t.q.trim().toLowerCase());
  }
 }
}
validate(seed);
function byLevel(language){
 const li=languages.indexOf(language);if(li<0)throw Error('unsupported_language');
 const bank=Array.from({length:20},()=>[]);
 for(const r of seed){
  const t=r.translations[language],order=[0,1,2,3];
  for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
  bank[r.level-1].push({id:r.id,level:r.level,cat:labels[r.category][li],category:r.category,q:t.q,options:order.map(i=>t.options[i]),answer:order.indexOf(r.answer)});
 }
 return bank;
}
module.exports={languages,labels,byLevel,validate,count:seed.length};
