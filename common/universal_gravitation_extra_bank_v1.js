window.UNIVERSAL_GRAVITATION_EXTRA_PROBLEMS = [
  {
    id:"higherOrbit", title:"大問7　高い軌道へ移った衛星",
    statement:"人工衛星Aは地球中心から距離 r、人工衛星Bは距離 4r の円軌道を回っている。2つの衛星の速さと周期を比較せよ。",
    mainPrompt:"衛星Bの速さと周期は、衛星Aの何倍か答えよ。",
    mainChoices:["速さ1/2倍、周期8倍","速さ1/4倍、周期4倍","速さ2倍、周期2倍","速さ1/2倍、周期4倍"],
    mainAnswer:"速さ1/2倍、周期8倍",
    mainExplain:"v = √(GM/r) より速さは1/2倍。T = 2πr/v なので、周期は4÷(1/2) = 8倍です。",
    givens:[["衛星Aの軌道半径","r"],["衛星Bの軌道半径","4r"]],
    hint:"まず速度比を求め、その結果を周期の式へ入れます。",
    steps:[
      {id:"speedRatio",title:"設問(1)　軌道速度の比",prompt:"軌道半径が4倍になると、速度は何倍か答えよ。",type:"choice",choices:["1/2倍","1/4倍","2倍","4倍"],answer:"1/2倍",explain:"vは√rに反比例するので、1/√4 = 1/2倍です。"},
      {id:"periodRatio",title:"設問(2)　周期の比",prompt:"T = 2πr/v を使うと、周期は何倍か答えよ。",type:"choice",choices:["8倍","4倍","2倍","1/8倍"],answer:"8倍",explain:"半径が4倍、速度が1/2倍なので、周期は4÷(1/2) = 8倍です。"}
    ]
  },
  {
    id:"smallPlanetGravity", title:"大問8　小さな惑星の表面重力",
    statement:"惑星Xの質量は地球の2倍、半径は地球の1/2である。惑星Xの表面重力を地球と比較せよ。",
    mainPrompt:"惑星Xの表面重力は地球の何倍か答えよ。",
    mainChoices:["8倍","4倍","2倍","1/2倍"], mainAnswer:"8倍",
    mainExplain:"g = GM/R²。質量によって2倍、半径が1/2なのでその逆2乗によって4倍、合わせて8倍です。",
    givens:[["質量比","MX/M地球 = 2"],["半径比","RX/R地球 = 1/2"]],
    hint:"表面重力では、天体の中心から表面までの距離が半径になります。",
    steps:[
      {id:"formula",title:"設問(1)　表面重力の式",prompt:"天体の質量M、半径Rと表面重力gの関係を書け。",type:"choice",choices:["g = GM/R²","g = GM/R","g = GMR²","g = R²/GM"],answer:"g = GM/R²",explain:"万有引力F = GMm/R²を物体の質量mで割ります。"},
      {id:"radiusEffect",title:"設問(2)　半径の効果",prompt:"質量が同じで半径が1/2なら、表面重力は何倍か答えよ。",type:"choice",choices:["4倍","2倍","1/2倍","1/4倍"],answer:"4倍",explain:"重力は半径の2乗に反比例します。"},
      {id:"total",title:"設問(3)　質量比も含める",prompt:"質量が2倍で、半径の効果が4倍なら、表面重力は何倍か答えよ。",type:"choice",choices:["8倍","6倍","4倍","2倍"],answer:"8倍",explain:"2×4 = 8倍です。"}
    ]
  },
  {
    id:"moonAcceleration", title:"大問9　衛星の速さと向心加速度",
    statement:"ある衛星が半径 4.0×10⁸ m の円軌道を、周期 2.5×10⁶ s で公転している。速さと向心加速度を求めよ。",
    mainPrompt:"速さと向心加速度の組合せを答えよ。",
    mainChoices:["1.0 km/s、2.5×10⁻³ m/s²","1.0 km/s、2.5 m/s²","10 km/s、2.5×10⁻³ m/s²","0.10 km/s、2.5×10⁻⁴ m/s²"],
    mainAnswer:"1.0 km/s、2.5×10⁻³ m/s²",
    mainExplain:"v = 2πr/T ≒ 1.0×10³ m/s。a = v²/r ≒ 2.5×10⁻³ m/s²です。",
    givens:[["軌道半径","r = 4.0×10⁸ m"],["周期","T = 2.5×10⁶ s"]],
    hint:"1周の距離から速さを出し、その速さを向心加速度の式へ使います。",
    steps:[
      {id:"speed",title:"設問(1)　公転速度",prompt:"v = 2πr/T から、速さに最も近い値を答えよ。",type:"choice",choices:["1.0 km/s","10 km/s","0.10 km/s","100 km/s"],answer:"1.0 km/s",explain:"2π×4.0×10⁸÷2.5×10⁶ ≒ 1.0×10³ m/sです。"},
      {id:"accFormula",title:"設問(2)　向心加速度",prompt:"向心加速度を表す式を書け。",type:"choice",choices:["a = v²/r","a = vr","a = v/r²","a = r/v²"],answer:"a = v²/r",explain:"円運動の中心向き加速度はv²/rです。"},
      {id:"accValue",title:"設問(3)　加速度を計算",prompt:"v = 1.0×10³ m/sとして、向心加速度を求めよ。",type:"number",answer:0.0025,tolerance:0.0002,unit:"m/s²",explain:"(1.0×10³)²÷(4.0×10⁸) = 2.5×10⁻³ m/s²です。"}
    ]
  },
  {
    id:"earthMass", title:"大問10　衛星の運動から地球の質量を求める",
    statement:"人工衛星が地球中心から 7.0×10⁶ m の円軌道を、7.6×10³ m/sで回っている。G = 6.67×10⁻¹¹ N·m²/kg²として、地球の質量を求めよ。",
    mainPrompt:"地球の質量に最も近い値を答えよ。",
    mainChoices:["6.1×10²⁴ kg","6.1×10²² kg","4.0×10¹⁴ kg","8.0×10³¹ kg"], mainAnswer:"6.1×10²⁴ kg",
    mainExplain:"GMm/r² = mv²/r をMについて解くとM = v²r/G。代入すると約6.1×10²⁴ kgです。",
    givens:[["軌道半径","r = 7.0×10⁶ m"],["軌道速度","v = 7.6×10³ m/s"],["万有引力定数","G = 6.67×10⁻¹¹ N·m²/kg²"]],
    hint:"運動方程式では衛星の質量が消えます。残った式を地球の質量Mについて解きます。",
    steps:[
      {id:"equation",title:"設問(1)　運動方程式",prompt:"万有引力を向心力とした式を書け。",type:"choice",choices:["GMm/r² = mv²/r","GMm/r = mv²/r","GM/r² = mv²/r","GMm/r² = mvr"],answer:"GMm/r² = mv²/r",explain:"人工衛星にはたらく万有引力が向心力です。"},
      {id:"solve",title:"設問(2)　Mについて解く",prompt:"地球の質量Mを表す式を書け。",type:"choice",choices:["M = v²r/G","M = Gr/v²","M = v²/Gr","M = Gv²r"],answer:"M = v²r/G",explain:"衛星の質量mを消し、Mについて整理します。"},
      {id:"value",title:"設問(3)　数値を代入",prompt:"地球の質量を10²⁴ kg単位で答えよ。",type:"number",answer:6.1,tolerance:0.2,unit:"×10²⁴ kg",explain:"(7.6×10³)²×7.0×10⁶÷(6.67×10⁻¹¹) ≒ 6.1×10²⁴ kgです。"}
    ]
  }
];
