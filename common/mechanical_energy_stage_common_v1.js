(() => {
  const GAS_URL = "https://script.google.com/a/macros/toyo.jp/s/AKfycbxKE8qHKfpyllw3LqmC1fKrDgdeUR2w2H7Q0l33YWFTY_krYKyqlWz3UueyOjQlr-D7GQ/exec?v=3";
  const CONFIG = window.MECHANICAL_STAGE_CONFIG || {};
  const BANKS = window.MECHANICAL_ENERGY_BANKS || {};
  const stageKey = CONFIG.stageKey || "stage1";
  const isWritten = !!CONFIG.written;
  const stageName = CONFIG.stageName || "力学的エネルギー/Stage";
  const total = Number(CONFIG.total || 10);
  const accent = CONFIG.accent || "#2563eb";
  window.TrainerLog = window.TrainerLog || {startSession(){},startQuestion(){},recordQuestion(){},finishSession(){},showElapsedInFinalMessage(){},sendResult(){}};

  const css = `
  :root{--bg:#f6f7fb;--card:#fff;--text:#1f2937;--muted:#6b7280;--accent:${accent};--accent-soft:#eff6ff;--ok:#16a34a;--ng:#dc2626;--line:#e5e7eb;--soft:#f8fafc}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;line-height:1.7}
  .wrap{max-width:860px;margin:0 auto;padding:22px 14px 46px}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 10px 28px rgba(0,0,0,.07)}
  h1{margin:0 0 6px;font-size:1.55rem}.lead{color:var(--muted);font-size:.96rem;margin-bottom:16px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--muted);font-size:.95rem;margin-top:12px}
  .bar{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:10px 0 20px}.bar>div{height:100%;width:0%;background:var(--accent);transition:width .25s ease}
  .question{font-size:1.18rem;font-weight:800;margin:18px 0;padding:16px;background:var(--soft);border-radius:14px;border:1px solid var(--line)}.choices{display:grid;gap:12px;margin:16px 0}
  .choice{width:100%;text-align:left;border:1px solid #cbd5e1;background:#fff;color:var(--text);border-radius:14px;padding:14px 16px;font-size:1.06rem;font-weight:700;cursor:pointer}.choice:hover{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 12%,transparent)}
  .choice.selected{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}.choice:disabled{cursor:default;opacity:1}.choice.correct{border-color:#86efac;background:#ecfdf5;color:#14532d}.choice.wrong{border-color:#fecaca;background:#fef2f2;color:#7f1d1d}
  .feedback{display:none;margin-top:18px;padding:16px;border-radius:14px}.feedback.ok{display:block;background:#ecfdf5;border:1px solid #bbf7d0;color:#14532d}.feedback.ng{display:block;background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d}
  .formula{margin-top:10px;padding:11px 12px;background:#fff;border:1px solid var(--line);border-radius:10px;font-size:1.05rem;overflow-x:auto}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.button-break{flex-basis:100%;height:0}
  button{border:0;border-radius:12px;padding:12px 16px;font-size:1rem;font-weight:800;cursor:pointer;background:var(--accent);color:#fff}button.secondary{background:#e5e7eb;color:#111827}button:disabled{opacity:.5;cursor:not-allowed}
  .result{text-align:center;padding:24px 8px}.scorebig{font-size:2.25rem;font-weight:900;margin:8px 0}.pass{color:var(--ok);font-weight:900}.fail{color:var(--ng);font-weight:900}.note{margin-top:16px;padding:12px 14px;border-left:5px solid var(--accent);background:var(--accent-soft);border-radius:10px;color:#475569;font-size:.95rem}.badge{display:inline-block;font-size:.85rem;padding:2px 8px;border-radius:99px;background:var(--accent-soft);color:var(--accent);margin-bottom:8px;font-weight:900}
  input{width:100%;padding:14px 16px;font-size:1.1rem;border:1px solid #cbd5e1;border-radius:12px;margin-top:12px}input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)}.status{font-size:.92rem;color:#6b7280;margin-top:10px}.answer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}.unit{font-weight:900;color:var(--muted);padding-bottom:13px}.review-item{text-align:left;margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff}
  @media(max-width:560px){.card{padding:18px}.question{font-size:1.06rem}.choice{font-size:1rem}.answer-row{grid-template-columns:1fr}.unit{padding:0}}
  `;

  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  document.body.innerHTML = `
  <div class="wrap"><div class="card">
    <h1>${escapeHTML(CONFIG.title || "力学的エネルギー トレーナー")}</h1>
    <div class="lead">${escapeHTML(CONFIG.lead || "位置エネルギーと運動エネルギーの基本を練習します。")}</div>
    <div id="startScreen">
      <div class="note">${escapeHTML(CONFIG.note || "10問ランダム出題、70%以上でクリアです。")}</div>
      <div class="note">学籍番号を入力してからスタートしてください。</div>
      <input id="studentId" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="学籍番号">
      <div class="buttons"><button id="startBtn">スタート</button></div>
    </div>
    <div id="quizScreen" style="display:none">
      <div class="top"><div id="count"></div><div id="score"></div></div>
      <div class="bar"><div id="bar"></div></div>
      <div id="question" class="question"></div>
      <div id="choices" class="choices"></div>
      <div id="writtenArea"></div>
      <div id="feedback" class="feedback"></div>
      <div class="buttons"><button id="answerBtn" disabled>答える</button><button id="nextBtn" disabled>次の問題</button><span class="button-break"></span><button class="secondary" id="restartBtn">最初から</button></div>
    </div>
    <div id="finishScreen" class="result" style="display:none">
      <div>結果</div><div id="finalScore" class="scorebig"></div><div id="finalMessage"></div><div id="sendStatus" class="status"></div>
      <div class="buttons" style="justify-content:center"><button id="againBtn">もう一度やる</button><button class="secondary" id="reviewBtn">間違えた問題だけ復習</button><button class="secondary" id="categoryBtn">カテゴリトップへ</button><button class="secondary" id="homeBtn">トップページへ</button></div>
    </div>
  </div></div>`;

  let quiz = [];
  let index = 0;
  let score = 0;
  let wrongList = [];
  let answered = false;
  let selectedAnswer = "";
  let selectedButton = null;
  const $ = id => document.getElementById(id);

  function escapeHTML(v){return String(v ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function allProblems(){return Object.values(BANKS).flat().map((q,i)=>withId(q,i))}
  function baseBank(){return isWritten ? allProblems() : (BANKS[stageKey] || []).map((q,i)=>withId(q,i))}
  function withId(q,i){return {...q,id:q.id || `ME_${stageKey}_${i}_${hash(q.text)}`}}
  function hash(s){let h=0;for(const ch of String(s)){h=((h<<5)-h)+ch.charCodeAt(0);h|=0}return Math.abs(h).toString(36)}
  function formatNumber(v){const n=Number(v);if(!Number.isFinite(n))return String(v);if(Math.abs(n-Math.round(n))<1e-9)return String(Math.round(n));if(Math.abs(n)>=100)return String(Math.round(n*10)/10);return String(Math.round(n*100)/100)}
  function answerLabel(q){return `${formatNumber(q.answer)} [${q.unit}]`}
  function sameAnswer(a,b){return String(a.answer)===String(b.answer) && String(a.unit)===String(b.unit)}
  function makeChoices(q){const pool=allProblems().filter(x=>x.unit===q.unit&&!sameAnswer(x,q));const labels=[];const add=label=>{if(!labels.includes(label))labels.push(label)};add(answerLabel(q));shuffle(pool).forEach(x=>add(answerLabel(x)));let delta=1;while(labels.length<4){add(`${formatNumber(Number(q.answer)+delta)} [${q.unit}]`);delta++}return shuffle(labels.slice(0,4))}
  function normalizeInput(s){return String(s ?? "").trim().replace(/[−ー―]/g,"-").replace(/，/g,".").replace(/×10\^?/g,"e").replace(/[^\d.+\-eE]/g,"")}
  function parseInput(s){const n=Number(normalizeInput(s));return Number.isFinite(n)?n:NaN}
  function numericCorrect(user, ans){if(!Number.isFinite(user))return false;const a=Number(ans);const tol=Math.max(0.05, Math.abs(a)*0.015);return Math.abs(user-a)<=tol}
  function displayText(s){return escapeHTML(s).replace(/\^2/g,"<sup>2</sup>").replace(/m\/s²/g,"m/s<sup>2</sup>").replace(/m\/s2/g,"m/s<sup>2</sup>").replace(/m²/g,"m<sup>2</sup>").replace(/m2/g,"m<sup>2</sup>")}

  function buildQuiz(source=null){
    const bank = source || baseBank();
    return shuffle(bank).slice(0,total).map(q=>({...q,choices:isWritten?[]:makeChoices(q)}));
  }
  function start(source=null){
    const studentId=$("studentId").value.trim();
    if(!studentId){alert("学籍番号を入力してください。");$("studentId").focus();return}
    quiz=buildQuiz(source);index=0;score=0;wrongList=[];TrainerLog.startSession();
    $("startScreen").style.display="none";$("finishScreen").style.display="none";$("quizScreen").style.display="block";showQuestion();
  }
  function showQuestion(){
    answered=false;selectedAnswer="";selectedButton=null;
    const q=quiz[index];
    $("count").textContent=`${index+1} / ${quiz.length}`;$("score").textContent=`正解 ${score}`;$("bar").style.width=`${index/quiz.length*100}%`;
    $("question").innerHTML=`<span class="badge">${escapeHTML(q.stage || CONFIG.badge || "")}</span><br>${displayText(q.text)}`;
    $("feedback").className="feedback";$("feedback").style.display="none";$("answerBtn").disabled=true;$("nextBtn").disabled=true;
    $("choices").innerHTML="";$("writtenArea").innerHTML="";
    if(isWritten){
      $("writtenArea").innerHTML=`<div class="answer-row"><input id="answerInput" inputmode="decimal" autocomplete="off" placeholder="数値を入力"><span class="unit">${escapeHTML(q.unit)}</span></div>`;
      const input=$("answerInput");input.addEventListener("input",()=>{$("answerBtn").disabled=!input.value.trim()});input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!$("answerBtn").disabled)check()});setTimeout(()=>input.focus(),50);
    }else{
      q.choices.forEach((c,i)=>{const b=document.createElement("button");b.className="choice";b.dataset.answer=c;b.textContent=`${["①","②","③","④"][i]}　${c}`;b.onclick=()=>selectChoice(c,b);$("choices").appendChild(b)});
    }
    TrainerLog.startQuestion();
  }
  function selectChoice(selected,btn){if(answered)return;selectedAnswer=selected;selectedButton=btn;document.querySelectorAll(".choice").forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");$("answerBtn").disabled=false}
  function explanation(q,ok,userText=""){const userLine=isWritten?`<div>あなたの答え：<strong>${escapeHTML(userText || "未入力")} ${escapeHTML(q.unit)}</strong></div>`:"";return `<strong>${ok?"正解！":"不正解"}</strong><br>${userLine}正解：<strong>${answerLabel(q)}</strong><div class="formula">${displayText(q.solution || "")}</div>`}
  function check(){
    if(answered)return;const q=quiz[index];let ok=false;let selected="";
    if(isWritten){selected=$("answerInput").value.trim();ok=numericCorrect(parseInput(selected),q.answer)}
    else{if(!selectedAnswer)return;selected=selectedAnswer;ok=selected===answerLabel(q)}
    answered=true;TrainerLog.recordQuestion({id:q.id,type:stageName,question:q.text,answer:answerLabel(q)},ok,{selected,answer:answerLabel(q),prompt:q.text});
    if(ok)score++;else wrongList.push(q);
    if(!isWritten){document.querySelectorAll(".choice").forEach(b=>{b.disabled=true;if(b.dataset.answer===answerLabel(q))b.classList.add("correct")});if(!ok&&selectedButton)selectedButton.classList.add("wrong")}
    const fb=$("feedback");fb.className="feedback "+(ok?"ok":"ng");fb.innerHTML=explanation(q,ok,selected);fb.style.display="block";
    $("score").textContent=`正解 ${score}`;$("answerBtn").disabled=true;$("nextBtn").disabled=false;
  }
  function next(){index++;index>=quiz.length?finish():showQuestion()}
  function finish(){
    TrainerLog.finishSession();$("quizScreen").style.display="none";$("finishScreen").style.display="block";
    const rate=Math.round(score/quiz.length*100);$("finalScore").textContent=`${score} / ${quiz.length} 問正解（${rate}%）`;
    $("finalMessage").innerHTML=rate>=70?'<div class="pass">クリア！力学的エネルギーの基本が整理できています。</div>':'<div class="fail">もう一度、公式とエネルギーの対応を確認してみましょう。</div>';
    TrainerLog.showElapsedInFinalMessage();$("reviewBtn").style.display=wrongList.length?"inline-block":"none";TrainerLog.sendResult({gasUrl:GAS_URL,stage:stageName,score,total:quiz.length});
  }
  $("startBtn").onclick=()=>start();$("answerBtn").onclick=check;$("nextBtn").onclick=next;$("studentId").addEventListener("keydown",e=>{if(e.key==="Enter")start()});
  $("restartBtn").onclick=()=>{$("quizScreen").style.display="none";$("finishScreen").style.display="none";$("startScreen").style.display="block"};
  $("againBtn").onclick=()=>{$("finishScreen").style.display="none";$("startScreen").style.display="block"};
  $("reviewBtn").onclick=()=>{if(wrongList.length){const saved=[...wrongList];start(saved)}};
  $("categoryBtn").onclick=()=>{location.href="index.html"};$("homeBtn").onclick=()=>{location.href="../index.html"};
})();
