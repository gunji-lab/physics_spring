(() => {
  const basicBank=[
    {id:"c_rad",section:"円運動",prompt:"180°をラジアンで答えなさい。",answers:["π","pi"],display:"π",example:"π または pi"},
    {id:"c_arc",section:"円運動",prompt:"半径2.0 m、角度3.0 radの弧の長さを求めなさい。",number:6,tolerance:.01,unit:"m",display:"6.0 m"},
    {id:"c_speed",section:"円運動",prompt:"半径0.50 m、角速度4.0 rad/sの物体の速さを求めなさい。",number:2,tolerance:.01,unit:"m/s",display:"2.0 m/s"},
    {id:"c_period",section:"円運動",prompt:"角速度が2π rad/sの円運動の周期を求めなさい。",number:1,tolerance:.01,unit:"s",display:"1.0 s"},
    {id:"c_acc",section:"円運動",prompt:"速さ6.0 m/s、半径3.0 mの円運動の向心加速度を求めなさい。",number:12,tolerance:.05,unit:"m/s²",display:"12 m/s²"},
    {id:"c_rad2",section:"円運動",prompt:"90°をラジアンで答えなさい。",answers:["π/2","pi/2"],display:"π/2"},
    {id:"c_deg",section:"円運動",prompt:"π/3 radを度で答えなさい。",number:60,tolerance:.01,unit:"°",display:"60°"},
    {id:"c_arc2",section:"円運動",prompt:"半径4.0 m、角度π/2 radの弧の長さを求めなさい。",answers:["2π","2pi"],display:"2π m",unit:"m"},
    {id:"c_speed2",section:"円運動",prompt:"半径2.0 m、角速度3.0 rad/sの物体の速さを求めなさい。",number:6,tolerance:.02,unit:"m/s",display:"6.0 m/s"},
    {id:"c_period2",section:"円運動",prompt:"角速度がπ/2 rad/sの円運動の周期を求めなさい。",number:4,tolerance:.02,unit:"s",display:"4.0 s"},
    {id:"c_acc2",section:"円運動",prompt:"半径2.0 m、角速度3.0 rad/sの円運動の向心加速度を求めなさい。",number:18,tolerance:.05,unit:"m/s²",display:"18 m/s²"},
    {id:"s_force",section:"バネ",prompt:"ばね定数200 N/mのばねを0.030 m伸ばしたときの弾性力の大きさを求めなさい。",number:6,tolerance:.02,unit:"N",display:"6.0 N"},
    {id:"s_extension",section:"バネ",prompt:"ばね定数50 N/mのばねに10 Nの力を加えた。伸びを求めなさい。",number:.2,tolerance:.002,unit:"m",display:"0.20 m"},
    {id:"s_energy",section:"バネ",prompt:"ばね定数100 N/mのばねを0.20 m伸ばしたときの弾性エネルギーを求めなさい。",number:2,tolerance:.02,unit:"J",display:"2.0 J"},
    {id:"s_force2",section:"バネ",prompt:"ばね定数150 N/mのばねを0.040 m伸ばしたときの弾性力の大きさを求めなさい。",number:6,tolerance:.02,unit:"N",display:"6.0 N"},
    {id:"s_extension2",section:"バネ",prompt:"ばね定数80 N/mのばねに12 Nの力を加えた。伸びを求めなさい。",number:.15,tolerance:.002,unit:"m",display:"0.15 m"},
    {id:"s_energy2",section:"バネ",prompt:"ばね定数50 N/mのばねを0.40 m伸ばしたときの弾性エネルギーを求めなさい。",number:4,tolerance:.03,unit:"J",display:"4.0 J"},
    {id:"s_force3",section:"バネ",prompt:"ばね定数300 N/mのばねを0.020 m伸ばしたときの弾性力の大きさを求めなさい。",number:6,tolerance:.02,unit:"N",display:"6.0 N"},
    {id:"s_extension3",section:"バネ",prompt:"ばね定数120 N/mのばねに6.0 Nの力を加えた。伸びを求めなさい。",number:.05,tolerance:.002,unit:"m",display:"0.050 m"},
    {id:"s_balance",section:"バネ",prompt:"質量0.20 kgのおもりをばねにつるす。重力加速度を9.8 m/s²、ばね定数を98 N/mとすると、伸びを求めなさい。",number:.02,tolerance:.002,unit:"m",display:"0.020 m"},
    {id:"s_energy3",section:"バネ",prompt:"ばね定数200 N/mのばねを0.10 m伸ばしたときの弾性エネルギーを求めなさい。",number:1,tolerance:.02,unit:"J",display:"1.0 J"},
    {id:"s_energy4",section:"バネ",prompt:"ばね定数80 N/mのばねを0.25 m伸ばしたときの弾性エネルギーを求めなさい。",number:2.5,tolerance:.03,unit:"J",display:"2.5 J"},
    {id:"h_heat",section:"熱",prompt:"質量0.20 kg、比熱4200 J/(kg·K)の水の温度を5.0 K上げるのに必要な熱量を求めなさい。",number:4200,tolerance:5,unit:"J",display:"4200 J"},
    {id:"h_capacity",section:"熱",prompt:"熱容量600 J/Kの物体へ1800 Jを与えた。温度変化を求めなさい。",number:3,tolerance:.02,unit:"K",display:"3.0 K"},
    {id:"h_mix",section:"熱",prompt:"同じ質量の同じ物質を20℃と80℃から混ぜ、熱損失がないとする。平衡温度を求めなさい。",number:50,tolerance:.1,unit:"℃",display:"50 ℃"},
    {id:"h_heat2",section:"熱",prompt:"質量0.10 kg、比熱900 J/(kg·K)のアルミニウムの温度を20 K上げるのに必要な熱量を求めなさい。",number:1800,tolerance:5,unit:"J",display:"1800 J"},
    {id:"h_capacity2",section:"熱",prompt:"熱容量250 J/Kの物体へ1000 Jを与えた。温度変化を求めなさい。",number:4,tolerance:.02,unit:"K",display:"4.0 K"},
    {id:"h_heat3",section:"熱",prompt:"質量50 g、比熱4.2 J/(g·K)の水の温度を10 K上げるのに必要な熱量を求めなさい。",number:2100,tolerance:5,unit:"J",display:"2100 J"},
    {id:"h_temp",section:"熱",prompt:"27℃を絶対温度で答えなさい。ただし 0℃ = 273 K とする。",number:300,tolerance:.01,unit:"K",display:"300 K"},
    {id:"h_celsius",section:"熱",prompt:"310 Kをセルシウス温度で答えなさい。ただし 0℃ = 273 K とする。",number:37,tolerance:.01,unit:"℃",display:"37 ℃"},
    {id:"h_capacity3",section:"熱",prompt:"熱容量400 J/Kの物体の温度を5.0 K上げるのに必要な熱量を求めなさい。",number:2000,tolerance:5,unit:"J",display:"2000 J"},
    {id:"h_delta",section:"熱",prompt:"600 Jの熱を加えると温度が12 K上がった。熱容量を求めなさい。",number:50,tolerance:.1,unit:"J/K",display:"50 J/K"},
    {id:"h_heat4",section:"熱",prompt:"質量100 g、比熱0.90 J/(g·K)のアルミニウムの温度を10 K上げるのに必要な熱量を求めなさい。",number:900,tolerance:3,unit:"J",display:"900 J"},
    {id:"h_heat5",section:"熱",prompt:"質量200 g、比熱0.45 J/(g·K)の鉄の温度を20 K上げるのに必要な熱量を求めなさい。",number:1800,tolerance:5,unit:"J",display:"1800 J"}
  ];
  const big2=[
    {id:"grav_symbol",title:"人工衛星の軌道速度",context:"地球の質量をM、人工衛星の質量をm、地球中心からの距離をr、万有引力定数をGとする。",questions:[
      {prompt:"人工衛星にはたらく万有引力Fを式で答えなさい。",answers:["GMm/r²","GMm/r^2"],display:"GMm/r²",example:"F=GMm/r2 または GMm/r²"},
      {prompt:"円軌道を回る人工衛星の速さvを式で答えなさい。",answers:["√(GM/r)","sqrt(GM/r)"],display:"√(GM/r)",example:"v=√GM/r または √(GM/r)"}
    ]},
    {id:"cone_force",title:"円錐振り子の力",context:"質量mの小球が、鉛直方向から角度θだけ傾いた糸で水平な円運動をしている。糸の張力をTとする。",questions:[
      {prompt:"鉛直方向のつり合いを式で答えなさい。",answers:["Tcosθ=mg","Tcos(theta)=mg","Tcosθ＝mg"],display:"Tcosθ = mg",example:"Tcosθ=mg"},
      {prompt:"水平方向の運動方程式を、円運動の半径rと速さvを使って答えなさい。",answers:["Tsinθ=mv²/r","Tsin(theta)=mv^2/r"],display:"Tsinθ = mv²/r",example:"Tsinθ=mv2/r"}
    ]},
    {id:"spring_circle",title:"円運動するばね",context:"質量mの物体が、自然長からx伸びたばねにつながれ、半径r、速さvで水平な円運動をしている。ばね定数をkとする。",questions:[
      {prompt:"ばねの弾性力の大きさを式で答えなさい。",answers:["kx"],display:"kx",example:"F=kx または kx"},
      {prompt:"ばねの弾性力が向心力になる運動方程式を答えなさい。",answers:["kx=mv²/r","kx=mv^2/r"],display:"kx = mv²/r",example:"kx=mv2/r"}
    ]}
  ];
  const big3=[
    {id:"grav_numeric",title:"地表付近の人工衛星",context:"地球の半径を6.4×10⁶ m、地表の重力加速度を9.8 m/s²とし、人工衛星が地表すれすれを円運動すると考える。",questions:[
      {prompt:"万有引力が向心力になる式を、地球質量M、衛星質量m、半径R、速さvで答えなさい。",answers:["GMm/R²=mv²/R","GMm/R^2=mv^2/R"],display:"GMm/R² = mv²/R",example:"GMm/R2=mv2/R"},
      {prompt:"GM/R²=gを使い、軌道速度vをgとRで表しなさい。",answers:["√(gR)","sqrt(gR)"],display:"√(gR)",example:"v=√gR または √(gR)"},
      {prompt:"軌道速度をkm/sで求めなさい。",number:7.9,tolerance:.15,unit:"km/s",display:"約7.9 km/s"}
    ]},
    {id:"cone_speed",title:"円錐振り子の速さ",context:"長さLの糸につながれた質量mの小球が、鉛直方向から角度θで円錐振り子の運動をしている。張力をT、円運動の半径をrとする。",questions:[
      {prompt:"円運動の半径rをLとθで表しなさい。",answers:["Lsinθ","Lsin(theta)"],display:"Lsinθ",example:"r=Lsinθ または Lsin(theta)"},
      {prompt:"鉛直方向のつり合いから、張力Tを式で表しなさい。",answers:["mg/cosθ","mg/cos(theta)"],display:"mg/cosθ",example:"T=mg/cosθ"},
      {prompt:"Tsinθ=mv²/rを使い、v²をg、L、θで表しなさい。",answers:["gL(sinθ)^2/cosθ","gLsin^2θ/cosθ","gL(sin(theta))^2/cos(theta)","gLsinθtanθ","gLsin(theta)tan(theta)"],display:"gL(sinθ)²/cosθ",example:"v2=gL(sinθ)^2/cosθ"}
    ]}
  ];
  const $=s=>document.querySelector(s),shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};

  const normalize=s=>String(s??"").trim().toLowerCase()
    .replace(/[　\s]/g,"")
    .replace(/＝/g,"=")
    .replace(/[−ー―]/g,"-")
    .replace(/÷/g,"/")
    .replace(/・/g,"")
    .replace(/×/g,"*")
    .replace(/π/g,"pi")
    .replace(/θ/g,"theta")
    .replace(/con(?=theta|\()/g,"cos")
    .replace(/sin\(theta\)/g,"sintheta")
    .replace(/cos\(theta\)/g,"costheta")
    .replace(/tan\(theta\)/g,"tantheta")
    .replace(/sin\^2theta/g,"sintheta^2")
    .replace(/²/g,"^2")
    .replace(/√/g,"sqrt")
    .replace(/sqrt\(([a-z0-9]+)\)/g,"sqrt$1")
    .replace(/[{}]/g,m=>m==="{"?"(":")")
    .replace(/\b([a-z])2\b/g,"$1^2")
    .replace(/([=+\-*/(])([a-z])2(?=$|[=+\-*/()])/g,"$1$2^2");

  function stripOptionalLeftSide(value){
    const match=value.match(/^[a-z](?:\^2)?=(.+)$/);
    return match?match[1]:value;
  }

  function normalizeRadical(value){
    return /^sqrt(?!\()(.+)$/.test(value)?value.replace(/^sqrt(.+)$/,"sqrt($1)"):value;
  }

  function symbolicForms(value){
    const exact=normalize(value);
    const withoutLeft=stripOptionalLeftSide(exact);
    const forms=new Set([exact,normalizeRadical(exact),withoutLeft,normalizeRadical(withoutLeft)]);
    Array.from(forms).forEach(form=>addTrigEquivalentForms(forms,form));
    return forms;
  }

  function addTrigEquivalentForms(forms,form){
    const compact=form.replace(/\((sintheta)\)/g,"$1");
    forms.add(compact);
    if(compact.includes("tantheta")){
      forms.add(compact.replace(/tantheta/g,"sintheta/costheta"));
    }
    if(compact.includes("sintheta/costheta")){
      forms.add(compact.replace(/sintheta\/costheta/g,"tantheta"));
    }
    if(compact.includes("sinthetatantheta")){
      forms.add(compact.replace(/sinthetatantheta/g,"sintheta^2/costheta"));
      forms.add(compact.replace(/sinthetatantheta/g,"(sintheta)^2/costheta"));
    }
    if(compact.includes("sintheta^2/costheta")){
      forms.add(compact.replace(/sintheta\^2\/costheta/g,"sinthetatantheta"));
    }
  }

  function formsMatch(a,b){
    if(a===b)return true;
    if(a.includes("=")&&b.includes("=")){
      const leftA=a.split("="),leftB=b.split("=");
      if(leftA.length===2&&leftB.length===2){
        return leftA[0]===leftB[1]&&leftA[1]===leftB[0];
      }
    }
    return false;
  }

  function correct(q,value){
    if(q.number!==undefined){
      const n=Number(String(value).replace(/,/g,""));
      return Number.isFinite(n)&&Math.abs(n-q.number)<=q.tolerance;
    }
    const entered=symbolicForms(value);
    return q.answers.some(answer=>{
      const accepted=symbolicForms(answer);
      return [...entered].some(form=>[...accepted].some(ok=>formsMatch(form,ok)));
    });
  }

  function stageBasicBank(){return Array.isArray(window.FINAL_MOCK_STAGE_BASIC_BANK)&&window.FINAL_MOCK_STAGE_BASIC_BANK.length?window.FINAL_MOCK_STAGE_BASIC_BANK:basicBank;}
  function chooseBasics(){const bank=stageBasicBank(),by=s=>shuffle(bank.filter(q=>q.section===s||q.sourceUnit===s));const chosen=["円運動","バネ","熱"].map(unit=>by(unit)[0]).filter(Boolean);return shuffle(chosen.concat(shuffle(bank.filter(q=>!chosen.includes(q))).slice(0,5-chosen.length)));}
  function comprehensiveBigBank(){return Array.isArray(window.FINAL_MOCK_BIG_BANK)&&window.FINAL_MOCK_BIG_BANK.length?window.FINAL_MOCK_BIG_BANK:null;}
  function chooseBigProblems(){const bank=comprehensiveBigBank();if(!bank)return [shuffle(big2)[0],shuffle(big3)[0]];const two=shuffle(bank.filter(q=>q.questions?.length===2))[0],three=shuffle(bank.filter(q=>q.questions?.length===3))[0];return shuffle([two,three].filter(Boolean));}
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
  function writtenPrompt(prompt){
    return String(prompt??"")
      .replace(/組合せとして最も近いものを選びなさい。/g,"組合せを答えなさい。")
      .replace(/のとき、(.+?) はどれですか。/g,"のとき、$1 を答えなさい。")
      .replace(/に最も近いものを選びなさい。/g,"に最も近い値を答えなさい。")
      .replace(/最も近いものを選びなさい。/g,"最も近い値を答えなさい。")
      .replace(/正しいものを選びなさい。/g,"正しい答えを書きなさい。")
      .replace(/正しい関係式を選びなさい。/g,"正しい関係式を書きなさい。")
      .replace(/正しい運動方程式を選びなさい。/g,"正しい運動方程式を書きなさい。")
      .replace(/正しい組合せを選びなさい。/g,"正しい組合せを答えなさい。")
      .replace(/組合せを選びなさい。/g,"組合せを答えなさい。")
      .replace(/(.*式.*?)を選びなさい。/g,"$1を書きなさい。")
      .replace(/式を選びなさい。/g,"式を書きなさい。")
      .replace(/公式を選びなさい。/g,"公式を書きなさい。")
      .replace(/を選びなさい。/g,"を答えなさい。")
      .replace(/どれですか。/g,"答えなさい。");
  }
  let items=[];
  function field(q,key,points,label){return `<article class="question" data-key="${key}" data-points="${points}"><div class="question-title">${label} <span class="points">（${points}点）</span></div><div class="prompt">${escapeHtml(writtenPrompt(q.prompt))}</div><div class="answer-row"><input class="answer" data-answer autocomplete="off" spellcheck="false" aria-label="${label}の解答"><span class="unit">${escapeHtml(q.unit||"")}</span></div><div class="feedback" data-feedback></div></article>`;}
  function start(){const id=$("#studentId").value.trim();if(!id){alert("学籍番号を入力してください。");return;}const basics=chooseBasics(),bigs=chooseBigProblems();items=[];$("#basicQuestions").innerHTML=basics.map((q,i)=>{const label=`小問${i+1}｜${q.section}`;items.push({q,key:q.id,points:3,label,kind:"小問"});return field(q,q.id,3,label);}).join("");let n=0;const notationGuide=`<div class="answer-example">数式の入力方法：r²は「r^2」「r2」でも可。v²は「v^2」「v2」でも可。√(a/b)は「√a/b」でも可。tanθは「sinθ/cosθ」でも可。求める量は「y=…」のように左辺を付けても可。運動方程式では等号を入力してください。</div>`;$("#bigQuestions").innerHTML=notationGuide+bigs.map((b,bi)=>`<section class="question big"><h2>大問${bi+1}｜${escapeHtml(b.title)}</h2><div class="big-context">${escapeHtml(b.context)}</div>${b.questions.map((q,qi)=>{n++;const key=b.id+"_"+n,label=`大問${bi+1} 設問(${qi+1})`;items.push({q,key,points:5,label,kind:"大問",title:b.title});return field(q,key,5,label);}).join("")}</section>`).join("");$("#startScreen").classList.add("hidden");$("#examScreen").classList.remove("hidden");$("#result").classList.add("hidden");$("#submitBtn").disabled=false;window.TrainerLog?.startSession();}
  function submit(){let score=0,wrong=[];items.forEach(item=>{const el=document.querySelector(`[data-key="${item.key}"]`),value=el.querySelector("[data-answer]").value,ok=correct(item.q,value),fb=el.querySelector("[data-feedback]"),prompt=`${item.label}｜${writtenPrompt(item.q.prompt)}`;if(ok)score+=item.points;else wrong.push(prompt);fb.className="feedback show "+(ok?"right":"wrong");fb.innerHTML=ok?`正解（${item.points}点）`:`不正解　正解：<strong>${item.q.display}</strong>`;el.querySelector("[data-answer]").disabled=true;window.TrainerLog?.recordQuestion({id:"MOCK_"+item.key,type:item.kind==="大問"?"final_mock_big":"final_mock_basic",question:prompt,answer:item.q.display},ok,{selected:value,prompt});});const elapsed=window.TrainerLog?.finishSession?.()||0;$("#scoreValue").textContent=score+" / 40点";$("#result").classList.remove("hidden");$("#submitBtn").disabled=true;const status=document.getElementById("sendStatus");if(status)status.textContent=`所要時間：${Math.floor(elapsed/60)}分${elapsed%60}秒。保存処理を開始しました。`;if(!window.TrainerLog||typeof window.TrainerLog.sendResult!=="function"){if(status)status.textContent="保存処理を開始できませんでした。Googleログイン版から開き直してください。";return;}window.TrainerLog.sendResult({score,total:40,extra:{examType:"期末試験模試",wrongQuestions:wrong,itemCount:items.length}});$("#result").scrollIntoView({behavior:"smooth"});}
  $("#startBtn").addEventListener("click",start);$("#submitBtn").addEventListener("click",submit);$("#againBtn").addEventListener("click",()=>location.reload());$("#studentId").addEventListener("keydown",e=>{if(e.key==="Enter")start();});
})();
