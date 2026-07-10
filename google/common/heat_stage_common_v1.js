(() => {
  const CONFIG = window.HEAT_STAGE_CONFIG || {};
  const BANKS = window.HEAT_BANKS || {};
  const stageKey = CONFIG.stageKey || "stage1";
  const isWritten = !!CONFIG.written;
  const total = Number(CONFIG.total || 10);
  const accent = CONFIG.accent || "#ea580c";
  window.TrainerLog = window.TrainerLog || {startSession(){},startQuestion(){},recordQuestion(){},finishSession(){},showElapsedInFinalMessage(){},sendResult(){}};

  const css = `
  :root{--bg:#f6f7fb;--card:#fff;--text:#1f2937;--muted:#6b7280;--accent:${accent};--accent-soft:#fff7ed;--ok:#16a34a;--ng:#dc2626;--line:#e5e7eb;--soft:#f8fafc}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;line-height:1.7}
  .wrap{max-width:860px;margin:0 auto;padding:22px 14px 46px}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 10px 28px rgba(0,0,0,.07)}
  h1{margin:0 0 6px;font-size:1.55rem}.lead{color:var(--muted);font-size:.96rem;margin-bottom:16px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--muted);font-size:.95rem;margin-top:12px}
  .bar{height:10px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:10px 0 20px}.bar>div{height:100%;width:0%;background:var(--accent);transition:width .25s ease}
  .question{font-size:1.2rem;font-weight:800;margin:18px 0;padding:16px;background:var(--soft);border-radius:14px;border:1px solid var(--line)}.choices{display:grid;gap:12px;margin:16px 0}
  .choice{width:100%;text-align:left;border:1px solid #cbd5e1;background:#fff;color:var(--text);border-radius:14px;padding:14px 16px;font-size:1.06rem;font-weight:700;cursor:pointer}.choice:hover{border-color:var(--accent);box-shadow:0 0 0 3px rgba(234,88,12,.10)}
  .choice.selected{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 3px rgba(234,88,12,.16)}.choice:disabled{cursor:default;opacity:1}.choice.correct{border-color:#86efac;background:#ecfdf5;color:#14532d}.choice.wrong{border-color:#fecaca;background:#fef2f2;color:#7f1d1d}
  .feedback{display:none;margin-top:18px;padding:16px;border-radius:14px}.feedback.ok{display:block;background:#ecfdf5;border:1px solid #bbf7d0;color:#14532d}.feedback.ng{display:block;background:#fef2f2;border:1px solid #fecaca;color:#7f1d1d}
  .formula{margin-top:10px;padding:11px 12px;background:#fff;border:1px solid var(--line);border-radius:10px;font-size:1.05rem;overflow-x:auto}.buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.button-break{flex-basis:100%;height:0}
  button{border:0;border-radius:12px;padding:12px 16px;font-size:1rem;font-weight:800;cursor:pointer;background:var(--accent);color:#fff}button.secondary{background:#e5e7eb;color:#111827}button:disabled{opacity:.5;cursor:not-allowed}
  .result{text-align:center;padding:24px 8px}.scorebig{font-size:2.25rem;font-weight:900;margin:8px 0}.pass{color:var(--ok);font-weight:900}.fail{color:var(--ng);font-weight:900}.note{margin-top:16px;padding:12px 14px;border-left:5px solid #fdba74;background:var(--accent-soft);border-radius:10px;color:#475569;font-size:.95rem}.badge{display:inline-block;font-size:.85rem;padding:2px 8px;border-radius:99px;background:#ffedd5;color:#9a3412;margin-bottom:8px;font-weight:900}
  input{width:100%;padding:14px 16px;font-size:1.1rem;border:1px solid #cbd5e1;border-radius:12px;margin-top:12px}input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(234,88,12,.15)}.status{font-size:.92rem;color:#6b7280;margin-top:10px}.answer-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}.unit{font-weight:900;color:var(--muted);padding-bottom:13px}
  @media(max-width:560px){.card{padding:18px}.question{font-size:1.06rem}.choice{font-size:1rem}.answer-row{grid-template-columns:1fr}.unit{padding:0}}
  `;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
  document.body.innerHTML = `
  <div class="wrap"><div class="card">
    <h1>${escapeHTML(CONFIG.title || "熱トレーナー")}</h1>
    <div class="lead">${escapeHTML(CONFIG.lead || "熱の基本を練習します。")}</div>
    <div id="startScreen">
      <div class="note">${CONFIG.note || "10問ランダム出題、70%以上でクリアです。"}</div>
      <div class="note">大学Googleアカウントで確認済みです。</div>
      <input id="studentId" type="hidden" autocomplete="off">
      <div class="buttons"><button id="startBtn">スタート</button></div>
    </div>
    <div id="quizScreen" style="display:none"><div class="top"><div id="count"></div><div id="score"></div></div><div class="bar"><div id="bar"></div></div><div id="question" class="question"></div><div id="choices" class="choices"></div><div id="writtenArea"></div><div id="feedback" class="feedback"></div><div class="buttons"><button id="answerBtn" disabled>答える</button><button id="nextBtn" disabled>次の問題</button><span class="button-break"></span><button class="secondary" id="restartBtn">最初から</button></div></div>
    <div id="finishScreen" class="result" style="display:none"><div>結果</div><div id="finalScore" class="scorebig"></div><div id="finalMessage"></div><div id="sendStatus" class="status"></div><div class="buttons" style="justify-content:center"><button id="againBtn">もう一度やる</button><button class="secondary" id="reviewBtn">間違えた問題だけ復習</button><button class="secondary" id="categoryBtn">カテゴリトップへ</button><button class="secondary" id="homeBtn">トップページへ</button></div></div>
  </div></div>`;

  let quiz=[],index=0,score=0,wrongList=[],answered=false,selectedAnswer="",selectedButton=null;
  const $=id=>document.getElementById(id);
  function escapeHTML(v){return String(v ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function allProblems(){return Object.entries(BANKS).flatMap(([key,items])=>items.map((q,i)=>withId(q,key,i)))}
  function baseBank(){return isWritten ? allProblems() : (BANKS[stageKey] || []).map((q,i)=>withId(q,stageKey,i))}
  function withId(q,key,i){return {...q,id:q.id || `HEAT_${key}_${i+1}`}}
  function formatNumber(v){if(typeof v==="string")return v;const n=Number(v);if(!Number.isFinite(n))return String(v);if(Math.abs(n-Math.round(n))<1e-9)return String(Math.round(n));return String(Math.round(n*1000)/1000)}
  function answerLabel(q){return q.unit ? `${formatNumber(q.answer)} [${q.unit}]` : String(q.answer)}
  function displayText(s){return escapeHTML(s).replace(/\^2/g,"<sup>2</sup>").replace(/\^3/g,"<sup>3</sup>").replace(/ΔT/g,"ΔT")}
  function sameAnswer(a,b){return String(a.answer)===String(b.answer) && String(a.unit||"")===String(b.unit||"")}
  function makeChoices(q){
    if(q.choices) return shuffle(q.choices);
    let pool=baseBank().filter(x=>(x.unit||"")===(q.unit||"")&&!sameAnswer(x,q));
    if(pool.length<3)pool=allProblems().filter(x=>(x.unit||"")===(q.unit||"")&&!sameAnswer(x,q));
    const labels=[];const add=x=>{if(!labels.includes(x))labels.push(x)};add(answerLabel(q));shuffle(pool).forEach(x=>add(answerLabel(x)));
    if((q.unit||"")==="" && q.type==="compare") ["銀","銅","鉄","アルミニウム","コンクリート","木材","氷","水","どちらも等しい"].forEach(add);
    let d=1;while(labels.length<4){const n=Number(q.answer);add(Number.isFinite(n)?`${formatNumber(n+d)} [${q.unit}]`:`別の答え${d}`);d++}
    return shuffle(labels.slice(0,4));
  }
  function buildQuiz(source=null){
    if(source) return shuffle(source).slice(0,total).map(q=>({...q,choices:isWritten?[]:makeChoices(q)}));
    if(isWritten){
      const keys=["stage1","stage2","stage3","stage4","stage5"];
      return shuffle(keys.flatMap(k=>shuffle((BANKS[k]||[]).map((q,i)=>withId(q,k,i))).slice(0,2))).slice(0,total);
    }
    const bank=baseBank();
    if(CONFIG.groups){
      return shuffle(CONFIG.groups.flatMap(g=>shuffle(bank.filter(q=>q.type===g.type)).slice(0,g.count))).map(q=>({...q,choices:makeChoices(q)}));
    }
    return shuffle(bank).slice(0,total).map(q=>({...q,choices:makeChoices(q)}));
  }
  function normalizeInput(s){return String(s ?? "").trim().replace(/[０-９]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).replace(/[−ー―]/g,"-").replace(/，/g,".").replace(/×10\^?/g,"e").replace(/,/g,"").replace(/\s/g,"").replace(/\[[^\]]*\]/g,"").replace(/℃|kg|J|K|Pa|m|g/g,"")}
  function numericCorrect(raw,ans){if(typeof ans==="string")return normalizeInput(raw)===normalizeInput(ans);const match=normalizeInput(raw).match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i);if(!match)return false;const v=Number(match[0]);const a=Number(ans);const tol=Math.max(0.02,Math.abs(a)*0.015);return Number.isFinite(v)&&Math.abs(v-a)<=tol}

  function getVerifiedStudentId(){
    const input=$("studentId");
    const fromInput=input?input.value.trim():"";
    const fromAuth=window.TrainerAuth&&typeof TrainerAuth.getStudentId==="function"?TrainerAuth.getStudentId():"";
    const studentId=fromInput||String(fromAuth||"").trim();
    if(input&&studentId&&!fromInput)input.value=studentId;
    return studentId;
  }
  function start(source=null){if(!getVerifiedStudentId()){if(window.TrainerAuth&&typeof TrainerAuth.login==="function"){TrainerAuth.login();return}alert("大学Googleアカウントを確認できませんでした。ログインし直してください。");return}quiz=buildQuiz(source);index=0;score=0;wrongList=[];TrainerLog.startSession();$("startScreen").style.display="none";$("finishScreen").style.display="none";$("quizScreen").style.display="block";showQuestion()}
  function showQuestion(){answered=false;selectedAnswer="";selectedButton=null;const q=quiz[index];$("count").textContent=`${index+1} / ${quiz.length}`;$("score").textContent=`正解 ${score}`;$("bar").style.width=`${index/quiz.length*100}%`;$("question").innerHTML=`<span class="badge">${escapeHTML(q.stage || CONFIG.badge || "")}</span><br>${displayText(q.text)}`;$("feedback").className="feedback";$("feedback").style.display="none";$("answerBtn").disabled=true;$("nextBtn").disabled=true;$("choices").innerHTML="";$("writtenArea").innerHTML="";
    if(isWritten){$("writtenArea").innerHTML=`<div class="answer-row"><input id="answerInput" autocomplete="off" placeholder="答えを入力"><span class="unit">${escapeHTML(q.unit || "")}</span></div>`;const input=$("answerInput");input.addEventListener("input",()=>{$("answerBtn").disabled=!input.value.trim()});input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!$("answerBtn").disabled)check()});setTimeout(()=>input.focus(),50)}
    else{q.choices.forEach((c,i)=>{const b=document.createElement("button");b.className="choice";b.dataset.answer=c;b.innerHTML=`${["①","②","③","④"][i]}　${displayText(c)}`;b.onclick=()=>selectChoice(c,b);$("choices").appendChild(b)})}TrainerLog.startQuestion()}
  function selectChoice(v,b){if(answered)return;selectedAnswer=v;selectedButton=b;document.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("answerBtn").disabled=false}
  function check(){if(answered)return;const q=quiz[index];let selected,ok;if(isWritten){selected=$("answerInput").value.trim();if(!selected){alert("答えを入力してください。");return}ok=numericCorrect(selected,q.answer)}else{if(!selectedAnswer)return;selected=selectedAnswer;ok=selected===answerLabel(q)}answered=true;TrainerLog.recordQuestion({id:q.id,type:q.type,question:q.text,answer:answerLabel(q)},ok,{selected,answer:answerLabel(q),prompt:q.text});if(ok)score++;else wrongList.push(q);if(!isWritten){document.querySelectorAll(".choice").forEach(b=>{b.disabled=true;if(b.dataset.answer===answerLabel(q))b.classList.add("correct")});if(!ok&&selectedButton)selectedButton.classList.add("wrong")}$("feedback").className="feedback "+(ok?"ok":"ng");$("feedback").innerHTML=`<strong>${ok?"正解！":"不正解"}</strong><br>${isWritten?`あなたの答え：<strong>${escapeHTML(selected)} ${escapeHTML(q.unit||"")}</strong><br>`:""}正解：<strong>${displayText(answerLabel(q))}</strong><div class="formula">${displayText(q.solution || "")}</div><div class="note">ポイント：式を立ててから、最後に単位と数値を確認しましょう。</div>`;$("feedback").style.display="block";$("score").textContent=`正解 ${score}`;$("answerBtn").disabled=true;$("nextBtn").disabled=false}
  function next(){index++;index>=quiz.length?finish():showQuestion()}
  function finish(){TrainerLog.finishSession();$("quizScreen").style.display="none";$("finishScreen").style.display="block";const rate=Math.round(score/quiz.length*100);$("finalScore").textContent=`${score} / ${quiz.length} 問正解（${rate}%）`;$("finalMessage").innerHTML=rate>=70?`<div class="pass">${CONFIG.passMessage || "クリア！熱の基本が整理できています。"}</div>`:`<div class="fail">${CONFIG.failMessage || "式と単位を確認して、もう一度挑戦しましょう。"}</div>`;TrainerLog.showElapsedInFinalMessage();$("reviewBtn").style.display=wrongList.length?"inline-block":"none";TrainerLog.sendResult({score,total:quiz.length})}
  $("startBtn").onclick=()=>start();$("answerBtn").onclick=check;$("nextBtn").onclick=next;$("studentId").addEventListener("keydown",e=>{if(e.key==="Enter")start()});$("restartBtn").onclick=()=>{$("quizScreen").style.display="none";$("finishScreen").style.display="none";$("startScreen").style.display="block"};$("againBtn").onclick=()=>{$("finishScreen").style.display="none";$("startScreen").style.display="block"};$("reviewBtn").onclick=()=>{if(wrongList.length)start([...wrongList])};$("categoryBtn").onclick=()=>{location.href="index.html"};$("homeBtn").onclick=()=>{location.href="../index.html"};
})();
