(function(root){
'use strict';
const C=typeof module!=='undefined'?require('./career.js'):root.Career;
const V=typeof module!=='undefined'?require('./civic.js'):root.Civic;
const S=typeof module!=='undefined'?require('./staffing.js'):root.Staffing;
const P=typeof module!=='undefined'?require('./profile.js'):root.Profile;
const W=18,H=14,clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const TYPES={
 service:{name:'政务服务站',cost:110,up:2,icon:'服',desc:'增加 10 人办公容量；须接入主干路，建设 2 个月。不会自动产生编制或人员。'},
 road:{name:'道路',cost:8,up:0.2,icon:'═',desc:'连接地块与镇中心。建成后立即通行。'},
 home:{name:'住宅',cost:65,up:1,icon:'住',capacity:650,desc:'容纳 650 人；需要连接道路，建设 1 个月。'},
 shop:{name:'商业',cost:95,up:2,icon:'商',jobs:280,output:120,desc:'提供 280 个岗位、120 万月产值；建设 1 个月。'},
 factory:{name:'工业',cost:150,up:4,icon:'工',jobs:650,output:240,desc:'提供 650 个岗位、240 万月产值，增加污染；建设 2 个月。'},
 school:{name:'学校',cost:180,up:6,icon:'学',desc:'每所覆盖 3000 人，需要教师；建设 2 个月。'},
 clinic:{name:'医院',cost:220,up:8,icon:'医',desc:'每所覆盖 3000 人，需要医生；建设 2 个月。'},
 park:{name:'公园',cost:85,up:2,icon:'园',desc:'降低污染并改善居住体验；建设 1 个月。'},
 power:{name:'电站',cost:240,up:7,icon:'电',desc:'增加 7000 人供电容量；建设 2 个月。'},
 water:{name:'水厂',cost:190,up:5,icon:'水',desc:'增加 7000 人供水容量；建设 2 个月。'},
 tech:{name:'科技园',cost:420,up:12,icon:'研',jobs:850,output:440,desc:'教育覆盖达 60% 可建设及运营；建设 3 个月。'}
};
const EVENTS=[
 {title:'老街积水，居民来信',body:'连续降雨暴露出老街排水问题。居民希望在下一个汛期前完成整治。',choices:[['修缮排水 · 90 万',90,5,2,0],['先做临时疏通 · 25 万',25,1,0,0],['暂缓处置 · 满意度 −4',0,-4,-2,0]]},
 {title:'企业申请绿色改造',body:'本地工厂愿意更换生产设备，希望财政给予一次性补助。',choices:[['补助改造 · 80 万',80,2,2,-7],['技术指导 · 15 万',15,1,1,-2],['由企业自行承担',0,-1,0,0]]},
 {title:'社区周末课堂',body:'教师提出开放周末公益课堂，为流动家庭提供课后服务。',choices:[['购买公益服务 · 45 万',45,4,2,0],['组织志愿者 · 12 万',12,1,1,0],['暂不开展',0,-2,0,0]]},
 {title:'招商接待中的礼品',body:'一家企业在项目洽谈时留下了贵重礼品。办公室请你决定如何处理。',choices:[['登记退回 · 声誉 +3',0,1,3,0],['移交监督部门 · 10 万',10,1,5,0],['默许收下 · 留下责任记录',0,0,-10,0,'risk']]},
 {title:'青年人才租房难',body:'新入职青年反映租金上涨，希望获得过渡性安居支持。',choices:[['发放阶段补贴 · 65 万',65,4,2,0],['提供租房咨询 · 10 万',10,1,0,0],['等待市场调整',0,-3,-1,0]]},
 {title:'公共设施安全检查',body:'近期巡查发现部分设施需要维护。及时投入可以降低后续风险。',choices:[['全面检修 · 70 万',70,3,3,0],['先检修重点点位 · 25 万',25,1,1,0],['压后检查 · 留下责任记录',0,-1,-3,0,'risk']]}
,{title:'干部队伍年度考察',branch:'party',body:'组织部门反馈，班子成员的履职情况需要形成年度考察材料。你需要在干事担当、程序质量和风险控制之间作出安排。',choices:[['深入谈话与实地核验 · 20 万',20,2,4,0],['按台账集中审核 · 5 万',5,0,1,0],['压缩程序赶进度 · 留下责任记录',0,-2,-5,0,'risk']]}
,{title:'重点项目联席协调',branch:'government',body:'重点项目涉及交通、环保和企业服务多个部门，部门之间出现了时间表冲突。',choices:[['现场协调并调整时序 · 35 万',35,3,3,-2],['专班会商 · 12 万',12,1,2,-1],['交由部门自行协商',0,-2,-2,0,'risk']]}
];
const AGENDAS={
 industry:{name:'产业升级',desc:'把就业、招商和产业产出作为年度主线。',score:(s,m)=>clamp(m.employment*.7+Math.min(100,m.enterprise.jobs/8))},
 livelihood:{name:'民生补短',desc:'集中补足教育、医疗和居民保障。',score:(s,m)=>clamp((m.education+m.health+G.Civic.index(s))/3)},
 risk:{name:'风险化解',desc:'优先减少欠款、债务和事件积压。',score:(s,m)=>clamp(100-Math.min(100,m.debtRatio)-Math.min(35,s.payables/3)-s.events.length*8)},
 ecology:{name:'生态治理',desc:'降低污染，同时保证基础设施稳定。',score:(s,m)=>clamp(100-s.pollution+m.utility*20)}
};
function initial(roleId='town',mode='career'){
 const cells=Array.from({length:W*H},(_,i)=>({type:(i%W===14||i%W===15)?'river':'empty',wait:0}));
 for(let x=0;x<W;x++)cells[7*W+x]={type:'road',wait:0};
 for(let y=2;y<12;y++)cells[y*W+7]={type:'road',wait:0};
 [[6,6,'hall'],[5,6,'home'],[4,6,'home'],[8,6,'home'],[9,6,'shop'],[5,8,'factory'],[8,8,'park']].forEach(([x,y,type])=>cells[y*W+x]={type,wait:0});
 const career=C.init(roleId,mode);return {version:7,profile:P.init(),agenda:null,establishment:S.init(),civic:V.init(),width:W,height:H,month:0,cash:1500,debt:0,reserve:0,pop:1450,happiness:65,reputation:70,pollution:12,staff:{admin:8,teachers:0,doctors:0},policy:{tax:10,welfare:50,reserve:3},cells,seed:7321,events:[],log:[{month:0,text:'已就任'+C.current({career}).title+'。职业生涯最长 35 年，每五年归档阶段报告。'}],history:[],reviews:[],risks:[],level:C.current({career}).tier,arrears:0,annualGap:false,ended:null,last:null,budget:{limit:900,spent:0},recruitment:[],projects:[],loans:[],specialCash:0,projectReserve:0,payables:0,goodYears:0,career};
}
function neighbors(s,i){const W=s.width||18,H=s.height||14,x=i%W,y=Math.floor(i/W);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<W&&b>=0&&b<H).map(([a,b])=>b*W+a);}
function roads(s){const reached=new Set(),queue=[];s.cells.forEach((c,i)=>{if(c.type==='hall')neighbors(s,i).forEach(j=>{if(s.cells[j].type==='road'){queue.push(j);reached.add(j);}})});for(let q=0;q<queue.length;q++)neighbors(s,queue[q]).forEach(j=>{if(s.cells[j].type==='road'&&!reached.has(j)){reached.add(j);queue.push(j);}});return reached;}
function metrics(s){
 const linked=roads(s),count={};s.cells.forEach((c,i)=>{if(c.wait===0&&neighbors(s,i).some(j=>linked.has(j)))count[c.type]=(count[c.type]||0)+1;});
 const education=clamp(Math.min((count.school||0)*3000,s.staff.teachers*180)/s.pop*100),health=clamp(Math.min((count.clinic||0)*3000,s.staff.doctors*160)/s.pop*100);
 const utility=Math.min(1,(2200+(count.power||0)*7000)/s.pop,(2200+(count.water||0)*7000)/s.pop);
 let jobs=0,output=0;s.cells.forEach((c,i)=>{let t=TYPES[c.type];if(t&&c.wait===0&&neighbors(s,i).some(j=>linked.has(j))&&(c.type!=='tech'||education>=60)){jobs+=t.jobs||0;output+=t.output||0;}});
 const enterprise=V.effects(s,linked,education,utility);jobs+=enterprise.jobs;output+=enterprise.output;
 const employment=clamp(jobs/(s.pop*.48)*100),gdp=(180+output*Math.min(1,s.pop*.48/Math.max(1,jobs)))*utility;
 const adminEfficiency=Math.min(1,Math.min(s.staff.admin,S.officeCapacity(s,count))*220/s.pop);
 // 综合税收归属系数为模拟参数，不能被玩家任意调整；基层行政人员不等同于税务机关。
 const tax=gdp*.10,grant=38+s.pop*.008,income=tax+grant;
 const wages=s.staff.admin*1.2+s.staff.teachers*1.3+s.staff.doctors*1.5;
 const upkeep=s.cells.reduce((n,c)=>n+(c.wait===0&&c.owner!=='private'?(TYPES[c.type]?.up||0):0),0);
 const policyCost=V.policyCost(s),commitmentCost=V.installment(s),welfare=s.pop/1000*s.policy.welfare*.32+policyCost,legacyInterest=s.debt*.065/12,reserve=income*s.policy.reserve/100;
 const specialDebt=s.loans.reduce((n,l)=>n+l.balance,0),specialInterest=specialDebt*.028/12;
 const projectRevenue=s.cells.reduce((n,c,i)=>n+(c.funding==='special'&&c.wait===0&&neighbors(s,i).some(j=>linked.has(j))?(c.type==='water'?8:10)*Math.min(1,s.pop/3000):0),0);
 const specialPrincipal=s.loans.filter(l=>l.due<=s.month+1).reduce((n,l)=>n+l.balance,0);
 const fundAvailable=s.projectReserve+projectRevenue,specialService=specialInterest+specialPrincipal;
 const generalService=Math.max(0,specialService-fundAvailable),interest=legacyInterest+Math.max(0,specialInterest-fundAvailable);
 const operating=wages+upkeep+welfare,expense=operating+commitmentCost+legacyInterest+generalService+s.payables+reserve;
 return {enterprise,policyCost,commitmentCost,count,education,health,utility,employment,gdp,income,tax,grant,wages,upkeep,welfare,interest,legacyInterest,specialInterest,specialDebt,projectRevenue,specialPrincipal,generalService,reserve,adminEfficiency,operating,expense,balance:income-expense,capacity:Math.max(800,(count.home||0)*650),debtRatio:(s.debt+specialDebt)/Math.max(1,income*12)*100,linked};
}
function log(s,text){s.log.unshift({month:s.month,text});s.log=s.log.slice(0,150);}
function agendaScore(s,m,id=s.agenda?.id){return id&&AGENDAS[id]?AGENDAS[id].score(s,m):null;}
function setAgenda(s,id){if(s.ended)return '任期已结束。';if(!AGENDAS[id])return '未知年度重点工作。';if(s.agenda)return '本年度重点工作已经确定，年末后再选择新的主线。';s.agenda={id,year:Math.floor(s.month/12)+1,lastScore:null};log(s,'确定第 '+s.agenda.year+' 年重点工作：'+AGENDAS[id].name+'。');return null;}
function eventKind(s){const branch=C.current(s).branch;const eligible=EVENTS.map((e,i)=>!e.branch||e.branch===branch?i:null).filter(i=>i!==null);return eligible[s.seed%eligible.length];}
function build(s,i,type,funding='general'){
 if(s.ended)return '任期已结束，请开启新任期。';
 if(s.level>0)return '县级以上请通过辖区治理提交方案；基层联系点地图仅作观察。';
 if(!Number.isInteger(i)||i<0||i>=s.cells.length)return '无效地块。';
 const locked=V.lock(s,i);if(locked)return locked;
 const c=s.cells[i];if(s.projects.some(p=>p.cell===i))return '该地块已有待审批项目。';if(type==='demolish'){if(!TYPES[c.type])return '此地块无法拆除。';if(c.funding==='special'&&(c.wait>0||s.loans.some(l=>l.cell===i&&l.balance>0)))return '专项债项目建设期或未清偿期间，不可直接拆除。';if(s.cash<10)return '拆除需要 10 万。';s.cash-=10;s.cells[i]={type:[14,15].includes(i%s.width)?'river':'empty',wait:0};log(s,'拆除'+TYPES[c.type].name+'，支出 10 万。');return null;}
 const t=TYPES[type];if(!t)return '请选择建设工具。';if(c.type!=='empty'&&!(c.type==='river'&&type==='road'))return '地块已有建筑，请先拆除。';
 if(type==='tech'&&metrics(s).education<60)return '科技园需要教育覆盖达到 60%。';
 if(type!=='road'&&!neighbors(s,i).some(j=>roads(s).has(j)))return '请先连接通往镇中心的道路。';
 const cost=t.cost*(c.type==='river'?3:1),m=metrics(s);
 if(!['general','special','land'].includes(funding))return '无效资金来源。';
 if(funding==='special'){
  if(!['water','power'].includes(type))return '本版仅可为有收费收入的水厂、电站申报专项债项目。';
  if(s.projects.length>=2)return '已有两项申报待审核，请等待反馈。';
  if(m.debtRatio>=70||s.annualGap||s.payables>0)return '当前偿债或三保压力较高，项目申报暂缓。';
  s.projects.push({cell:i,type,cost,due:s.month+2});log(s,'上报'+t.name+'项目，等待上级审核与额度安排（模拟 2 个月）。');return null;
 }
 if(s.budget.spent+cost>s.budget.limit)return '超出年度建设预算，请等下一年度预算安排。';
 if(funding==='land'){if(!['road','home','school','clinic','park','power','water'].includes(type))return '土地建设专账仅用于公共设施、道路与保障住房。';if(s.civic.landFund<cost)return '土地建设专账余额不足。';s.civic.landFund-=cost;s.civic.landSpent+=cost;s.budget.spent+=cost;s.cells[i]={type,wait:type==='road'?0:['school','clinic','power','water'].includes(type)?2:1};log(s,'土地建设专账支付 '+cost+' 万建设'+t.name+'。');return null;}
 if(s.cash<cost)return '财政不足，请调整建设计划。';
 if(s.cash-cost<m.operating*3||s.payables>0)return '建设后不足三个月基本运转资金，或仍有欠款，请先保障基本支出。';
 s.cash-=cost;s.budget.spent+=cost;s.cells[i]={type,wait:type==='road'?0:type==='tech'?3:['school','clinic','factory','power','water','service'].includes(type)?2:1,funding:'general'};log(s,'启动'+t.name+'建设，支出 '+cost+' 万，计入年度建设预算。');return null;
}
// 扩展只改变城市可规划范围，不赠送资金、人口或道路。
function expand(s,width,height){
 if(s.ended)return '职业生涯已结束。';
 if(s.level>0)return '县级以上的基层联系点只读，请在乡镇岗位扩建地图。';
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<s.width||height<s.height||width>64||height>64||width===s.width&&height===s.height)return '请选择更大的尺寸，上限 64×64，不可缩小。';
 const old=s.width, remap=i=>Math.floor(i/old)*width+i%old;
 const cells=Array.from({length:width*height},(_,i)=>({type:[14,15].includes(i%width)?'river':'empty',wait:0}));
 s.cells.forEach((c,i)=>cells[remap(i)]=c);
 for(const list of [s.projects,s.loans])for(const item of list)item.cell=remap(item.cell);
 V.remap(s,remap);s.cells=cells;s.width=width;s.height=height;
 log(s,'规划范围扩展至 '+width+'×'+height+' 格；原有建筑、项目及债务留账。');return null;
}
function finance(s,action){if(s.ended)return '任期已结束。';if(action==='borrow')return '基层不直接发债。请在建设栏选择项目专项资金，再选择水厂或电站申报。';
 if(action==='repay'){const amount=Math.min(200,s.debt);if(!amount)return '当前没有存量融资债务；专项债按项目到期计划清偿。';if(s.cash+s.reserve<amount)return '可用财政与准备金不足。';let r=Math.min(s.reserve,amount);s.reserve-=r;s.cash-=amount-r;s.debt-=amount;log(s,'偿还存量本金 '+amount+' 万，其中准备金 '+r.toFixed(1)+' 万。');}else return '未知操作。';return null;}
function hire(s,role,delta){if(s.level>0)return '基层联系点人事只读，请通过本级辖区治理安排服务。';if(s.ended)return '任期已结束。';if(!['admin','teachers','doctors'].includes(role)||![-1,1].includes(delta))return '无效人事操作。';
 const pending=s.recruitment.filter(r=>r.role===role&&r.delta<0).length;
 if(delta<0&&s.staff[role]-pending<=0)return '无可调出人员，或已在办理调出。';
 if(s.recruitment.length>=200)return '人员办理队列已满，请等待现有手续办结。';
 if(delta>0){if(S.used(s,role)>=s.establishment.quotas[role])return '该类别核定编制已满（含待到岗），请申请分类增编；不同类别不得挤占。';if(s.cash<8)return '办理招录需支出 8 万。';s.cash-=8;}
 s.recruitment.push({role,delta,due:s.month+(delta>0?2:3)});log(s,(delta>0?'已提交招录申请，2 个月后到岗':'已提交调出申请，3 个月后办理；期间继续发薪')+'。');return null;}
function resolve(s,id,choice){if(s.ended)return '任期已结束。';const e=s.events.find(e=>e.id===id);if(!e)return '事件已处理。';const option=EVENTS[e.kind].choices[choice];if(!option)return '无效选择。';const [label,cost,h,r,p,risk]=option;if(s.cash<cost)return '财政不足以执行该方案。';s.cash-=cost;s.happiness=clamp(s.happiness+h);s.reputation=clamp(s.reputation+r);s.pollution=clamp(s.pollution+p);if(risk)s.risks.push({month:s.month,title:EVENTS[e.kind].title,due:s.month+6});s.events=s.events.filter(v=>v.id!==id);log(s,EVENTS[e.kind].title+'：'+label);return null;}
function next(s){
 if(s.ended)return '任期已结束。';
 const m=metrics(s);let available=s.cash+m.income,gap=0;const paid={};
 let projectFunds=s.projectReserve+m.projectRevenue;
 const fundInterest=Math.min(projectFunds,m.specialInterest);projectFunds-=fundInterest;
 const fundPrincipal=Math.min(projectFunds,m.specialPrincipal);projectFunds-=fundPrincipal;s.projectReserve=projectFunds;
 const interestCost=m.legacyInterest+m.specialInterest-fundInterest,principalCost=m.specialPrincipal-fundPrincipal;
 for(const [key,cost] of [['wages',m.wages],['upkeep',m.upkeep],['welfare',m.welfare],['interest',interestCost],['principal',principalCost],['payables',s.payables],['commitments',m.commitmentCost],['reserve',m.reserve]]){paid[key]=Math.min(available,cost);available-=paid[key];if(!['reserve','commitments'].includes(key))gap+=cost-paid[key];}
 let principalPaid=fundPrincipal+paid.principal;
 for(const loan of s.loans.filter(l=>l.due<=s.month+1)){const amount=Math.min(principalPaid,loan.balance);loan.balance-=amount;principalPaid-=amount;}
 const basicGap=m.wages-paid.wages+m.upkeep-paid.upkeep+m.welfare-paid.welfare;
 s.payables=s.payables-paid.payables+basicGap+interestCost-paid.interest;
 s.cash=available;s.reserve+=paid.reserve;
 s.annualGap ||= basicGap>0;s.arrears=gap>0?s.arrears+1:0;
 const target=clamp(35+V.index(s)*.06-Math.max(0,V.dependency(s)-45)*.06+m.employment*.2+m.education*.14+m.health*.16+s.policy.welfare*.15+Math.min(8,(m.count.park||0)*2)-s.pollution*.22-(1-m.adminEfficiency)*12-(1-m.utility)*30);
 s.happiness=clamp(s.happiness+(target-s.happiness)*.16-(gap>0?6:0));
 s.pollution=clamp(s.pollution+(m.count.factory||0)*1.6-(m.count.park||0)*1.4-0.5);
 const growth=clamp((s.happiness-45)/1800+(m.employment-70)/3500-(1-m.adminEfficiency)*.01,-.035,.03);
 s.pop=Math.max(300,Math.round(Math.min(m.capacity,s.pop*(1+growth))));
 s.month++;
 // 专项债建设款只能支付已核准项目工程，不进入可用财政。
 s.cells.forEach(c=>{if(c.wait>0){if(c.funding==='special'){const amount=c.escrow/c.wait;s.specialCash=Math.max(0,s.specialCash-amount);c.escrow=Math.max(0,c.escrow-amount);}c.wait--;}});
 const done=s.recruitment.filter(r=>r.due<=s.month);s.recruitment=s.recruitment.filter(r=>r.due>s.month);
 done.forEach(r=>{s.staff[r.role]+=r.delta;log(s,({admin:'行政人员',teachers:'教师',doctors:'医生'}[r.role])+(r.delta>0?'已到岗。':'已办结调出。'));});
 const proposals=s.projects.filter(p=>p.due<=s.month);s.projects=s.projects.filter(p=>p.due>s.month);
 for(const p of proposals){const current=metrics(s);if(current.debtRatio>=70||s.annualGap||s.payables>0||(s.budget.specialIssued||0)+p.cost>600||s.cells[p.cell].type!=='empty'||!neighbors(s,p.cell).some(j=>current.linked.has(j))){log(s,TYPES[p.type].name+'申报退回：额度、偿债能力、地块或路网条件未通过审核。');continue;}
 s.budget.specialIssued=(s.budget.specialIssued||0)+p.cost;s.specialCash+=p.cost;s.loans.push({cell:p.cell,balance:p.cost,due:s.month+36});s.cells[p.cell]={type:p.type,wait:2,funding:'special',escrow:p.cost};log(s,TYPES[p.type].name+'获得上级安排专项资金 '+p.cost+' 万，专款入账；开始两个月建设，36 个月后还本。');}
 S.tick(s,metrics,log);
 V.tick(s,m,paid.commitments,log);
 const expired=s.events.filter(e=>e.deadline<=s.month);s.events=s.events.filter(e=>e.deadline>s.month);if(expired.length){s.happiness=clamp(s.happiness-expired.length*3);log(s,expired.length+' 件事件逾期，满意度下降。');}
 s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;
 if(s.month%2===0&&s.events.length<4)s.events.push({id:s.month,kind:eventKind(s),deadline:s.month+3});
 s.risks.forEach(r=>{if(r.due===s.month){s.reputation=clamp(s.reputation-12);log(s,'审计追责：'+r.title+'，声誉 −12。');}});
 s.last={...m,linked:undefined,gap,basicGap,paid,projectPaid:fundInterest+fundPrincipal,actualBalance:m.income-Object.values(paid).reduce((a,b)=>a+b,0)};
 s.history.push({month:s.month,cash:s.cash,pop:s.pop,happiness:s.happiness,gdp:m.gdp});s.history=s.history.slice(-60);
 log(s,'月度结算：收入 '+m.income.toFixed(1)+' 万，实际支出 '+Object.values(paid).reduce((a,b)=>a+b,0).toFixed(1)+' 万'+(gap>0?'，资金缺口 '+gap.toFixed(1)+' 万。':'。'));
 // 持续合格履职会积累声誉，长期低分则会消耗组织信任；声誉不会凭空跳涨。
 if(s.month%12===0){const prior=s.reviews.at(-1);if(prior){if(prior.score>=65)s.reputation=clamp(s.reputation+1.5);else if(prior.score>=50)s.reputation=clamp(s.reputation+.5);else s.reputation=clamp(s.reputation-1);}}
 if(s.month%12===0){let score=clamp(s.happiness*.2+s.reputation*.2+m.employment*.15+m.education*.15+m.health*.15+(100-s.pollution)*.15-Math.max(0,m.debtRatio-40)*.3-(s.annualGap?20:0));score=clamp(score+V.index(s)*.03+s.civic.scoreAdjustment);if(s.level>0)score=clamp(C.macroScore(s)*.75+s.reputation*.25-(C.world(s).cash<0?20:0));let agendaResult=null;if(s.agenda){agendaResult=agendaScore(s,m);score=clamp(score+(agendaResult-50)*.12);s.agenda.lastScore=agendaResult;log(s,'年度重点工作“'+AGENDAS[s.agenda.id].name+'”完成度 '+agendaResult.toFixed(0)+' 分。');s.agenda=null;}const grade=score>=80?'优秀':score>=65?'良好':score>=50?'合格':'不合格';s.reviews.push({year:s.month/12,score,grade,role:s.career.role,agenda:agendaResult});log(s,'年度考核 '+grade+'（'+score.toFixed(0)+' 分）。');s.goodYears=score>=75&&!s.annualGap?s.goodYears+1:0;s.annualGap=false;s.budget={limit:Math.max(300,Math.round(Math.max(0,s.cash-m.operating*3)*.5+m.income*2)),spent:0,specialIssued:0};log(s,'新年度基层样本建设预算 '+s.budget.limit+' 万。');}
 if(s.level===0&&s.arrears>=3)s.ended='连续三个月资金缺口，任期提前结束。';else if(s.level===0&&s.happiness<20)s.ended='居民满意度过低，任期提前结束。';else if(s.reputation<20)s.ended='声誉跌破底线，任期提前结束。';
 C.tick(s,log);
 P.tick(s,log);
 if(s.month>=C.LIMIT)s.ended='35 年职业生涯完成，中央到地方的治理履历已归档。';return null;
}
function validate(s){
 if(!s||![1,2,3,4,5,6,7].includes(s.version)||!Array.isArray(s.cells))throw Error('存档版本或地图格式不正确。');

 if(s.version<5)s.civic=V.init();
 if(s.version<4){s.width=W;s.height=H;}
 if(!Number.isInteger(s.width)||!Number.isInteger(s.height)||s.width<W||s.height<H||s.width>64||s.height>64||s.cells.length!==s.width*s.height)throw Error('地图尺寸不正确，范围为 18×14 至 64×64。');
 if(s.version===1){s.version=2;s.budget={limit:900,spent:0};s.recruitment=[];s.projects=[];s.loans=[];s.specialCash=0;s.projectReserve=0;s.payables=0;s.goodYears=0;s.policy={...s.policy,tax:10};s.last=null;}
 for(const k of ['month','cash','debt','reserve','pop','happiness','reputation','pollution','seed','level','arrears'])if(!Number.isFinite(s[k])||s[k]<0)throw Error('存档数值不正确。');
 if(!Number.isInteger(s.month)||s.month>C.LIMIT||![0,1,2,3,4].includes(s.level)||s.pop<300)throw Error('存档进度不正确。');
 if(s.version===2){s.version=3;s.career=C.init(['town','county','city','province','premier'][s.level],'career',s.month);if(typeof s.ended==='string'&&s.ended.startsWith('五年任期完成'))s.ended=null;}
 for(const c of s.cells)if(!c||!['empty','river','hall',...Object.keys(TYPES)].includes(c.type)||!Number.isInteger(c.wait)||c.wait<0||c.wait>3)throw Error('地块数据不正确。');
 if(s.cells.filter(c=>c.type==='hall').length!==1)throw Error('缺少城镇中心。');
 for(const k of ['admin','teachers','doctors'])if(!Number.isInteger(s.staff?.[k])||s.staff[k]<0||s.staff[k]>1000)throw Error('人员数据不正确。');
 for(const [k,a,b] of [['tax',5,18],['welfare',10,100],['reserve',0,8]])if(!Number.isFinite(s.policy?.[k])||s.policy[k]<a||s.policy[k]>b)throw Error('政策数据不正确。');
 for(const k of ['events','log','history','reviews','risks'])if(!Array.isArray(s[k])||s[k].length>500)throw Error('记录格式不正确。');
 if(s.events.some(e=>!Number.isInteger(e.id)||!Number.isInteger(e.kind)||!EVENTS[e.kind]||!Number.isInteger(e.deadline)))throw Error('事件格式不正确。');
 if(s.log.some(e=>typeof e.text!=='string'||!Number.isFinite(e.month)))throw Error('日志格式不正确。');
 if(s.history.some(e=>!['month','cash','pop','happiness','gdp'].every(k=>Number.isFinite(e[k]))))throw Error('历史数据不正确。');
 if(s.reviews.some(e=>!Number.isFinite(e.year)||!Number.isFinite(e.score)||typeof e.grade!=='string')||s.risks.some(e=>typeof e.title!=='string'||!Number.isInteger(e.due)||!Number.isInteger(e.month)))throw Error('履历格式不正确。');
 if(s.ended!==null&&typeof s.ended!=='string')throw Error('结局格式不正确。');
 for(const k of ['specialCash','projectReserve','payables','goodYears'])if(!Number.isFinite(s[k])||s[k]<0)throw Error('财政扩展数据不正确。');
 if(!s.budget||!Number.isFinite(s.budget.limit)||!Number.isFinite(s.budget.spent)||s.budget.limit<0||s.budget.spent<0||s.budget.spent>s.budget.limit||!Number.isFinite(s.budget.specialIssued??0)||(s.budget.specialIssued??0)<0)throw Error('预算数据不正确。');
 if(!Array.isArray(s.recruitment)||s.recruitment.length>200||s.recruitment.some(r=>!['admin','teachers','doctors'].includes(r.role)||![-1,1].includes(r.delta)||!Number.isInteger(r.due)||r.due<=s.month))throw Error('人事进度不正确。');
 for(const role of ['admin','teachers','doctors'])if(s.recruitment.filter(r=>r.role===role&&r.delta===-1).length>s.staff[role])throw Error('调出人数超过在岗人数。');
 if(!Array.isArray(s.projects)||s.projects.length>2||s.projects.some(p=>!['water','power'].includes(p.type)||!Number.isInteger(p.cell)||p.cell<0||p.cell>=s.cells.length||p.cost!==TYPES[p.type].cost||!Number.isInteger(p.due)||p.due<=s.month)||new Set(s.projects.map(p=>p.cell)).size!==s.projects.length)throw Error('申报数据不正确。');
 if(!Array.isArray(s.loans)||s.loans.length>300||s.loans.some(l=>!Number.isInteger(l.cell)||l.cell<0||l.cell>=s.cells.length||!Number.isFinite(l.balance)||l.balance<0||!Number.isInteger(l.due)||l.due<0))throw Error('专项债务数据不正确。');
 if(s.cells.some(c=>c.funding!==undefined&&!['general','special'].includes(c.funding)||c.funding==='special'&&(!['water','power'].includes(c.type)||!Number.isFinite(c.escrow)||c.escrow<0)))throw Error('工程资金数据不正确。');
 const escrow=s.cells.reduce((n,c)=>n+(c.funding==='special'?c.escrow:0),0);if(Math.abs(escrow-s.specialCash)>.01)throw Error('专项资金与工程台账不一致。');
 if(s.cells.some(c=>c.owner!==undefined&&!['public','private'].includes(c.owner)))throw Error('建筑权属不正确。');
 if(s.version<6)s.establishment=S.init(s);
 if(s.version<7)s.profile=P.init();
 if(s.agenda===undefined)s.agenda=null;
 if(s.agenda!==null&&(!s.agenda||!AGENDAS[s.agenda.id]||!Number.isInteger(s.agenda.year)||s.agenda.year<1||s.agenda.year>36||s.agenda.lastScore!==null&&!Number.isFinite(s.agenda.lastScore)))throw Error('年度重点工作数据不正确。');
 s.version=7;P.validate(s);S.validate(s);V.validate(s);C.validate(s);return s;
}
const api={Profile:P,AGENDAS,agendaScore,setAgenda,personalCare:s=>P.care(s),buyHouse:s=>P.buyHouse(s),buyCar:s=>P.buyCar(s),Staffing:S,requestQuota:(s,k,n)=>S.request(s,k,n,metrics(s),log),upgradeOffice:s=>S.upgrade(s,metrics(s),log),Civic:V,W,H,expand,neighbors,TYPES,EVENTS,initial,metrics,build,finance,hire,resolve,next,validate,Career:C,applyRole:(s,id)=>C.apply(s,id,log),train:s=>C.train(s,log),rotate:s=>C.rotate(s,log),propose:(s,id,kind)=>C.propose(s,id,kind,log)};if(typeof module!=='undefined')module.exports=api;else root.Game=api;
})(typeof globalThis!=='undefined'?globalThis:this);
