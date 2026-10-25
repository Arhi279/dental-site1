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

// Upper central-incisor teaching proportions, not an individual measurement.
assert.ok(Math.abs(model.proportions.rootLength / model.proportions.crownHeight - 13 / 10.5) < .02);
const crown = model.intact.children.find(m => m.userData.part === 'enamel');
const root = model.intact.children.find(m => m.userData.part === 'root');
crown.geometry.computeBoundingBox(); root.geometry.computeBoundingBox();
const size = crown.geometry.boundingBox.max.clone().sub(crown.geometry.boundingBox.min);
assert.ok(size.x > 1.35 && size.x < 1.55, 'Incisor mesiodistal width');
assert.ok(size.z > 1.08 && size.z < 1.35, 'Incisor labiolingual depth');
assert.ok(Math.abs(root.geometry.boundingBox.min.y + model.proportions.rootLength) < .01);

// A CEJ may change tissue, but its shared positions, tangents and effective
// colour must stay continuous. Compare actual GPU float32 attributes.
const rootPosition = root.geometry.attributes.position;
const rootNormals = root.geometry.attributes.normal;
const rootIndex = new Map();
const positionKey = (a, i) => [a.getX(i), a.getY(i), a.getZ(i)].map(v => Math.round(v * 1e6)).join(',');
for (let i = 0; i < rootPosition.count; i++) rootIndex.set(positionKey(rootPosition, i), i);
const crownPosition = crown.geometry.attributes.position;
let seamMatches = 0;
for (let i = 0; i < crownPosition.count; i++) {
  const j = rootIndex.get(positionKey(crownPosition, i));
  if (j === undefined) continue;
  seamMatches++;
  const a = new THREE.Vector3().fromBufferAttribute(crown.geometry.attributes.normal, i);
  const b = new THREE.Vector3().fromBufferAttribute(rootNormals, j);
  assert.ok(a.dot(b) > .9999, 'No normal discontinuity at the CEJ');
  for (const component of ['r', 'g', 'b']) {
    const axis = { r: 0, g: 1, b: 2 }[component];
    const ca = crown.material.color[component] * crown.geometry.attributes.color.array[i * 3 + axis];
    const cb = root.material.color[component] * root.geometry.attributes.color.array[j * 3 + axis];
    assert.ok(Math.abs(ca - cb) < .001, 'No artificial colour band at the CEJ');
  }
  assert.ok(Math.abs(crown.geometry.attributes.tissueRoughness.getX(i) - root.geometry.attributes.tissueRoughness.getX(j)) < .001);
}
assert.ok(seamMatches >= 64, 'Closed shared cervical ring');
for (const part of ['enamel', 'root', 'dentin', 'pulp']) {
  assert.ok(model.anchorCandidatesCutaway[part].length >= 2, 'Visible anatomical candidate anchors');
  for (const p of model.anchorCandidatesCutaway[part]) assert.ok(Number.isFinite(p.length()));
}
console.log(`PASS: incisor proportions and ${seamMatches} continuous CEJ vertices.`);
