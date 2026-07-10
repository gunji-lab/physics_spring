window.TrainerLog=window.TrainerLog||{startSession(){},startQuestion(){},recordQuestion(){},finishSession(){},showElapsedInFinalMessage(){},sendResult(){}};

const config=window.HEAT_GAS_STAGE_CONFIG;
if(config&&config.stageKey&&!config.problems){
  const bank=(window.HEAT_GAS_BANKS||{})[config.stageKey];
  if(bank&&Array.isArray(bank.problems)){
    config.problems=bank.problems;
  }
}
const $=id=>document.getElementById(id);
let quiz=[],index=0,score=0,wrongList=[],answered=false,selectedAnswer="",selectedButton=null;

document.title=config.title;
$("title").textContent=config.title;
$("lead").textContent=config.lead;
$("intro").innerHTML=config.intro;

function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function escapeHTML(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function displayMath(value){
  return escapeHTML(value).replace(/\^(-?\d+(?:\.\d+)?)/g,"<sup>$1</sup>");
}
function makeChoices(q){
  const pool=config.answerPools[q.type]||config.answerPools.default||[];
  return shuffle([q.ans,...shuffle(pool.filter(x=>x!==q.ans)).slice(0,3)]);
}
function buildQuiz(){
  if(config.groups){
    return config.groups.flatMap(group=>{
      const items=config.problems.filter(q=>q.type===group.type);
      return shuffle(items).slice(0,group.count);
    });
  }
  return shuffle(config.problems).slice(0,config.total||10);
}
function start(source=null){
  if(!$("studentId").value.trim()){
    alert("学籍番号を入力してください。");
    $("studentId").focus();
    return;
  }
  quiz=shuffle(source||buildQuiz()).slice(0,config.total||10).map(q=>({...q,choices:q.choices||makeChoices(q)}));
  index=0;score=0;wrongList=[];
  TrainerLog.startSession();
  $("startScreen").style.display="none";
  $("finishScreen").style.display="none";
  $("quizScreen").style.display="block";
  showQuestion();
}
function showQuestion(){
  answered=false;selectedAnswer="";selectedButton=null;
  const q=quiz[index];
  $("count").textContent=`${index+1} / ${quiz.length}`;
  $("score").textContent=`正解 ${score}`;
  $("bar").style.width=`${index/quiz.length*100}%`;
  $("question").innerHTML=`<span class="badge">${displayMath(config.badges[q.type]||config.badges.default||"計算")}</span><br>${displayMath(q.question)}`;
  $("feedback").className="feedback";
  $("feedback").style.display="none";
  $("answerBtn").disabled=true;
  $("nextBtn").disabled=true;
  const box=$("choices");
  box.innerHTML="";
  q.choices.forEach((c,i)=>{
    const b=document.createElement("button");
    b.className="choice";
    b.dataset.answer=c;
    b.innerHTML=`${["①","②","③","④"][i]}　${displayMath(c)}`;
    b.onclick=()=>selectChoice(c,b);
    box.appendChild(b);
  });
  TrainerLog.startQuestion();
}
function selectChoice(value,button){
  if(answered)return;
  selectedAnswer=value;
  selectedButton=button;
  document.querySelectorAll(".choice").forEach(b=>b.classList.remove("selected"));
  button.classList.add("selected");
  $("answerBtn").disabled=false;
}
function check(){
  if(answered||!selectedAnswer)return;
  answered=true;
  const q=quiz[index],ok=selectedAnswer===q.ans;
  if(!q.id)q.id=`${config.idPrefix}_${q.type}_${index+1}`;
  TrainerLog.recordQuestion(q,ok,{selected:selectedAnswer,answer:q.ans,prompt:q.question});
  if(ok)score++;else wrongList.push(q);
  document.querySelectorAll(".choice").forEach(b=>{
    b.disabled=true;
    if(b.dataset.answer===q.ans)b.classList.add("correct");
  });
  if(!ok&&selectedButton)selectedButton.classList.add("wrong");
  $("feedback").className="feedback "+(ok?"ok":"ng");
  $("feedback").innerHTML=`<strong>${ok?"正解！":"不正解"}</strong><br>正解：<strong>${displayMath(q.ans)}</strong><div class="formula">${displayMath(q.calc)}</div><div class="note">ポイント：${displayMath(q.point||config.point)}</div>`;
  $("feedback").style.display="block";
  $("score").textContent=`正解 ${score}`;
  $("answerBtn").disabled=true;
  $("nextBtn").disabled=false;
}
function next(){index++;index>=quiz.length?finish():showQuestion()}
function finish(){
  TrainerLog.finishSession();
  $("quizScreen").style.display="none";
  $("finishScreen").style.display="block";
  const rate=Math.round(score/quiz.length*100);
  $("finalScore").textContent=`${score} / ${quiz.length} 問正解（${rate}%）`;
  $("finalMessage").innerHTML=rate>=70?`<div class="pass">${config.passMessage}</div>`:`<div class="fail">${config.failMessage}</div>`;
  TrainerLog.showElapsedInFinalMessage();
  $("reviewBtn").style.display=wrongList.length?"inline-block":"none";
  TrainerLog.sendResult({score,total:quiz.length});
}

$("startBtn").onclick=()=>start();
$("answerBtn").onclick=check;
$("nextBtn").onclick=next;
$("studentId").addEventListener("keydown",e=>{if(e.key==="Enter")start()});
$("restartBtn").onclick=()=>{$("quizScreen").style.display="none";$("finishScreen").style.display="none";$("startScreen").style.display="block"};
$("againBtn").onclick=()=>{$("finishScreen").style.display="none";$("startScreen").style.display="block"};
$("reviewBtn").onclick=()=>{if(wrongList.length)start([...wrongList])};
$("categoryBtn").onclick=()=>{location.href="index.html"};
$("homeBtn").onclick=()=>{location.href="../index.html"};
