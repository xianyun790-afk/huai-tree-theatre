import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function glb(name:string){const b=readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url));assert.equal(b.readUInt32LE(0),0x46546c67);return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());}
test('every exported actor has a true skin, full weights and four nonempty distinct animation clips',()=>{
 for(const name of ['father','player','inventor','neighbor']){const asset=glb(name);assert.equal(asset.skins.length,1);assert.equal(asset.skins[0].joints.length,16);assert.deepEqual(asset.animations.map((a:{name:string})=>a.name),['Idle','Walk','Talk','Point']);const bytes=readFileSync(new URL(`../public/models/${name}.glb`,import.meta.url));const binary=bytes.subarray(28+bytes.readUInt32LE(12));const hashes=new Set<string>();for(const a of asset.animations){assert.ok(a.channels.length>10);const hash=createHash('sha256');for(const sampler of a.samplers){const acc=asset.accessors[sampler.output],view=asset.bufferViews[acc.bufferView];const start=(view.byteOffset??0)+(acc.byteOffset??0);const size=({SCALAR:1,VEC3:3,VEC4:4} as Record<string,number>)[acc.type]*4*acc.count;hash.update(binary.subarray(start,start+size));}hashes.add(hash.digest('hex'));}assert.equal(hashes.size,4);for(const p of asset.meshes[0].primitives){assert.ok(p.attributes.JOINTS_0!==undefined);assert.ok(p.attributes.WEIGHTS_0!==undefined);}}
});
test('environment exports independently, with static portable geometry',()=>{const asset=glb('environment');assert.ok(asset.meshes.length>500);assert.equal(asset.skins,undefined);assert.equal(asset.animations,undefined);});
