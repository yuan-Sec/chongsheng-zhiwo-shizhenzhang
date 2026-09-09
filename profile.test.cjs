const assert=require('assert'),G=require('./engine.js');let passed=0;
function test(name,fn){try{fn();passed++;console.log('✓',name)}catch(e){console.error('✗',name);throw e}}
test('新局包含独立个人档案',()=>{const s=G.initial();assert.equal(s.version,7);assert.equal(s.profile.health,92);});
test('月度推进结算个人收入和缴存',()=>{const s=G.initial(),cash=s.profile.cash;G.next(s);assert(s.profile.cash>cash);assert(s.profile.housingFund>1.4);assert.equal(s.profile.ledger.length,1);});
test('健康管理只用个人存款',()=>{const s=G.initial(),publicCash=s.cash;s.profile.health=50;assert.equal(G.personalCare(s),null);assert.equal(s.profile.health,59);assert.equal(s.cash,publicCash);assert(G.personalCare(s));});
test('住房购置不占公共财政',()=>{const s=G.initial(),publicCash=s.cash;s.profile.cash=20;assert.equal(G.buyHouse(s),null);assert.equal(s.profile.housing,'自有住房');assert.equal(s.cash,publicCash);});
test('存款不足不能购车',()=>{const s=G.initial();s.profile.cash=1;assert(G.buyCar(s));assert.equal(s.profile.transport,'公共交通');});
test('第六版存档可迁移个人档案',()=>{const s=G.initial();delete s.profile;s.version=6;G.validate(s);assert.equal(s.version,7);assert(s.profile);});
test('非法个人档案被拒绝',()=>{const s=G.initial();s.profile.health=101;assert.throws(()=>G.validate(s));});
test('生活节奏影响健康与声誉',()=>{const s=G.initial();s.profile.pace='进取';const rep=s.reputation,health=s.profile.health;G.next(s);assert(s.reputation>rep);assert(s.profile.health<health);});
test('生活线按条件推进婚恋与子女',()=>{const s=G.initial();assert.equal(G.Profile.life(s,'认识伴侣'),null);s.month++;s.profile.relationship=65;assert.equal(G.Profile.life(s,'登记结婚'),null);s.month++;s.profile.relationship=70;assert.equal(G.Profile.life(s,'养育子女'),null);assert.equal(s.profile.family,'已婚');assert.equal(s.profile.children,1);});
test('按揭购房建立个人贷款且可还款',()=>{const s=G.initial();assert.equal(G.Profile.life(s,'按揭购房'),null);assert.equal(s.profile.mortgage,12);s.profile.cash=3;assert.equal(G.Profile.life(s,'提前还款'),null);assert(s.profile.mortgage<12);});
test('年度重点工作在年末形成考核加成并归档',()=>{const s=G.initial();assert.equal(G.setAgenda(s,'ecology'),null);assert(G.agendaScore(s,G.metrics(s))>=0);for(let i=0;i<12;i++)G.next(s);assert.equal(s.agenda,null);assert(Number.isFinite(s.reviews[0].agenda));});
console.log(`\n${passed} profile tests passed`);
