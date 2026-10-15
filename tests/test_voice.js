const vm=require('node:vm'), fs=require('node:fs'), assert=require('node:assert/strict');
const elements=new Map();
const sandbox={console,setTimeout:()=>1,clearTimeout:()=>{},document:{body:{classList:{add(){},remove(){}}},getElementById(id){if(!elements.has(id))elements.set(id,{dataset:{}});return elements.get(id);}},window:{addEventListener(){}},calls:[]};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('web/app.js','utf8'),sandbox);
vm.runInContext("wake=async()=>{awake=true;calls.push('wake')};ask=async text=>calls.push(text);",sandbox);
(async()=>{
  await vm.runInContext("heard('hello television')",sandbox);assert.equal(sandbox.calls.length,0);
  await vm.runInContext("heard('Magic mirror on the wall!')",sandbox);assert.equal(sandbox.calls[0],'wake');
  await vm.runInContext("heard('what color is this shirt')",sandbox);assert.equal(sandbox.calls[1],'what color is this shirt');
  await vm.runInContext("heard('go to sleep')",sandbox);assert.equal(vm.runInContext('awake',sandbox),false);
  await vm.runInContext("heard('magic mirror on the wall tell me a story')",sandbox);assert.equal(sandbox.calls[2],'tell me a story');
  await vm.runInContext("busy=true;heard('magic mirror on the wall')",sandbox);assert.equal(sandbox.calls.length,3);
  const pcm=vm.runInContext('pcm16(new Float32Array([0,1,-1,0]),16000)',sandbox);
  assert.equal(pcm.byteLength,8);assert.equal(new DataView(pcm).getInt16(2,true),32767);
  console.log('Wake phrase, follow-up, sleep, busy gating and PCM tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
