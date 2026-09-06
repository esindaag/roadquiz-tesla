const fs=require('fs'),path=require('path'),Module=require('module');
let code=fs.readFileSync(path.join(__dirname,'server.js'),'utf8');
const target=`const questionBank=buildBank();\nfunction pickGameQuestions(){return questionBank.map(pool=>pool[Math.floor(Math.random()*pool.length)])}`;
const engine=`const questionBank=buildBank();
const recentQuestionTexts=[];
const generalFacts=[
['Genel Kültür','Dünyanın en büyük okyanusu hangisidir?','Pasifik Okyanusu',['Atlas Okyanusu','Hint Okyanusu','Arktik Okyanusu']],
['Genel Kültür','Olimpiyat halkaları kaç tanedir?','5',['4','6','7']],
['Genel Kültür','Satrançta her oyuncu oyuna kaç taşla başlar?','16',['12','14','18']],
['Genel Kültür','Bir yılda kaç mevsim vardır?','4',['3','5','6']],
['Genel Kültür','Mona Lisa tablosunun ressamı kimdir?','Leonardo da Vinci',['Michelangelo','Raphael','Vincent van Gogh']],
['Genel Kültür','Eyfel Kulesi hangi şehirdedir?','Paris',['Roma','Londra','Brüksel']],
['Genel Kültür','Pizza ile özdeşleşen ülke hangisidir?','İtalya',['İspanya','Portekiz','Yunanistan']],
['Genel Kültür','Japonya’nın para birimi hangisidir?','Yen',['Won','Yuan','Baht']],
['Genel Kültür','Dünyada en yaygın ana dil olarak konuşulan dil hangisidir?','Mandarin Çincesi',['İngilizce','İspanyolca','Arapça']],
['Genel Kültür','FIFA Dünya Kupası hangi spor dalında düzenlenir?','Futbol',['Basketbol','Tenis','Voleybol']],
['Genel Kültür','Bir düzinede kaç adet vardır?','12',['10','20','24']],
['Genel Kültür','Big Ben hangi şehirdedir?','Londra',['Dublin','Edinburgh','Manchester']],
['Genel Kültür','Hollywood hangi şehirle özdeşleşmiştir?','Los Angeles',['New York','Chicago','Miami']],
['Genel Kültür','Sushi hangi ülkenin mutfağıyla özdeşleşmiştir?','Japonya',['Çin','Tayland','Güney Kore']],
['Genel Kültür','Bir maratonda koşulan resmi mesafe yaklaşık kaç kilometredir?','42,2',['21,1','35','50']],
['Genel Kültür','Oscar ödülleri ağırlıklı olarak hangi alanla ilgilidir?','Sinema',['Edebiyat','Mimarlık','Bilim']],
['Genel Kültür','Pusulada N harfi hangi yönü gösterir?','Kuzey',['Güney','Doğu','Batı']],
['Genel Kültür','Bir olimpik yüzme havuzunun uzunluğu kaç metredir?','50',['25','40','100']],
['Genel Kültür','İnsanların kullandığı Braille alfabesi öncelikle hangi duyuya dayanır?','Dokunma',['Görme','İşitme','Koku']],
['Genel Kültür','Dünya üzerindeki en büyük kıta hangisidir?','Asya',['Afrika','Avrupa','Kuzey Amerika']],
['Genel Kültür','Grammy ödülleri ağırlıklı olarak hangi alanla ilgilidir?','Müzik',['Sinema','Tiyatro','Mimarlık']],
['Genel Kültür','Teniste 40-40 eşitliğine ne ad verilir?','Deuce',['Tie-break','Love','Ace']],
['Genel Kültür','Türkiye’nin uluslararası telefon ülke kodu hangisidir?','+90',['+39','+49','+44']],
['Genel Kültür','Bir haftada kaç saat vardır?','168',['144','160','180']]
];
const geoExtras=[
['Coğrafya','Dünyanın en uzun nehri olarak genellikle hangisi kabul edilir?','Nil',['Ren','Tuna','Volga']],
['Coğrafya','Sahra Çölü hangi kıtadadır?','Afrika',['Asya','Güney Amerika','Avustralya']],
['Coğrafya','Everest Dağı hangi sıradağlardadır?','Himalayalar',['Alpler','Andlar','Kayalık Dağları']],
['Coğrafya','Akdeniz ile Atlas Okyanusu’nu bağlayan boğaz hangisidir?','Cebelitarık Boğazı',['Bering Boğazı','Hürmüz Boğazı','Malakka Boğazı']],
['Coğrafya','Dünyanın yüzölçümü en büyük ülkesi hangisidir?','Rusya',['Kanada','Çin','ABD']],
['Coğrafya','Amazon Ormanları en büyük ölçüde hangi ülkededir?','Brezilya',['Peru','Kolombiya','Bolivya']],
['Coğrafya','Alpler ağırlıklı olarak hangi kıtadadır?','Avrupa',['Asya','Afrika','Kuzey Amerika']],
['Coğrafya','Türkiye’nin en büyük gölü hangisidir?','Van Gölü',['Tuz Gölü','Beyşehir Gölü','Eğirdir Gölü']],
['Coğrafya','İstanbul Boğazı hangi iki denizi bağlar?','Karadeniz ve Marmara Denizi',['Ege ve Akdeniz','Marmara ve Ege','Karadeniz ve Ege']],
['Coğrafya','Kızıldeniz hangi iki kıta arasında yer alır?','Afrika ve Asya',['Avrupa ve Afrika','Asya ve Avrupa','Amerika ve Asya']],
['Coğrafya','And Dağları hangi kıtadadır?','Güney Amerika',['Kuzey Amerika','Avrupa','Afrika']],
['Coğrafya','Bering Boğazı hangi iki kıtayı ayırır?','Asya ve Kuzey Amerika',['Avrupa ve Afrika','Asya ve Avrupa','Afrika ve Asya']],
['Coğrafya','Tuna Nehri hangi denize dökülür?','Karadeniz',['Akdeniz','Baltık Denizi','Kuzey Denizi']],
['Coğrafya','İzlanda hangi okyanusta yer alır?','Atlas Okyanusu',['Pasifik Okyanusu','Hint Okyanusu','Güney Okyanusu']],
['Coğrafya','Dünyanın en büyük adası hangisidir?','Grönland',['Madagaskar','Borneo','Yeni Gine']],
['Coğrafya','Kapadokya hangi bölgemizdedir?','İç Anadolu',['Ege','Akdeniz','Karadeniz']],
['Coğrafya','Pamukkale hangi ilimizdedir?','Denizli',['Muğla','Antalya','Aydın']],
['Coğrafya','Ağrı Dağı hangi bölgemizdedir?','Doğu Anadolu',['İç Anadolu','Karadeniz','Güneydoğu Anadolu']],
['Coğrafya','Ekvator hangi iki yarım küreyi ayırır?','Kuzey ve Güney',['Doğu ve Batı','Kuzey ve Doğu','Güney ve Batı']],
['Coğrafya','Dünyanın en derin okyanus çukuru hangisidir?','Mariana Çukuru',['Tonga Çukuru','Java Çukuru','Porto Riko Çukuru']]
];
const cultureExtras=[
['Kültür & Sanat','Guernica tablosunun ressamı kimdir?','Pablo Picasso',['Salvador Dali','Claude Monet','Edvard Munch']],
['Kültür & Sanat','Yıldızlı Gece tablosunun ressamı kimdir?','Vincent van Gogh',['Paul Cezanne','Claude Monet','Henri Matisse']],
['Kültür & Sanat','Dört Mevsim eserinin bestecisi kimdir?','Antonio Vivaldi',['Mozart','Beethoven','Bach']],
['Kültür & Sanat','Kuğu Gölü balesinin bestecisi kimdir?','Çaykovski',['Chopin','Ravel','Verdi']],
['Kültür & Sanat','Sistine Şapeli tavan freskleriyle tanınan sanatçı kimdir?','Michelangelo',['Raphael','Donatello','Caravaggio']],
['Kültür & Sanat','Salvador Dali en çok hangi sanat akımıyla ilişkilidir?','Sürrealizm',['Empresyonizm','Kübizm','Barok']],
['Kültür & Sanat','Claude Monet en çok hangi sanat akımıyla ilişkilidir?','Empresyonizm',['Sürrealizm','Fütürizm','Gotik']],
['Kültür & Sanat','Bolero adlı ünlü orkestral eserin bestecisi kimdir?','Maurice Ravel',['Debussy','Bizet','Berlioz']],
['Kültür & Sanat','La Traviata operasının bestecisi kimdir?','Giuseppe Verdi',['Puccini','Rossini','Wagner']],
['Kültür & Sanat','Carmen operasının bestecisi kimdir?','Georges Bizet',['Verdi','Mozart','Puccini']],
['Kültür & Sanat','Heykel sanatında Pietà eseri kime aittir?','Michelangelo',['Rodin','Bernini','Donatello']],
['Kültür & Sanat','The Beatles hangi şehirde kurulmuştur?','Liverpool',['Londra','Manchester','Birmingham']],
['Kültür & Sanat','Abbey Road albümü hangi gruba aittir?','The Beatles',['Queen','Pink Floyd','The Rolling Stones']],
['Kültür & Sanat','Bohemian Rhapsody hangi gruba aittir?','Queen',['ABBA','U2','Coldplay']],
['Kültür & Sanat','Titanic filminin yönetmeni kimdir?','James Cameron',['Steven Spielberg','Ridley Scott','Christopher Nolan']],
['Kültür & Sanat','Inception filminin yönetmeni kimdir?','Christopher Nolan',['David Fincher','Denis Villeneuve','James Cameron']],
['Kültür & Sanat','Spirited Away filminin yönetmeni kimdir?','Hayao Miyazaki',['Akira Kurosawa','Makoto Shinkai','Satoshi Kon']],
['Kültür & Sanat','Ayasofya günümüzde hangi şehirdedir?','İstanbul',['Roma','Atina','Sofya']],
['Kültür & Sanat','Sagrada Familia hangi mimarla özdeşleşmiştir?','Antoni Gaudí',['Le Corbusier','Frank Lloyd Wright','Norman Foster']],
['Kültür & Sanat','Moulin Rouge hangi şehirle özdeşleşmiştir?','Paris',['Viyana','Madrid','Prag']]
];
function extraObjects(facts){return facts.map((f,i)=>{const q=qObj(f[0],f[1],f[2],f[3]);q.id='EX-'+f[0]+'-'+i;return q})}
const extraByCategory={'Genel Kültür':extraObjects(generalFacts),'Coğrafya':extraObjects(geoExtras),'Kültür & Sanat':extraObjects(cultureExtras)};
function questionFamily(q){const t=q.q.toLocaleLowerCase('tr-TR');if(/postgresql|\bsql\b|veritaban/.test(t))return'database';if(/kimyasal sembol|element/.test(t))return'element-symbol';if(/başkenti|başkentidir/.test(t))return'capital';return q.cat+'|'+t.replace(/[^a-z0-9çğıöşü ]/gi,'').split(/\s+/).slice(0,4).join('-')}
function balancedCategories(){const a=['Coğrafya','Coğrafya','Coğrafya','Tarih','Tarih','Tarih','Bilim','Bilim','Bilim','Kültür & Sanat','Kültür & Sanat','Kültür & Sanat','Edebiyat','Edebiyat','Teknoloji','Teknoloji','Matematik','Matematik','Genel Kültür','Genel Kültür'];shuffle(a);for(let pass=0;pass<8;pass++){for(let i=1;i<a.length;i++){if(a[i]===a[i-1]){const j=a.findIndex((x,k)=>k>i&&x!==a[i]&&x!==a[i-1]&&(k===a.length-1||a[k+1]!==a[i]));if(j>i)[a[i],a[j]]=[a[j],a[i]]}}}return a}
function pickGameQuestions(){const cats=balancedCategories(),picked=[],usedText=new Set(),usedFamilies=new Set(),recent=new Set(recentQuestionTexts);for(let level=0;level<20;level++){const cat=cats[level];let pool=questionBank[level].filter(q=>q.cat===cat);if(extraByCategory[cat])pool=pool.concat(extraByCategory[cat]);if(cat==='Kültür & Sanat')pool=extraByCategory[cat].slice();let candidates=pool.filter(q=>!usedText.has(q.q)&&!recent.has(q.q));if(cat==='Teknoloji')candidates=candidates.filter(q=>!(questionFamily(q)==='database'&&usedFamilies.has('database')));if(cat==='Coğrafya'){const nonRepeatType=candidates.filter(q=>!(questionFamily(q)==='capital'&&usedFamilies.has('capital')));if(nonRepeatType.length)candidates=nonRepeatType}if(!candidates.length)candidates=pool.filter(q=>!usedText.has(q.q));if(!candidates.length)candidates=pool;const q=candidates[Math.floor(Math.random()*candidates.length)];picked.push(q);usedText.add(q.q);usedFamilies.add(questionFamily(q))}recentQuestionTexts.push(...picked.map(q=>q.q));if(recentQuestionTexts.length>40)recentQuestionTexts.splice(0,recentQuestionTexts.length-40);return picked}`;
if(!code.includes(target))throw new Error('Question engine patch target not found');
code=code.replace(target,engine);
const runtime=new Module(path.join(__dirname,'server-runtime.js'),module);
runtime.filename=path.join(__dirname,'server-runtime.js');runtime.paths=module.paths;
runtime._compile(code,runtime.filename);
