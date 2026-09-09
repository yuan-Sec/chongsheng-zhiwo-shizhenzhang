// 通过公开游戏命令验证可达性：不改写考核、声誉、现金、月份或现任岗位。
const G=require('./engine'),C=G.Career;
function run(route){const s=G.initial(),arrivals=[];G.build(s,118,'school');G.build(s,119,'clinic');for(let i=0;i<6;i++){G.hire(s,'teachers',1);G.hire(s,'doctors',1);}
for(let t=0;t<C.LIMIT&&!s.ended;t++){
 for(const e of [...s.events])G.resolve(s,e.id,1);
 if(s.level>0){const w=C.world(s),r=C.current(s);if(s.month%12===0)G.rotate(s);if(s.month%24===0)G.train(s);
 const allowed=r.branch==='party'?['education','ecology','audit']:Object.keys(C.DOMAINS);
 const candidates=w.regions.filter(x=>!r.deputy||x.id===w.regions[s.career.assignment].id).flatMap(x=>allowed.map(k=>({x,k,value:x[C.DOMAINS[k].field]}))).sort((a,b)=>a.value-b.value);
 for(const a of candidates){if(a.value<86&&!G.propose(s,a.x.id,a.k))break;}
 }
 const target=route[route.indexOf(s.career.role)+1];if(target&&!s.career.application&&C.requirements(s,target).length===0)G.applyRole(s,target);
 const old=s.career.role;G.next(s);if(old!==s.career.role)arrivals.push({month:s.month,role:s.career.role,score:C.recentScore(s)});
}
return {s,arrivals};}
if(require.main===module){for(const path of [['town','viceCounty','county','viceCity','city','viceProvince','province','vicePremier','premier'],['town','townParty','viceCounty','county','countyParty','viceCity','city','cityParty','viceProvince','province','provinceParty','secretariat','standing','generalSecretary']]){const result=run(path);console.log(JSON.stringify({arrivals:result.arrivals,month:result.s.month,last:result.s.career.role,ended:result.s.ended,reasons:C.opportunities(result.s)},null,2));}}
module.exports={run};
