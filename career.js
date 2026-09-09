(function(root){
'use strict';
const LIMIT=420,clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const TIERS=['乡镇','县区','地市','省级','中央'];
const GRADES=['乡科级副职','乡科级正职','县处级副职','县处级正职','厅局级副职','厅局级正职','省部级副职','省部级正职','国家级副职','国家级正职'];
const role=(id,title,tier,grade,branch,deputy=false)=>({id,title,tier,grade,branch,deputy});
const ROLES=[
 role('viceTown','副镇长',0,0,'government',true),role('town','镇长',0,1,'government'),role('townParty','镇党委书记',0,1,'party'),
 role('viceCounty','副县长',1,2,'government',true),role('county','县长',1,3,'government'),role('countyParty','县委书记',1,3,'party'),
 role('viceCity','副市长',2,4,'government',true),role('city','市长',2,5,'government'),role('cityParty','市委书记',2,5,'party'),
 role('viceProvince','副省长',3,6,'government',true),role('province','省长',3,7,'government'),role('provinceParty','省委书记',3,7,'party'),
 role('viceMinister','副部长',4,6,'government',true),role('minister','部长',4,7,'government'),
 role('vicePremier','国务院副总理',4,8,'government',true),role('premier','国务院总理',4,9,'government'),
 role('secretariat','中央书记处书记',4,8,'party'),role('standing','中央政治局常委',4,9,'party'),role('generalSecretary','中共中央总书记',4,9,'party')
];
const byId=id=>ROLES.find(r=>r.id===id);
const PATHS={viceTown:['town'],town:['townParty','viceCounty'],townParty:['town','viceCounty'],viceCounty:['county'],county:['countyParty','viceCity'],countyParty:['county','viceCity'],viceCity:['city'],city:['cityParty','viceProvince','viceMinister'],cityParty:['city','viceProvince','viceMinister'],viceProvince:['province','viceMinister'],province:['provinceParty','minister','vicePremier'],provinceParty:['province','minister','secretariat'],viceMinister:['minister','viceProvince'],minister:['province','vicePremier'],vicePremier:['premier'],premier:[],secretariat:['standing'],standing:['generalSecretary'],generalSecretary:[]};
const INSTITUTIONS=[
 {name:'党委与党的组织',scope:'中央及地方、基层党组织',kind:'party',text:'研究重大方向、统筹协调和组织工作；党的组织与国家机关不能混为同一条行政任命链。'},
 {name:'人民代表大会及其常委会',scope:'中央、地方；乡镇人大不设常委会',kind:'congress',text:'行使相应国家权力，审查预算并开展监督；有关国家机关人选依规定选举或决定。'},
 {name:'国务院与地方人民政府',scope:'中央行政机关和地方各级政府',kind:'government',text:'组织行政执行、公共服务和经济社会事务。地方正副行政首长由本级人大选举，中央有关职位按宪法规定产生。'},
 {name:'中华人民共和国主席',scope:'中央国家机构',kind:'president',text:'依宪法行使国家主席职权；全国人大选举产生，不是省长或总理的普通下一晋升级别。'},
 {name:'政协',scope:'全国及地方政协组织',kind:'consultation',text:'开展政治协商、民主监督、参政议政。不是国家行政机关，不作为政府上下级链条。'},
 {name:'纪律检查机关与监察委员会',scope:'依各自组织体系设置',kind:'supervision',text:'纪检与国家监察有各自组织和职责依据；本版通过审计线索、责任记录和任职核查体现约束。'},
 {name:'人民法院、人民检察院',scope:'中央与相应地方司法机关',kind:'justice',text:'分别承担审判、法律监督等职能；政府治理操作不能直接决定具体案件结果。'},
 {name:'中央军事委员会',scope:'中央',kind:'military',text:'军事领导体系单独展示，不纳入本版地方文职晋升与城建操作。'}
];
const DOMAINS={education:{name:'教育均衡',cost:100,field:'education',effect:12,upkeep:2},health:{name:'基层医疗',cost:110,field:'health',effect:12,upkeep:2.5},industry:{name:'就业与产业',cost:130,field:'employment',effect:10,upkeep:3},ecology:{name:'生态整治',cost:85,field:'environment',effect:13,upkeep:1.5},audit:{name:'督察整改',cost:35,field:'capacity',effect:10,upkeep:0}};
const NAMES=[['临江镇','青禾镇','石桥镇'],['临江县','青禾县','石桥区'],['江州市','南川市','北陵市'],['江南省','川原省','北岭省']];
function init(roleId='town',mode='career',month=0){const r=byId(roleId);if(!r)throw Error('未知岗位');return {role:roleId,mode,since:month,priorExperience:60,ageAtStart:30,application:null,trainingUntil:0,trainedUntil:0,lastRotation:-12,assignment:0,terms:[],records:[{role:roleId,start:month,end:null,reason:mode==='scenario'?'分层体验开局':'初始任职'}],world:Array.from({length:4},(_,k)=>{const tier=k+1,scale=10**tier;return {tier,scale,cash:1800*scale,spent:0,limit:1200*scale,monthlyIncome:0,monthlyExpense:0,failedMonths:0,motions:[],regions:NAMES[k].map((name,i)=>({id:tier+'-'+i,name,pop:Math.round((1.4+i*.8)*1000*scale),education:62-i*6,health:60+i*3,employment:75-i*5,environment:76-i*7,capacity:72-i*8,upkeep:0}))};})};}
function current(s){return byId(s.career.role);}
function world(s){return s.career.world.find(w=>w.tier===Math.max(1,current(s).tier));}
function roleScope(r){return r.tier===0?'临江镇':r.tier===1?'临江县':r.tier===2?'江州市':r.tier===3?'江南省':r.id.includes('Minister')||r.id==='minister'?'中央部委':'中央';}
function procedures(target){
 if(target.id==='generalSecretary')return ['中央领导人选酝酿','中央委员会全体会议选举（须为常委）','任职交接'];
 if(target.id==='standing')return ['中央领导人选酝酿','中央委员会全体会议选举','任职交接'];
 if(target.id==='secretariat')return ['领导人选酝酿','中央政治局常委会提名','中央委员会全体会议通过'];
 if(target.id==='premier')return ['领导人选酝酿','国家主席提名','全国人大决定、国家主席任命'];
 if(target.tier===4&&['minister','vicePremier'].includes(target.id))return ['领导人选酝酿','国务院总理提名','全国人大决定、国家主席任命'];
 if(target.id==='viceMinister')return ['组织考察','集体研究','依干部管理权限履行任免程序'];
 return target.branch==='party'?['组织考察','集体研究','依党章及有关规定履行选举或任职程序']:['组织考察','集体研究、提出人选','本级人大选举及任职交接'];
}
function recentScore(s){const arr=s.reviews.slice(-2);return arr.length?arr.reduce((n,r)=>n+r.score,0)/arr.length:0;}
function vacancy(s,target){return ((s.month+target.grade*3)%24)<12;}
function requirements(s,id,ignoreVacancy=false){const c=s.career,r=current(s),t=byId(id),reasons=[];
 if(!t||!(PATHS[r.id]||[]).includes(id))return ['不是当前岗位的可选路径'];
 const lateral=t.grade===r.grade,bridge=r.id==='town'&&id==='townParty',countyBridge=['town','townParty'].includes(r.id)&&id==='viceCounty',need=lateral?12:r.deputy?24:36;
 if(s.month-c.since<need)reasons.push('本岗位还需任职 '+(need-(s.month-c.since))+' 个月');
 if(c.priorExperience+s.month<60&&t.grade>=2)reasons.push('工作经历不足');
 const reviewNeed=bridge?1:2,scoreNeed=bridge?52:countyBridge?58:72,repNeed=bridge?70:countyBridge?72:75;
 if(s.reviews.length<reviewNeed)reasons.push('尚缺'+reviewNeed+'份年度考核');
 if(recentScore(s)<scoreNeed)reasons.push('近两年综合考核均分需达 '+scoreNeed);
 if(s.reputation<repNeed)reasons.push('公众声誉需达 '+repNeed);
 if(s.payables>.01||s.annualGap)reasons.push('需先消除欠款与本年度基本支出缺口');
 if(s.risks.some(x=>s.month-x.month<60))reasons.push('近 60 个月有责任记录，须完成核查观察期');
 if(!ignoreVacancy&&!bridge&&!vacancy(s,t))reasons.push('本轮无岗位空缺，等待下一轮组织安排');
 if(c.application)reasons.push('已有任职程序办理中');
 if(s.ended)reasons.push('职业生涯已结束');
 return reasons;
}
function opportunities(s){return (PATHS[current(s).id]||[]).map(id=>({role:byId(id),reasons:requirements(s,id)}));}
function apply(s,id,log){const problems=requirements(s,id);if(problems.length)return problems.join('；');s.career.application={target:id,from:s.career.role,stage:0,nextAt:s.month+1};log(s,'进入'+byId(id).title+'人选程序。满足游戏门槛不等于已经获任。');return null;}
function train(s,log){if(s.ended)return '职业生涯已结束。';if(s.career.trainingUntil>s.month)return '培训正在进行。';if(s.career.trainedUntil>s.month)return '本轮培训效果仍有效。';const w=current(s).tier>0?world(s):null,cost=w?20*w.scale:25;if((w?w.cash:s.cash)<cost)return '可用预算不足。';if(w)w.cash-=cost;else s.cash-=cost;s.career.trainingUntil=s.month+3;log(s,'开始专题研修，3 个月后结业，形成 24 个月执行能力加成。');return null;}
function rotate(s,log){const c=s.career;if(s.ended)return '职业生涯已结束。';if(c.application)return '正在办理任职程序，暂不能交流。';if(s.month-c.since<12||s.month-c.lastRotation<12)return '需在岗与交流间隔各满 12 个月。';c.lastRotation=s.month;c.assignment=(c.assignment+1)%3;c.records.push({role:c.role,start:s.month,end:s.month,reason:'同级交流 / 专项分工轮换'});log(s,'完成同级交流，调整联系地区与分工；不提升级别，也不清除旧责任。');return null;}
function propose(s,regionId,kind,log){if(s.ended)return '职业生涯已结束。';const r=current(s),w=world(s),d=DOMAINS[kind];if(r.tier===0)return '乡镇层级请直接通过城建和公共服务处理事项。';const region=w.regions.find(x=>x.id===regionId);if(!d||!region)return '无效治理事项。';
 if(r.branch==='party'&&!['audit','ecology','education'].includes(kind))return '党委路径在本版负责方向协调与督察；该项由政府路径提出执行方案。';
 if(r.deputy&&region.id!==w.regions[s.career.assignment].id)return '副职仅能处理当前分管地区的提案。';
 if(w.motions.some(x=>x.region===regionId&&x.kind===kind))return '该事项已在办理。';if(w.motions.length>=3)return '已有三项议题办理中。';const cost=d.cost*w.scale;
 if(w.spent+cost>w.limit)return '超过本级年度专项工作预算。';if(w.cash-cost<200*w.scale)return '需保留本级运转预留资金。';
 w.cash-=cost;w.spent+=cost;w.motions.push({region:regionId,kind,due:s.month+2,cost,phase:0});log(s,r.branch==='party'?'已提交集体议题，等待协调、审查与执行反馈。':'已提交政府工作方案，等待集体审议与执行反馈。');return null;}
function macroScore(s){const w=world(s);return w.regions.reduce((n,r)=>n+(r.education+r.health+r.employment+r.environment+r.capacity)/5,0)/w.regions.length;}
function tick(s,log){const c=s.career,r=current(s);
 c.directives||=[];
 // 所有层级台账持续演化，调任不会重置原辖区。
 for(const w of c.world){
  w.monthlyIncome=w.regions.reduce((n,x)=>n+(28+x.employment*.25)*w.scale,0);
  w.monthlyExpense=w.regions.reduce((n,x)=>n+(35+x.upkeep)*w.scale,0);
  w.cash+=w.monthlyIncome-w.monthlyExpense;w.failedMonths=w.cash<0?w.failedMonths+1:0;
  for(const x of w.regions){x.education=clamp(x.education-.06);x.health=clamp(x.health-.07);x.environment=clamp(x.environment-.045);x.capacity=clamp(x.capacity-.035);x.employment=clamp(x.employment+(x.capacity-65)*.001);x.pop=Math.round(x.pop*(1+(x.employment-65)*.000025));}
  for(const m of w.motions){m.phase=1;if(m.due<=s.month){const unit=w.regions.find(x=>x.id===m.region),d=DOMAINS[m.kind];unit[d.field]=clamp(unit[d.field]+d.effect+(c.trainedUntil>s.month?2:0));unit.upgrades||={};unit.upgrades[m.kind]=d.upkeep;unit.upkeep=Object.values(unit.upgrades).reduce((n,v)=>n+v,0);if(w.tier>1)c.directives.push({tier:w.tier-1,kind:m.kind,due:s.month+2,effect:3});log(s,unit.name+'完成'+d.name+'，首次建设计入运维，后续同类提案作为改善与更新。');}}
  w.motions=w.motions.filter(x=>x.due>s.month);
  if(s.month%12===0){w.limit=1200*w.scale;w.spent=0;}
 }
 const incoming=c.directives.filter(x=>x.due<=s.month);c.directives=c.directives.filter(x=>x.due>s.month);
 for(const d of incoming){const target=c.world.find(w=>w.tier===d.tier);target.regions.forEach(x=>{x[DOMAINS[d.kind].field]=clamp(x[DOMAINS[d.kind].field]+d.effect);});log(s,TIERS[d.tier]+'收到上级'+DOMAINS[d.kind].name+'协同反馈，影响下级样本指标。');if(d.tier>1)c.directives.push({...d,tier:d.tier-1,due:s.month+2,effect:Math.max(1,d.effect-1)});}
 if(c.trainingUntil===s.month){c.trainedUntil=s.month+24;log(s,'专题研修结业，未来 24 个月治理提案执行效果提高。');}
 if(r.tier>0){const score=macroScore(s);s.reputation=clamp(s.reputation+(score-65)*.008);if(world(s).failedMonths>=3)s.ended='本级财政连续三个月失衡，职业模拟提前结束。';}
 if(s.month%60===0){c.terms.push({month:s.month,role:c.role,score:recentScore(s)});log(s,'五年阶段报告已归档，职业生涯继续。');}
 const a=c.application;if(a&&a.nextAt<=s.month){
  const target=byId(a.target),repFloor=target.id==='townParty'?70:72;if(a.from!==c.role||s.reputation<repFloor||s.payables>.01||s.annualGap||s.risks.some(x=>s.month-x.month<60)||s.ended){log(s,'任职程序中止：核查期间出现条件变化。');c.application=null;}
  else {a.stage++;if(a.stage>=procedures(byId(a.target)).length){const previous=c.records.findLast?c.records.findLast(x=>x.end===null):[...c.records].reverse().find(x=>x.end===null);if(previous)previous.end=s.month;c.role=a.target;c.since=s.month;s.level=byId(a.target).tier;c.records.push({role:a.target,start:s.month,end:null,reason:'完成考察及相应任职程序'});c.application=null;s.goodYears=0;log(s,'已履新：'+byId(c.role).title+'。职责与治理范围已更新，原地区债务和责任台账保留。');}else{a.nextAt=s.month+1;log(s,'任职办理：'+procedures(byId(a.target))[a.stage]+'。');}}
 }
}
function validate(s){const c=s.career;if(!c||!byId(c.role)||!['career','scenario'].includes(c.mode)||current(s).tier!==s.level)throw Error('岗位存档不正确。');
 c.directives??=[];if(!Array.isArray(c.directives)||c.directives.length>100||c.directives.some(d=>![1,2,3].includes(d.tier)||!DOMAINS[d.kind]||!Number.isInteger(d.due)||d.due<=s.month||!Number.isFinite(d.effect)||d.effect<0||d.effect>3))throw Error('跨层级反馈不正确。');
 for(const k of ['since','priorExperience','ageAtStart','trainingUntil','trainedUntil','assignment'])if(!Number.isInteger(c[k])||c[k]<0)throw Error('履历数值不正确。');if(c.since>s.month||c.assignment>2||!Number.isInteger(c.lastRotation))throw Error('履历时间不正确。');
 if(!Array.isArray(c.records)||c.records.length>500||c.records.some(x=>!byId(x.role)||!Number.isInteger(x.start)||x.start<0||x.start>s.month||(x.end!==null&&(!Number.isInteger(x.end)||x.end<x.start||x.end>s.month))||typeof x.reason!=='string'))throw Error('任职记录不正确。');
 if(c.records.filter(x=>x.end===null).length!==1||c.records.find(x=>x.end===null).role!==c.role)throw Error('现任岗位记录不一致。');
 if(!Array.isArray(c.terms)||c.terms.length>10||c.terms.some(x=>!byId(x.role)||!Number.isInteger(x.month)||!Number.isFinite(x.score)))throw Error('任期报告不正确。');
 if(c.application){const a=c.application;if(!byId(a.target)||a.from!==c.role||!(PATHS[c.role]||[]).includes(a.target)||!Number.isInteger(a.stage)||a.stage<0||a.stage>=procedures(byId(a.target)).length||!Number.isInteger(a.nextAt)||a.nextAt<=s.month)throw Error('任职程序不正确。');}
 if(!Array.isArray(c.world)||c.world.length!==4||new Set(c.world.map(w=>w.tier)).size!==4)throw Error('层级台账不完整。');
 for(const w of c.world){if(![1,2,3,4].includes(w.tier)||w.scale!==10**w.tier||!['cash','spent','limit','monthlyIncome','monthlyExpense','failedMonths'].every(k=>Number.isFinite(w[k]))||w.spent<0||w.limit<0||w.spent>w.limit||w.failedMonths<0)throw Error('辖区资金不正确。');if(!Array.isArray(w.regions)||w.regions.length!==3||w.regions.some((x,i)=>x.id!==w.tier+'-'+i||typeof x.name!=='string'||!Number.isInteger(x.pop)||x.pop<0||!['education','health','employment','environment','capacity','upkeep'].every(k=>Number.isFinite(x[k])&&x[k]>=0)))throw Error('辖区指标不正确。');if(!Array.isArray(w.motions)||w.motions.length>3||w.motions.some(m=>!w.regions.some(x=>x.id===m.region)||!DOMAINS[m.kind]||!Number.isInteger(m.due)||m.due<=s.month||m.cost!==DOMAINS[m.kind].cost*w.scale||![0,1].includes(m.phase)))throw Error('治理提案不正确。');}
 for(const w of c.world)for(const x of w.regions){if(x.upgrades!==undefined&&(typeof x.upgrades!=='object'||x.upgrades===null||Array.isArray(x.upgrades)||Object.entries(x.upgrades).some(([k,v])=>!DOMAINS[k]||v!==DOMAINS[k].upkeep)))throw Error('地区运维数据不正确。');}
 return c;
}
const api={LIMIT,TIERS,GRADES,ROLES,PATHS,INSTITUTIONS,DOMAINS,byId,init,current,world,roleScope,procedures,recentScore,requirements,opportunities,apply,train,rotate,propose,macroScore,tick,validate};if(typeof module!=='undefined')module.exports=api;else root.Career=api;
})(typeof globalThis!=='undefined'?globalThis:this);
