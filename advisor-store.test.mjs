import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

function storage(){
  const values=new Map();
  return{getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}

test('all advisor emails can log in with the shared frontend password',async()=>{
  const context={window:{},localStorage:storage(),sessionStorage:storage(),location:{search:"",pathname:"login.html",href:""}};
  context.window=context;vm.createContext(context);
  vm.runInContext(await readFile('advisors-data.js','utf8'),context);
  vm.runInContext(await readFile('advisor-store.js','utf8'),context);
  assert.equal(context.CombinvestAdvisors.length,33);
  for(const advisor of context.CombinvestAdvisors){
    context.CombinvestAdvisor.logout();
    const loggedIn=context.CombinvestAdvisor.login(advisor.email,'Combinvest2026!');
    assert.equal(loggedIn?.id,advisor.id,advisor.email);
  }
  assert.equal(context.CombinvestAdvisor.login('alper.ermis@combinvest.swiss','wrong'),null);
});
