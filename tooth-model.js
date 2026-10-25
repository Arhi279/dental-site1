/**
 * Original procedural teaching model, created for Dental Studio.
 * A single-root incisor with a quadrant removed; no downloaded geometry/textures.
 * Shapes, layer thicknesses and colours are deliberately simplified. This is
 * an educational illustration, not a patient scan or a diagnostic model.
 */
export function createTooth(THREE) {
  const cutaway = new THREE.Group();
  const intact = new THREE.Group();
  cutaway.name = 'Incisor — educational section';
  intact.name = 'Incisor — exterior';

  // Each row is [height, mesiodistal radius, labiolingual radius].
  // The wide, thin incisal edge distinguishes this tooth from a pointed canine.
  const dentin = [
    [-2.14,0,0],[-2.10,.035,.035],[-1.95,.085,.075],[-1.70,.15,.13],
    [-1.35,.22,.19],[-.95,.30,.255],[-.50,.38,.32],[-.12,.43,.355],
    [0,.44,.36],[.30,.50,.365],[.65,.58,.32],[1.0,.665,.225],
    [1.30,.68,.13],[1.42,.66,.055],[1.46,0,0]
  ];
  const enamel = [
    [0,.44,.36],[.12,.49,.405],[.35,.59,.43],[.70,.71,.40],
    [1.05,.78,.30],[1.30,.78,.205],[1.48,.75,.105],
    [1.56,.72,.055],[1.59,.68,.018],[1.60,0,0]
  ];
  const cementum = [
    [-2.16,0,0],[-2.10,.045,.045],[-1.95,.10,.09],[-1.70,.165,.145],
    [-1.35,.235,.205],[-.95,.315,.27],[-.50,.395,.335],
    [-.12,.44,.365],[0,.44,.36]
  ];
  const pulp = [
    [-2.14,0,0],[-2.09,.009,.009],[-1.95,.017,.016],[-1.70,.029,.026],
    [-1.35,.042,.036],[-.95,.058,.048],[-.50,.095,.075],
    [0,.15,.105],[.35,.205,.125],[.70,.235,.12],
    [1.0,.18,.075],[1.17,.10,.034],[1.23,0,0]
  ];

  // Shape-preserving cubic interpolation avoids negative radii and ripples.
  function radiusAt(profile, y, axis) {
    if (y < profile[0][0] || y > profile[profile.length - 1][0]) return 0;
    const last = profile.length - 1;
    let i = 0;
    while (i < last - 1 && y > profile[i + 1][0]) i++;
    const left = profile[i], right = profile[i + 1];
    const width = right[0] - left[0];
    const slope = (right[axis] - left[axis]) / width;
    function tangent(index) {
      if (index === 0) return (profile[1][axis] - profile[0][axis]) / (profile[1][0] - profile[0][0]);
      if (index === last) return (profile[last][axis] - profile[last - 1][axis]) / (profile[last][0] - profile[last - 1][0]);
      const before = (profile[index][axis] - profile[index - 1][axis]) / (profile[index][0] - profile[index - 1][0]);
      const after = (profile[index + 1][axis] - profile[index][axis]) / (profile[index + 1][0] - profile[index][0]);
      if (before * after <= 0) return 0;
      return 2 / (1 / before + 1 / after);
    }
    const t = (y - left[0]) / width;
    const t2 = t * t, t3 = t2 * t;
    const value = (2*t3-3*t2+1)*left[axis] + (t3-2*t2+t)*width*tangent(i)
      + (-2*t3+3*t2)*right[axis] + (t3-t2)*width*tangent(i+1);
    return Math.max(0, Math.min(Math.max(left[axis], right[axis]), value));
  }
  const zero = () => 0;
  const radii = (profile) => (y, axis) => radiusAt(profile, y, axis);
  const dentinRadius = radii(dentin);
  const pulpRadius = radii(pulp);
  const makeMaterial = (color, roughness) => new THREE.MeshStandardMaterial({
    color, roughness, metalness:0, side:THREE.DoubleSide
  });
  const materials = {
    enamel:makeMaterial('#fff9e9',.22),
    dentin:makeMaterial('#e8bf74',.48),
    pulp:makeMaterial('#cf6860',.5),
    root:makeMaterial('#dbceb1',.56)
  };
  let triangleCount = 0;
  function makeGeometry(positions, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    triangleCount += indices.length / 3;
    return geometry;
  }
  function addMesh(group, positions, indices, part) {
    const mesh = new THREE.Mesh(makeGeometry(positions, indices), materials[part]);
    mesh.name = part;
    mesh.userData.part = part;
    group.add(mesh);
    return mesh;
  }
  function heightSamples(profile, innerProfile) {
    const minimum = profile[0][0], maximum = profile[profile.length - 1][0];
    const levels = [...new Set([
      ...profile.map(row => row[0]),
      ...(innerProfile || []).map(row => row[0]).filter(y => y > minimum && y < maximum)
    ])].sort((a,b) => a-b);
    const sampled = [];
    for (let i = 0; i < levels.length - 1; i++) {
      for (let j = 0; j < 3; j++) sampled.push(THREE.MathUtils.lerp(levels[i], levels[i+1], j/3));
    }
    sampled.push(maximum);
    return sampled;
  }

  // Surfaces and planar section faces have independent vertices/normals so the
  // polished curved enamel never smears its normals into the anatomical cut.
  function layer(group, profile, innerProfile, innerRadius, part, section) {
    const heights = heightSamples(profile, innerProfile);
    const angularSegments = section ? 42 : 56;
    const start = section ? Math.PI / 2 : 0;
    const sweep = section ? Math.PI * 1.5 : Math.PI * 2;
    const positions = [], indices = [];
    for (const y of heights) {
      const rx = radiusAt(profile,y,1), rz = radiusAt(profile,y,2);
      for (let j = 0; j <= angularSegments; j++) {
        const angle = start + sweep * j / angularSegments;
        positions.push(rx * Math.sin(angle), y, rz * Math.cos(angle));
      }
    }
    const stride = angularSegments + 1;
    for (let i = 0; i < heights.length - 1; i++) {
      for (let j = 0; j < angularSegments; j++) {
        const a=i*stride+j, b=a+1, c=a+stride, d=c+1;
        indices.push(a,b,c,b,d,c);
      }
    }
    const curved = addMesh(group,positions,indices,part);
    // Remove the harmless normal seam at the 360° repeat in the intact mesh.
    if (!section) {
      const normals = curved.geometry.attributes.normal;
      for (let i=0; i<heights.length; i++) {
        const a=i*stride, b=a+angularSegments;
        const normal=new THREE.Vector3().fromBufferAttribute(normals,a)
          .add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();
        normals.setXYZ(a,normal.x,normal.y,normal.z);
        normals.setXYZ(b,normal.x,normal.y,normal.z);
      }
      normals.needsUpdate = true;
    }
    if (!section) return;
    // Each cut face is a strip from this tissue's outer contour to the next
    // tissue. Pulp is solid to the axis. Neighbouring strips meet precisely.
    for (const angle of [start,start+sweep]) {
      const facePositions=[], faceIndices=[];
      for (const y of heights) {
        const outerX=radiusAt(profile,y,1), outerZ=radiusAt(profile,y,2);
        const innerX=Math.min(outerX,innerRadius(y,1));
        const innerZ=Math.min(outerZ,innerRadius(y,2));
        facePositions.push(outerX*Math.sin(angle),y,outerZ*Math.cos(angle),
          innerX*Math.sin(angle),y,innerZ*Math.cos(angle));
      }
      for (let i=0; i<heights.length-1; i++) {
        const a=i*2;
        if (angle === start) faceIndices.push(a,a+2,a+1,a+1,a+2,a+3);
        else faceIndices.push(a,a+1,a+2,a+1,a+3,a+2);
      }
      addMesh(group,facePositions,faceIndices,part);
    }
  }
  layer(cutaway,dentin,pulp,pulpRadius,'dentin',true);
  layer(cutaway,pulp,null,zero,'pulp',true);
  layer(cutaway,enamel,dentin,dentinRadius,'enamel',true);
  layer(cutaway,cementum,dentin,dentinRadius,'root',true);
  // The intact version only needs the outer crown and root, saving draw calls.
  layer(intact,enamel,null,zero,'enamel',false);
  layer(intact,cementum,null,zero,'root',false);

  return {
    cutaway, intact,
    anchors:{
      enamel:new THREE.Vector3(.765,1.10,0),
      dentin:new THREE.Vector3(.39,.48,0),
      pulp:new THREE.Vector3(0,.43,.115),
      root:new THREE.Vector3(.205,-1.48,.06)
    },
    triangleCount
  };
}
