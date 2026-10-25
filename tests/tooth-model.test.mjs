// Geometry contract checks; no browser or npm install required.
import assert from 'node:assert/strict';
import * as THREE from '../assets/vendor/three-tooth.min.js';
import { createTooth } from '../tooth-model.js';

const model = createTooth(THREE);
let triangleCount = 0;
for (const group of [model.cutaway, model.intact]) {
  assert.ok(group.children.length > 0);
  for (const mesh of group.children) {
    const { geometry, material } = mesh;
    triangleCount += geometry.index.count / 3;
    for (const name of ['position', 'normal']) {
      assert.ok([...geometry.attributes[name].array].every(Number.isFinite), `${mesh.name}: finite ${name}`);
    }
    for (let i = 0; i < geometry.attributes.normal.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, i);
      assert.ok(Math.abs(n.length() - 1) < .001, `${mesh.name}: unit normals`);
    }
    assert.equal(material.transparent, false, 'Opaque layers avoid sorting artefacts');
    assert.ok(['enamel', 'dentin', 'pulp', 'root'].includes(mesh.userData.part));
  }
}
assert.equal(triangleCount, model.triangleCount);
assert.ok(triangleCount > 10000 && triangleCount < 40000, 'Mobile triangle budget');
for (const part of ['enamel', 'dentin', 'pulp', 'root']) {
  assert.ok(Number.isFinite(model.anchors[part].length()), `Finite ${part} hotspot`);
}

// Neighboring section strips must share actual float32 coordinates, not merely
// have similar radii. Compare the inner edge of one tissue with its neighbour.
const sections = part => model.cutaway.children.filter(m => m.userData.part === part && m.userData.section);
const key = (a, i) => [a.getX(i), a.getY(i), a.getZ(i)].join(',');
let exactSharedVertices = 0;
for (const [outerPart, innerPart] of [['enamel', 'dentin'], ['root', 'dentin'], ['dentin', 'pulp']]) {
  const outside = sections(outerPart), inside = sections(innerPart);
  assert.equal(outside.length, 2); assert.equal(inside.length, 2);
  for (let face = 0; face < 2; face++) {
    const outer = outside[face].geometry.attributes.position;
    const inner = inside[face].geometry.attributes.position;
    const innerEdge = new Set();
    for (let i = 0; i < inner.count; i += 2) innerEdge.add(key(inner, i));
    let matches = 0;
    for (let i = 1; i < outer.count; i += 2) if (innerEdge.has(key(outer, i))) matches++;
    assert.ok(matches >= 15, `${outerPart}/${innerPart}: shared section boundary`);
    exactSharedVertices += matches;
  }
}
console.log(`PASS: ${triangleCount} triangles, finite unit normals, opaque tissues, ${exactSharedVertices} exact section-boundary matches.`);
