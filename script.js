/*
  script.js - datasets generator, local Users, UI logic for vocab & fill, dashboard.
  - Local accounts (Users)
  - Datasets generated in-browser and saved to localStorage
  - Vocab: 6s per question, 2s review, Bangla translation if available
  - Fill: 30s per question, hint button, gap style (swi....)
  - Season mode: 20 questions, 5 points per correct
  - Achievements + history saved on user profile
*/

// ----------------- Users (localStorage) -----------------
const Users = (function(){
  const KEY = 'det_users_v1';
  const SESS = 'det_usersess_v1';
  function loadAll(){ try{ return JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ return {}; } }
  function saveAll(u){ localStorage.setItem(KEY, JSON.stringify(u)); }
  function hash(p){ let h=0; for(let i=0;i<p.length;i++){ h=(h<<5)-h + p.charCodeAt(i); h |= 0; } return String(h); }
  return {
    signup(username,password,meta){
      if(!username||!password) return {ok:false,error:'username & password required'};
      const all = loadAll();
      if(all[username]) return {ok:false,error:'username taken'};
      all[username] = { username, passwordHash: hash(password), displayName: meta.displayName||username, xp:0, level:1, streak:0, totalPoints:0, achievements:[], history:[] };
      saveAll(all);
      localStorage.setItem(SESS, username);
      return {ok:true};
    },
    login(username,password){
      const all = loadAll();
      const u = all[username];
      if(!u) return {ok:false,error:'no such user'};
      if(u.passwordHash !== hash(password)) return {ok:false,error:'wrong password'};
      localStorage.setItem(SESS, username);
      return {ok:true};
    },
    currentUser(){
      const un = localStorage.getItem(SESS);
      if(!un) return null;
      const all = loadAll();
      return all[un] || null;
    },
    logout(){ localStorage.removeItem(SESS); },
    saveProfile(profile){ const all = loadAll(); if(!profile||!profile.username) return; all[profile.username] = profile; saveAll(all); },
    clearProfile(){ const me = this.currentUser(); if(!me) return; const all = loadAll(); all[me.username].xp = 0; all[me.username].level = 1; all[me.username].streak = 0; all[me.username].totalPoints = 0; all[me.username].achievements = []; all[me.username].history = []; saveAll(all); }
  };
})();

// ----------------- Dataset generator -----------------
const app = (function(){
  const VOCAB_COUNT = 5000;
  const BLANKS_COUNT = 3000;
  const LS_VOCAB = 'det_vocab_v3';
  const LS_BLANKS = 'det_blanks_v3';
  const seedCommon = ['about','accept','action','add','address','admit','adult','after','again','against','age','agree','air','all','allow','almost','also','always','among','amount','analysis','animal','answer','any','appear','apply','approach','area','argue','around','arrive','article','artist','ask','assume','attention','author','available','avoid','away','back','bad','ball','bank','base','be','beat','beautiful','because','become','bed','before','begin','believe','benefit','best','better','between','big','bill','bit','black','blue','board','body','book'];
  const seedAdvanced = ['abstract','accurate','acquisition','adequate','advocate','allocate','anticipate','aspect','assess','assure','coherent','criterion','derive','discretion','emerge','empirical','enforce','ethics','fluctuate','hierarchy','implementation','incentive','integrate','legitimate','manipulate','magnitude','methodology','paradigm','rationale','robust','substantiate','validate'];
  const syll = ['ba','be','bi','bo','bu','ca','ce','ci','co','cu','da','de','di','do','du','fa','fe','fi','fo','fu','la','le','li','lo','lu','ma','me','mi','mo','mu','na','ne','ni','no','nu','ra','re','ri','ro','ru','sa','se','si','so','su','ta','te','ti','to','tu','ya','ye','yo'];

  function rand(n){ return Math.floor(Math.random()*n); }
  function sample(arr){ return arr[rand(arr.length)]; }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr; }

  function makeFake(existing){
    if(Math.random() < 0.6){
      const len = 2 + rand(2);
      let w = '';
      for(let i=0;i<len;i++) w += sample(syll);
      if(Math.random() < 0.06) w += String.fromCharCode(97+rand(26));
      if(existing.has(w)) return makeFake(existing);
      return w;
    } else {
      const base = sample(seedCommon);
      let n = base.split('').map((ch,i)=> (Math.random()<0.15? (i%2? ch.toUpperCase() : ch): ch)).join('');
      n = n.replace(/[aeiou]{2,}/,'a');
      n = n + (Math.random()<0.2? String.fromCharCode(97+rand(26)): '');
      if(existing.has(n)) return makeFake(existing);
      return n;
    }
  }

  function makeReal(existing){
    if(Math.random() < 0.08){
      const w = sample(seedAdvanced);
      if(existing.has(w)) return makeReal(existing);
      return w;
    }
    if(Math.random() < 0.12){
      const a = sample(seedCommon), b = sample(seedCommon);
      const w = (a.length > b.length ? a.slice(0,Math.ceil(a.length*0.6)) + b.slice(Math.floor(b.length*0.4)) : b.slice(0,Math.ceil(b.length*0.6))+a.slice(Math.floor(a.length*0.4)));
      if(existing.has(w)) return makeReal(existing);
      return w;
    }
    let base = sample(seedCommon);
    if(Math.random() < 0.12) base += 's';
    if(Math.random() < 0.06) base = base + 'er';
    if(existing.has(base)) return makeReal(existing);
    return base;
  }

  function generateVocab(){
    const out = [], set = new Set(), half = Math.floor(VOCAB_COUNT/2);
    while(out.filter(x=>x.isReal).length < half){
      const w = makeReal(set); set.add(w); out.push({word:w,isReal:true,note:(Math.random()<0.25?'common':'less common')});
      if(set.size > VOCAB_COUNT*2) break;
    }
    while(out.length < VOCAB_COUNT){ const w = makeFake(set); set.add(w); out.push({word:w,isReal:false}); }
    return shuffle(out);
  }

  function generateBlanks(){
    const templates = [
      'The athletes arrived at the Olympic-sized swi_____ pool early to test the water and warm up their muscles.',
      'They planned to estab_____ a small lab for experiments next month.',
      'It was a very thor_____ decision to review all the data before publishing.',
      'The scientist had to analy_____ the results carefully to avoid mistakes.',
      'She has been working on the project for almost two years and aims to comple_____ it soon.',
      'Her explanation was clear and easy to under_____ by newcomers.',
      'The company will imple_____ the new policy next quarter.',
      'This method is known to produc_____ better results across the board.',
      'We need to verif_____ the information before releasing the report.',
      'The students must subm_____ the assignment by Monday.'
    ];
    const easy = ['open','start','big','explain','for','simple','implement','produce','check','submit','ask','help','use','find','go','play','stop','look','talk','move'];
    const medium = ['decide','establish','increase','evaluate','require','provide','include','consider','achieve','recognize','investigate','replace','confirm','combine'];
    const hard = seedAdvanced.slice();
    const out = [];
    for(let i=0;i<BLANKS_COUNT;i++){
      const r = Math.random(); let pool = medium, diff = 'medium';
      if(r < 0.45){ pool = easy; diff='easy'; } else if(r > 0.85){ pool = hard; diff='hard'; }
      const word = sample(pool);
      const tmpl = sample(templates);
      out.push({sentence:tmpl, answer:word, difficulty:diff});
    }
    return out;
  }

  function save(v,b){ try{ localStorage.setItem(LS_VOCAB, JSON.stringify(v)); localStorage.setItem(LS_BLANKS, JSON.stringify(b)); }catch(e){ console.warn('save failed', e); } }
  function load(){ try{ const a = JSON.parse(localStorage.getItem(LS_VOCAB)||'null'); const b = JSON.parse(localStorage.getItem(LS_BLANKS)||'null'); if(Array.isArray(a) && Array.isArray(b)) return {vocab:a,blanks:b}; }catch(e){} return null; }

  return {
    ensureDatasetsReady: async function(){
      const existing = load();
      if(existing) return;
      // generate (may take a moment)
      const v = generateVocab();
      const b = generateBlanks();
      save(v,b);
      return;
    },
    getVocabArray: function(){ return JSON.parse(localStorage.getItem(LS_VOCAB)||'[]'); },
    getBlanksArray: function(){ return JSON.parse(localStorage.getItem(LS_BLANKS)||'[]'); },
    downloadDatasets: function(){ const v = this.getVocabArray(); const b = this.getBlanksArray(); [{name:'det_vocab_5000.json',data:v},{name:'det_blanks_3000.json',data:b}].forEach(item=>{ const blob=new Blob([JSON.stringify(item.data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=item.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }); },
    forceRegenerate: function(){ localStorage.removeItem(LS_VOCAB); localStorage.removeItem(LS_BLANKS); const v = generateVocab(); const b = generateBlanks(); save(v,b); }
  };
})();

// ----------------- Translator (small Bangla mapping) -----------------
const Translator = (function(){
  const map = { 'open':'খোলা', 'start':'শুরু', 'big':'বড়', 'explain':'ব্যাখ্যা করা', 'for':'জন্য', 'simple':'সহজ', 'implement':'বাস্তবায়ন','produce':'উৎপাদন','check':'পরীক্ষা','submit':'জমা','ask':'জিজ্ঞেস করা','help':'সাহায্য','use':'ব্যবহার','find':'খুঁজে পাওয়া','go':'যাওয়া','play':'খেলা','stop':'থাকা','look':'দেখা','talk':'কথা বলা','move':'হাঁটা','decide':'সিদ্ধান্ত নেওয়া','establish':'প্রতিষ্ঠা করা','increase':'বৃদ্ধি','evaluate':'মূল্যায়ন','require':'প্রয়োজন','provide':'প্রদান','include':'অন্তর্ভুক্ত করা','consider':'বিবেচনা করা' };
  return { t: function(word){ return map[word.toLowerCase()]||''; } };
})();

// ----------------- Sound (WebAudio) -----------------
const Sound = (function(){
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  function playTone(freq, duration=0.12, type='sine', gain=0.06){
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.stop(ctx.currentTime + duration + 0.02);
  }
  return {
    success: ()=> { playTone(880,0.12,'sine',0.08); setTimeout(()=>playTone(1320,0.08,'sine',0.05),90); },
    error: ()=> { playTone(220,0.22,'sawtooth',0.12); },
    tick: ()=> playTone(600,0.06,'square',0.03)
  };
})();

// ----------------- Achievements helper -----------------
function awardAchievement(user, name){
  if(!user) return;
  user.achievements = user.achievements||[];
  if(!user.achievements.includes(name)){ user.achievements.push(name); Users.saveProfile(user); }
}

// ----------------- Vocab UI -----------------
const VocabUI = (function(){
  let words = [], order = [], idx = 0, season = 1, points = 0, perSeason = 20, timer = null, timeLeft = 6;
  const POINTS_PER = 5;

  function init(){
    const me = Users.currentUser();
    words = app.getVocabArray();
    if(words.length === 0){ alert('Dataset not ready'); return; }
    order = app.shuffle(Array.from(Array(words.length).keys()));
    idx = 0; season = 1; points = 0;
    document.getElementById('seasonNo').textContent = season;
    document.getElementById('points').textContent = points;
    bind();
    nextQuestion();
  }

  function bind(){
    document.getElementById('realBtn').onclick = ()=> submit(true);
    document.getElementById('fakeBtn').onclick = ()=> submit(false);
    document.getElementById('endSeason').onclick = ()=> endSeason();
  }

  function renderItem(item){
    document.getElementById('wordBox').textContent = item.word;
    const trans = item.isReal ? Translator.t(item.word) : '';
    document.getElementById('translation').textContent = trans ? ('বাংলা: ' + trans) : '';
    document.getElementById('result').textContent = '';
    document.getElementById('qIndex').textContent = (idx%perSeason)+1;
  }

  function startTimer(seconds){
    clearInterval(timer);
    timeLeft = seconds;
    updateTimer();
    timer = setInterval(()=>{
      timeLeft -= 0.1;
      if(timeLeft <= 0){ clearInterval(timer); timeout(); }
      updateTimer();
    },100);
  }

  function updateTimer(){
    const percent = Math.max(0, (timeLeft/6)) * 100;
    document.getElementById('timerLabel').textContent = String(Math.ceil(timeLeft));
    document.getElementById('timerProgress').style.width = percent + '%';
  }

  function nextQuestion(){
    if((idx%perSeason) >= perSeason && idx>0){ showSeasonEnd(); return; }
    const id = order[idx];
    const item = words[id];
    renderItem(item);
    startTimer(6);
  }

  function submit(isReal){
    clearInterval(timer);
    const id = order[idx];
    const item = words[id];
    const ok = (item.isReal === isReal);
    if(ok){ points += POINTS_PER; Sound.success(); document.getElementById('result').textContent = 'Correct ✓'; }
    else { Sound.error(); document.getElementById('result').textContent = 'Wrong ✕ — ' + (item.isReal? 'Real' : 'Fake'); }
    document.getElementById('points').textContent = points;

    // save history/profile
    const me = Users.currentUser();
    if(me){
      me.totalPoints = (me.totalPoints||0) + (ok?POINTS_PER:0);
      me.xp = (me.xp||0) + (ok?10:2);
      me.history = me.history||[];
      me.history.push({mode:'vocab', date: new Date().toLocaleString(), score: ok?POINTS_PER:0, correct: ok?1:0, total:1});
      if(me.history.length>200) me.history.shift();
      Users.saveProfile(me);
      if(ok) awardAchievement(me,'First Correct');
    }

    idx++;
    // wait 2 seconds for review
    setTimeout(()=>{
      if((idx%perSeason) >= perSeason && idx>0){ showSeasonEnd(); return; }
      nextQuestion();
    },2000);
  }

  function timeout(){
    Sound.error();
    document.getElementById('result').textContent = 'Time up — skipped';
    idx++;
    setTimeout(()=> nextQuestion(), 700);
  }

  function showSeasonEnd(){
    const me = Users.currentUser();
    if(me){
      me.history = me.history||[];
      me.history.push({mode:'vocab-season', date: new Date().toLocaleString(), score: points, correct:'n/a', total: perSeason});
      Users.saveProfile(me);
    }
    const msg = `Season complete — Points: ${points}`;
    if(confirm(msg + '\nStart new season?')){ init(); } else {
      document.getElementById('wordBox').textContent = 'Season finished';
      document.getElementById('result').textContent = msg;
    }
  }

  function endSeason(){ if(confirm('End season now?')) showSeasonEnd(); }

  return { init };
})();

// ----------------- Fill UI -----------------
const FillUI = (function(){
  let blanks = [], order = [], idx = 0, season = 1, points = 0, perSeason = 20, timer = null, timeLeft = 30, hintUsed = false;
  const POINTS_PER = 5;

  function init(){
    blanks = app.getBlanksArray();
    if(blanks.length === 0){ alert('Dataset not ready'); return; }
    order = app.shuffle(Array.from(Array(blanks.length).keys()));
    idx = 0; season = 1; points = 0; hintUsed = false;
    document.getElementById('seasonNo').textContent = season;
    document.getElementById('points').textContent = points;
    bind();
    nextQuestion();
  }

  function bind(){
    document.getElementById('submitBtn').onclick = ()=> submit();
    document.getElementById('nextBtn').onclick = ()=> skip();
    document.getElementById('hintBtn').onclick = ()=> useHint();
    document.getElementById('answerInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') submit(); });
    document.getElementById('endSeason').onclick = ()=> endSeason();
  }

  function makeGap(word){
    if(!word || word.length <= 3) return word.split('')[0] + '...';
    const first = word.slice(0,3);
    return first + '....';
  }

  function renderItem(item){
    const ans = item.answer;
    const gap = makeGap(ans);
    const s = item.sentence.replace('_____', '<span class="blank">'+gap+'</span>').replace(/swi_____/, '<span class="blank">'+gap+'</span>');
    document.getElementById('sentenceBox').innerHTML = s;
    document.getElementById('fbResult').textContent = '';
    document.getElementById('answerInput').value = '';
    document.getElementById('answerInput').focus();
    document.getElementById('qIndex').textContent = (idx%perSeason)+1;
  }

  function startTimer(seconds){
    clearInterval(timer);
    timeLeft = seconds;
    updateTimer();
    timer = setInterval(()=>{
      timeLeft -= 0.2;
      if(timeLeft <= 0){ clearInterval(timer); timeout(); }
      updateTimer();
    },200);
  }

  function updateTimer(){
    const percent = Math.max(0, (timeLeft/30)) * 100;
    document.getElementById('timerLabel').textContent = String(Math.ceil(timeLeft));
    document.getElementById('timerProgress').style.width = percent + '%';
  }

  function nextQuestion(){
    if((idx%perSeason) >= perSeason && idx>0){ showSeasonEnd(); return; }
    const id = order[idx];
    const item = blanks[id];
    renderItem(item);
    startTimer(30);
  }

  function submit(){
    clearInterval(timer);
    const id = order[idx];
    const item = blanks[id];
    const cs = document.getElementById('caseSensitive') && document.getElementById('caseSensitive').checked;
    const user = cs ? document.getElementById('answerInput').value.trim() : document.getElementById('answerInput').value.trim().toLowerCase();
    const answer = cs ? item.answer : item.answer.toLowerCase();
    const ok = user === answer;
    if(ok){ points += POINTS_PER; Sound.success(); document.getElementById('fbResult').textContent = 'Correct ✓'; }
    else { Sound.error(); document.getElementById('fbResult').textContent = 'Wrong ✕ — Answer: ' + item.answer; }
    document.getElementById('points').textContent = points;

    const me = Users.currentUser();
    if(me){
      me.totalPoints = (me.totalPoints||0) + (ok?POINTS_PER:0);
      me.xp = (me.xp||0) + (ok?15:5);
      me.history = me.history||[];
      me.history.push({mode:'fill', date: new Date().toLocaleString(), score: ok?POINTS_PER:0, correct: ok?1:0, total:1});
      if(me.history.length>200) me.history.shift();
      Users.saveProfile(me);
      if(ok) awardAchievement(me,'Nice Fill');
    }

    idx++;
    setTimeout(()=>{ if((idx%perSeason) >= perSeason && idx>0){ showSeasonEnd(); return; } nextQuestion(); },900);
  }

  function skip(){
    clearInterval(timer);
    Sound.error();
    const id = order[idx];
    const item = blanks[id];
    document.getElementById('fbResult').textContent = 'Skipped — Answer: ' + item.answer;
    idx++;
    setTimeout(()=> nextQuestion(),700);
  }

  function useHint(){
    if(hintUsed){ alert('Hint already used this season'); return; }
    hintUsed = true;
    const id = order[idx];
    const item = blanks[id];
    const hint = item.answer.charAt(0) + '...' ;
    document.getElementById('fbResult').textContent = 'Hint: ' + hint;
  }

  function timeout(){
    Sound.error();
    document.getElementById('fbResult').textContent = 'Time up — skipped';
    idx++;
    setTimeout(()=> nextQuestion(),700);
  }

  function showSeasonEnd(){
    const me = Users.currentUser();
    if(me){
      me.history = me.history||[];
      me.history.push({mode:'fill-season', date: new Date().toLocaleString(), score: points, correct:'n/a', total: perSeason});
      Users.saveProfile(me);
    }
    const msg = `Season complete — Points: ${points}`;
    if(confirm(msg + '\nStart new season?')){ init(); } else {
      document.getElementById('sentenceBox').textContent = 'Season finished';
      document.getElementById('fbResult').textContent = msg;
    }
  }

  function endSeason(){ if(confirm('End season now?')) showSeasonEnd(); }

  return { init };
})();

// ----------------- UI small helpers -----------------
window.addEventListener('load', ()=>{
  const me = Users.currentUser();
  const ub = document.querySelector('.user-block');
  if(ub){ if(me){ ub.innerHTML = `<a class="btn link" href="dashboard.html">${me.displayName}</a> <button class="btn link" onclick="Users.logout(); location.reload();">Logout</button>`; } }
});

// expose to pages
window.app = app; window.Users = Users; window.VocabUI = VocabUI; window.FillUI = FillUI;
