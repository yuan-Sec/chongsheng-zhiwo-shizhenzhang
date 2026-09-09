(function(root){
'use strict';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const Career=typeof module!=='undefined'?require('./career.js'):root.Career;
const PAY=[.82,1.02,1.28,1.62,2.05,2.55,3.15,3.85,4.7,5.7];
function init(){return {cash:9.6,housingFund:1.4,pension:1.1,health:92,housing:'租住住房',transport:'公共交通',houseCost:0,carCost:0,yearIncome:0,yearExpense:0,lastCare:-12,ledger:[]};}
function monthlyPay(s){return PAY[Career.current(s).grade]||PAY[0];}
function tick(s,log){ensure(s);const p=s.profile,pay=monthlyPay(s),fund=pay*.08,pension=pay*.08;
 if(s.month%12===1){p.yearIncome=0;p.yearExpense=0;}
 let living=.34+(p.housing==='自有住房'?.12:.22)+(p.transport==='自有车辆'?.12:.04),load=s.events.length*.35+(s.career?.application?1:0)+(s.career?.trainingUntil>s.month?.5:0);
 living+=(p.family==='已婚'?.18:0)+p.children*.12+(p.pace==='休养'?.12:0);
 const available=p.cash+pay-fund-pension,paidLiving=Math.min(available,living);p.cash=available-paidLiving;p.personalDebt+=living-paidLiving;
 if(p.mortgage>0){const interest=p.mortgage*.003,principal=Math.min(.1,p.mortgage),paid=Math.min(p.cash,interest+principal);p.cash-=paid;p.mortgage=Math.max(0,p.mortgage+interest-paid);living+=paid;}
p.housingFund+=fund;p.pension+=pension;p.yearIncome+=pay;p.yearExpense+=living;
 p.health=clamp(p.health-.18-load*.3+(p.pace==='休养'?1.1:p.pace==='进取'?-.8:.2));if(p.pace==='进取')s.reputation=clamp(s.reputation+.12);if(p.family==='已婚')p.relationship=clamp(p.relationship+(p.pace==='进取'?-.7:.2));
 if(s.month%12===0)p.annual.push({year:s.month/12,income:p.yearIncome,expense:p.yearExpense,cash:p.cash,health:p.health});p.ledger.unshift({month:s.month,pay,fund,pension,living});p.ledger=p.ledger.slice(0,36);
 if(p.health<30&&s.month%3===0)log(s,'个人健康状态偏低，建议在个人简报中安排健康管理。');}
function care(s){const p=s.profile;if(s.ended)return '职业生涯已结束。';if(s.month-p.lastCare<3)return '本季度已安排健康管理。';if(p.cash<.35)return '个人存款不足 0.35 万元。';p.cash-=.35;p.yearExpense+=.35;p.health=clamp(p.health+9);p.lastCare=s.month;return null;}
function buyHouse(s){if(s.ended)return '职业生涯已结束。';const p=s.profile;if(p.housing==='自有住房')return '已经拥有住房。';if(p.cash<18)return '个人存款需达到 18 万元。';p.cash-=18;p.houseCost=18;p.housing='自有住房';p.yearExpense+=18;return null;}
function buyCar(s){if(s.ended)return '职业生涯已结束。';const p=s.profile;if(p.transport==='自有车辆')return '已经拥有车辆。';if(p.cash<5)return '个人存款需达到 5 万元。';p.cash-=5;p.carCost=5;p.transport='自有车辆';p.yearExpense+=5;return null;}
// 旧档仅补充新增字段，已有个人余额不重算。
function ensure(s){const p=s.profile;if(!p)return;const defaults={family:'单身',relationship:0,children:0,pace:'均衡',mortgage:0,personalDebt:0,lastLife:-1,annual:[]};for(const [k,v] of Object.entries(defaults))if(p[k]===undefined)p[k]=v;}
function life(s,action){ensure(s);const p=s.profile;if(s.ended)return '职业生涯已结束。';
 if(['均衡','进取','休养'].includes(action)){p.pace=action;return null;}
 if(action==='按揭购房'){if(p.housing==='自有住房')return '已经拥有住房。';if(p.cash<6)return '首付需要个人存款 6 万。';p.cash-=6;p.yearExpense+=6;p.housing='自有住房';p.houseCost=18;p.mortgage=12;return null;}
 if(action==='提前还款'){const amount=Math.min(2,p.personalDebt+p.mortgage);if(!amount)return '暂无个人欠款或房贷。';if(p.cash<amount)return '个人余额不足。';const arrears=Math.min(amount,p.personalDebt);p.personalDebt-=arrears;p.mortgage-=amount-arrears;p.cash-=amount;p.yearExpense+=amount;return null;}
 if(p.lastLife===s.month)return '本月已安排生活事项，请下月继续。';
 const options={'认识伴侣':[.15,()=>p.family==='单身',()=>{p.family='恋爱中';p.relationship=20;}],'相处陪伴':[.12,()=>p.family!=='单身',()=>{p.relationship=clamp(p.relationship+15);p.health=clamp(p.health+1);}], '登记结婚':[1.5,()=>p.family==='恋爱中'&&p.relationship>=65,()=>{p.family='已婚';}], '养育子女':[.8,()=>p.family==='已婚'&&p.relationship>=60&&p.children<2,()=>{p.children++;p.relationship-=10;}]};
 const choice=options[action];if(!choice)return '未知生活事项。';if(!choice[1]())return '当前不满足条件：结婚需要恋爱关系达到65，养育需已婚且关系达到60，最多两名子女。';if(p.cash<choice[0])return '个人存款不足。';p.cash-=choice[0];p.yearExpense+=choice[0];choice[2]();p.lastLife=s.month;return null;
}
function validate(s){ensure(s);const p=s.profile;if(!p||!['租住住房','自有住房'].includes(p.housing)||!['公共交通','自有车辆'].includes(p.transport))throw Error('个人档案格式不正确。');for(const k of ['cash','housingFund','pension','health','houseCost','carCost','yearIncome','yearExpense','lastCare'])if(!Number.isFinite(p[k])||k!=='lastCare'&&p[k]<0)throw Error('个人档案数值不正确。');if(p.health>100||!Array.isArray(p.ledger)||p.ledger.length>36)throw Error('个人档案记录不正确。');if(!['单身','恋爱中','已婚'].includes(p.family)||!['均衡','进取','休养'].includes(p.pace)||!Number.isInteger(p.children)||p.children<0||p.children>2||!Number.isFinite(p.lastLife)||p.lastLife>s.month||!Number.isFinite(p.relationship)||p.relationship<0||p.relationship>100||!Number.isFinite(p.mortgage)||p.mortgage<0||!Number.isFinite(p.personalDebt)||p.personalDebt<0||!Array.isArray(p.annual)||p.annual.length>35||p.annual.some(x=>!x||!['year','income','expense','cash','health'].every(k=>Number.isFinite(x[k])&&x[k]>=0)))throw Error('生活档案不正确。');if(p.ledger.some(x=>!x||!['month','pay','fund','pension','living'].every(k=>Number.isFinite(x[k])&&x[k]>=0)))throw Error('个人账本不正确。');return p;}
const api={ensure,life,init,monthlyPay,tick,care,buyHouse,buyCar,validate};if(typeof module!=='undefined')module.exports=api;else root.Profile=api;
})(typeof globalThis!=='undefined'?globalThis:this);
