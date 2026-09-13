const out=[];
for(let i=0;i<20;i++){const a=18+i*3,b=7+(i%9),c=a+b;out.push({level:6+Math.floor(i/2),q:`${a} + ${b} işleminin sonucu kaçtır?`,correct:String(c),wrong:[String(c+1),String(c-1),String(c+3)]});}
for(let i=0;i<20;i++){const base=40+i*5,p=[10,20,25,40,50][i%5],c=base*p/100;out.push({level:9+Math.floor(i/2),q:`${base} için yüzde ${p} hesabının sonucu kaçtır?`,correct:String(c),wrong:[String(c+5),String(c-5),String(base-p)]});}
for(let i=0;i<20;i++){const a=12+i,c=a*a;out.push({level:11+Math.floor(i/2),q:`${a} sayısının karesi kaçtır?`,correct:String(c),wrong:[String(c+a),String(c-a),String(c+2*a)]});}
module.exports=out;