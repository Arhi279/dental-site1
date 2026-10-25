/**
 * Original procedural, single-root incisor for Dental Studio.
 * Curved surfaces and shared cut boundaries are designed for education rather
 * than diagnosis. This is not a patient scan or a clinically validated atlas.
 * No third-party geometry or textures are used. Proportion guide: the standard
 * Wheeler teaching averages for a maxillary central incisor (crown 10.5 mm,
 * root 13 mm, mesiodistal 8.5 mm, labiolingual 7 mm). These are illustrative
 * ratios, not measurements of an individual tooth or clinical validation.
 */
export function createTooth(THREE) {
  const cutaway = new THREE.Group();
  const intact = new THREE.Group();
  cutaway.name = 'Incisor — anatomical section';
  intact.name = 'Incisor — exterior';

  // The tooth is a maxillary central incisor. The taller, deeper crown and
  // crown/root ratio follow teaching averages; all scene units remain arbitrary.
  const enamel = {
    profile:[[0,.600,.535],[.18,.624,.576],[.45,.676,.60],[.80,.716,.56],
      [1.10,.730,.46],[1.35,.724,.31],[1.58,.695,.135]],
    cap:{base:1.58,top:1.80,width:.695,depth:.135,power:3.4}, crown:true
  };
  const dentin = {
    profile:[[-2.215,0,0],[-2.19,.024,.045],[-2.15,.046,.085],[-2.10,.055,.103],
      [-2.03,.078,.130],[-1.84,.145,.199],[-1.60,.219,.273],[-1.30,.303,.345],
      [-.95,.399,.418],[-.55,.502,.475],[-.20,.566,.512],[0,.600,.535],
      [.18,.592,.530],[.45,.612,.515],[.80,.637,.445],[1.10,.620,.337],
      [1.35,.597,.190],[1.43,.572,.118]],
    cap:{base:1.43,top:1.61,width:.572,depth:.118,power:3},
    tip:{bottom:-2.215,top:-2.10,width:.055,depth:.103}, crown:true
  };
  const cementum = {
    profile:[[-2.23,0,0],[-2.20,.029,.051],[-2.16,.055,.092],[-2.115,.069,.117],
      [-2.03,.093,.145],[-1.84,.160,.214],[-1.60,.234,.288],[-1.30,.318,.36],
      [-.95,.414,.433],[-.55,.517,.49],[-.20,.578,.524],[0,.600,.535]],
    tip:{bottom:-2.23,top:-2.115,width:.069,depth:.117}, crown:false
  };
  const pulp = {
    profile:[[-2.215,0,0],[-2.19,.004,.006],[-2.10,.010,.013],[-2.03,.016,.021],
      [-1.84,.023,.029],[-1.60,.030,.037],[-1.30,.038,.045],[-.95,.049,.053],
      [-.55,.060,.061],[-.20,.079,.070],[0,.102,.083],[.30,.143,.108],
      [.65,.183,.113],[1.0,.192,.085],[1.12,.166,.052]],
    cap:{base:1.12,top:1.34,width:.166,depth:.052,power:3}, crown:true, pulp:true
  };
  // One exterior curve crosses the CEJ; using separate endpoint splines caused
  // the old crown/root lighting band even when the positions matched exactly.
  const exteriorProfile=[...cementum.profile.slice(0,-1),...enamel.profile];
  const surfaces = { enamel, dentin, pulp, root:cementum };
  const minY = surface => surface.profile[0][0];
  const maxY = surface => surface.cap ? surface.cap.top : surface.profile.at(-1)[0];
  const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
  const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };

  function sampleProfile(profile,y,axis) {
    let i=0;
    while(i<profile.length-2 && y>profile[i+1][0]) i++;
    const a=profile[i],b=profile[i+1],h=b[0]-a[0];
    function tangent(k) {
      if(k===0) return (profile[1][axis]-profile[0][axis])/(profile[1][0]-profile[0][0]);
      if(k===profile.length-1) return (profile[k][axis]-profile[k-1][axis])/(profile[k][0]-profile[k-1][0]);
      const before=(profile[k][axis]-profile[k-1][axis])/(profile[k][0]-profile[k-1][0]);
      const after=(profile[k+1][axis]-profile[k][axis])/(profile[k+1][0]-profile[k][0]);
      return before*after>0 ? 2/(1/before+1/after) : 0;
    }
    const t=clamp((y-a[0])/h,0,1),t2=t*t,t3=t2*t;
    return Math.max(0,(2*t3-3*t2+1)*a[axis]+(t3-2*t2+t)*h*tangent(i)
      +(-2*t3+3*t2)*b[axis]+(t3-t2)*h*tangent(i+1));
  }
  function rawRadius(surface,y,axis) {
    if(y<minY(surface)||y>maxY(surface)) return 0;
    if(surface.tip && y<=surface.tip.top) {
      const tip=surface.tip,t=clamp((y-tip.top)/(tip.top-tip.bottom),-1,0);
      return (axis===1?tip.width:tip.depth)*Math.sqrt(Math.max(0,1-t*t));
    }
    if(surface.cap && y>=surface.cap.base) {
      const cap=surface.cap,t=clamp((y-cap.base)/(cap.top-cap.base),0,1);
      const q=Math.max(0,1-t*t);
      const rows=surface.profile,last=rows.at(-1),before=rows.at(-2);
      const depthSlope=-(last[2]-before[2])/(last[0]-before[0])*(cap.top-cap.base)/cap.depth;
      return axis===1 ? cap.width*Math.pow(q,1/cap.power) : cap.depth*Math.sqrt(q)*Math.exp(-depthSlope*t);
    }
    const profile=(surface===enamel||surface===cementum)?exteriorProfile:surface.profile;
    return sampleProfile(profile,y,axis);
  }
  function radius(surface,y,axis) {
    const outer=rawRadius(surface,y,axis);
    // A thin cementum coat smoothly vanishes at the CEJ. Dentin must be inside
    // the shared exterior everywhere, including the root's rounded apical cap.
    if(surface===dentin && y<=0) {
      const coat=.014*smooth(0,.20,-y);
      return Math.min(outer,Math.max(0,rawRadius(cementum,y,axis)-coat));
    }
    return outer;
  }
  function centre(y) {
    const root=clamp(-y/2.23,0,1);
    return .19*root*root*(.65+.35*root);
  }
  function centreZ(y) {
    const root=clamp(-y/2.23,0,1);
    return -.075*root*root*root;
  }
  function point(surface,y,angle) {
    const rx=radius(surface,y,1),rz=radius(surface,y,2);
    const sine=Math.sin(angle),cosine=Math.cos(angle);
    const crown=smooth(0,.32,y);
    // A rounded triangular/ovoid cervical section gradually becomes a broad
    // rounded rectangle toward the incisal third, without sharp box edges.
    const exponent=1.015-.025*crown;
    const u=Math.sign(sine)*Math.pow(Math.abs(sine),exponent);
    const v=Math.sign(cosine)*Math.pow(Math.abs(cosine),exponent);
    const active=rx>0||rz>0;
    const distal=1-.025*crown*smooth(0,1,u);
    const mesialFullness=1+.012*crown*Math.exp(-(((u+.55)/.32)**2));
    const x=centre(y)+rx*u*distal*mesialFullness;
    let z=centreZ(y)+rz*v;
    // Relief and its first derivative vanish at the CEJ: a hard y>0 gate
    // previously introduced a displacement jump and a dark lighting stripe.
    if(y>0 && active) {
      const centreFace=1-u*u;
      if(cosine>=0) {
        // Restrained labial developmental lobes: a few hundredths of a unit.
        z+=crown*rz*v*.018*Math.cos(3*Math.PI*(u+.025))*Math.exp(-(((y-.82)/.62)**2));
      } else {
        const fossa=.18*Math.exp(-(((y-.86)/.38)**2))*centreFace;
        const cingulum=.18*Math.exp(-(((y-.20)/.19)**2))*centreFace;
        const marginal=.04*Math.exp(-(((Math.abs(u)-.8)/.15)**2))*Math.exp(-(((y-.75)/.6)**2));
        z+=crown*rz*v*(-fossa+cingulum+marginal);
      }
    }
    // CEJ curves around the tooth rather than forming a horizontal hard band.
    // It is identical for adjoining tissues and decays smoothly in the root.
    const cej=.065*(Math.cos(2*angle)+.16*Math.sin(angle))*Math.exp(-((y/.32)**2));
    const edge=surface.cap ? smooth(surface.cap.base,maxY(surface),y) : 0;
    // A gently sloping, almost flat incisal silhouette with a rounder distal
    // corner; shallow scalloping is an illustrative contour, not a sharp tip.
    let incisal=0;
    if(surface.cap && y<=maxY(surface)) {
      const incisalX=rx*u/surface.cap.width;
      incisal=edge*(-.043*incisalX-.025*incisalX*incisalX+.004*Math.cos(3*Math.PI*incisalX));
      if(surface.pulp) incisal=edge*.014*Math.cos(2*Math.PI*incisalX);
    }
    return [x,y+cej+incisal,z];
  }

  // Every tissue uses precisely the same canonical y levels. Inner boundaries
  // call the same point evaluator as the adjacent outer boundary, so strip
  // edges coincide numerically even along the curved cervical/incisal region.
  const levels=new Set([-2.23,-2.215,-.12,-.06,0,.06,.12]);
  for(const surface of Object.values(surfaces)) {
    surface.profile.forEach(row=>levels.add(row[0]));
    if(surface.cap) {
      const cap=surface.cap;
      for(const fraction of [1,.995,.98,.95,.9,.84,.75,.65,.5,.33,.15,0]) {
        const t=Math.sqrt(1-fraction**cap.power);
        levels.add(cap.base+(cap.top-cap.base)*t);
      }
    }
  }
  const knots=[...levels].sort((a,b)=>a-b);
  const heights=[];
  for(let i=0;i<knots.length-1;i++) {
    heights.push(knots[i]);
    if(knots[i+1]-knots[i]>.11) heights.push((knots[i]+knots[i+1])/2);
  }
  heights.push(knots.at(-1));

  const makeMaterial=(color,roughness)=>new THREE.MeshStandardMaterial({
    color,roughness,metalness:0,side:THREE.DoubleSide,
    envMapIntensity:.9
  });
  const exteriorMaterials={
    enamel:makeMaterial('#f3f0e5',.30),
    dentin:makeMaterial('#cbb58a',.62),
    pulp:makeMaterial('#bd7272',.62),
    root:makeMaterial('#dfd4bc',.52)
  };
  // Both exterior tissues meet with the same effective colour and roughness.
  // The transition is vertex-based, so there is no texture or transparency cost.
  for(const part of ['enamel','root']) {
    const material=exteriorMaterials[part];
    material.vertexColors=true;
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nattribute float tissueRoughness; varying float vTissueRoughness;');
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nvTissueRoughness=tissueRoughness;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\nvarying float vTissueRoughness;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor=vTissueRoughness;');
    };
    material.customProgramCacheKey=()=> 'tooth-cervical-gradient-v1';
  }
  const cervicalColour=new THREE.Color('#e5ddca');
  const sectionMaterials={
    enamel:makeMaterial('#ede9da',.53),
    dentin:makeMaterial('#ccb28a',.69),
    pulp:makeMaterial('#bc7275',.65),
    root:makeMaterial('#d5c8a8',.66)
  };
  let triangleCount=0;
  function mesh(group,positions,indices,part,section=false) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    if((part==='enamel'||part==='root') && !section) {
      const tint=[],roughness=[];
      const base=exteriorMaterials[part].color;
      for(let i=0;i<positions.length;i+=3) {
        // CEJ is angular; measure distance to its curved line rather than y=0.
        const x=positions[i],y=positions[i+1],z=positions[i+2];
        const angle=Math.atan2(x, z);
        const cej=.065*(Math.cos(2*angle)+.16*Math.sin(angle));
        const t=smooth(0,part==='enamel'?.52:.42,Math.abs(y-cej));
        const target=cervicalColour.clone().lerp(base,t);
        tint.push(target.r/base.r,target.g/base.g,target.b/base.b);
        roughness.push(.42+(exteriorMaterials[part].roughness-.42)*t);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
      geometry.setAttribute('tissueRoughness',new THREE.Float32BufferAttribute(roughness,1));
    }
    geometry.setIndex(indices);geometry.computeVertexNormals();
    if(section) {
      const positions=geometry.attributes.position,normals=geometry.attributes.normal;
      let alongX=false;
      for(let i=0;i<positions.count;i++) if(Math.abs(positions.getZ(i))>1e-5) { alongX=true;break; }
      for(let i=0;i<normals.count;i++) {
        const n=new THREE.Vector3().fromBufferAttribute(normals,i);
        if(n.lengthSq()<.1) normals.setXYZ(i,alongX?1:0,0,alongX?0:1);
      }
    }
    if(!section) {
      // Average normals at all duplicated curved-surface seam/pole vertices.
      // The flat section strips have their own vertices and stay crisp.
      const position=geometry.attributes.position,normal=geometry.attributes.normal;
      const coincident=new Map();
      for(let i=0;i<position.count;i++) {
        const key=[position.getX(i),position.getY(i),position.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
        if(!coincident.has(key)) coincident.set(key,[]);
        coincident.get(key).push(i);
      }
      for(const entries of coincident.values()) {
        if(entries.length<2) continue;
        const average=new THREE.Vector3();
        for(const i of entries) average.add(new THREE.Vector3().fromBufferAttribute(normal,i));
        average.normalize();
        for(const i of entries) normal.setXYZ(i,average.x,average.y,average.z);
      }
      normal.needsUpdate=true;
    }
    const object=new THREE.Mesh(geometry,(section?sectionMaterials:exteriorMaterials)[part]);
    object.name=part+(section?' section':' surface');object.userData.part=part;
    object.userData.section=section;group.add(object);triangleCount+=indices.length/3;
    return object;
  }
  function tissue(group,surface,inner,part,section) {
    const rows=heights.filter(y=>y>=minY(surface)-1e-9&&y<=maxY(surface)+1e-9);
    const angular=section?48:64;
    const start=section?Math.PI/2:0,sweep=section?Math.PI*1.5:Math.PI*2;
    const positions=[],indices=[];
    for(const y of rows) for(let j=0;j<=angular;j++) positions.push(...point(surface,y,start+sweep*j/angular));
    const stride=angular+1;
    for(let i=0;i<rows.length-1;i++) for(let j=0;j<angular;j++) {
      const a=i*stride+j,b=a+1,c=a+stride,d=c+1;
      indices.push(a,b,c,b,d,c);
    }
    const curved=mesh(group,positions,indices,part);
    const normal=curved.geometry.attributes.normal;
    const epsilon=.0002;
    function normalPoint(y,angle) {
      // Continue the same exterior through the CEJ when computing derivatives.
      let tissueSurface=surface;
      if(surface===enamel&&y<0)tissueSurface=cementum;
      if(surface===cementum&&y>0)tissueSurface=enamel;
      return new THREE.Vector3(...point(tissueSurface,
        clamp(y,minY(tissueSurface),maxY(tissueSurface)),angle));
    }
    for(let i=0;i<rows.length;i++)for(let j=0;j<=angular;j++) {
      const y=rows[i],angle=start+sweep*j/angular;
      const tangentA=normalPoint(y,angle+epsilon).sub(normalPoint(y,angle-epsilon));
      const tangentY=normalPoint(y+epsilon,angle).sub(normalPoint(y-epsilon,angle));
      const n=tangentA.cross(tangentY);
      if(n.lengthSq()<1e-18) n.set(0,y<0?-1:1,0);
      n.normalize();normal.setXYZ(i*stride+j,n.x,n.y,n.z);
    }
    normal.needsUpdate=true;
    if(!section) return curved;
    for(const angle of [start,start+sweep]) {
      const face=[],faceIndices=[];
      for(const y of rows) {
        face.push(...point(surface,y,angle));
        // Pulp is solid to the gently curved longitudinal axis.
        face.push(...(inner?point(inner,y,angle):[centre(y),y+.065*(Math.cos(2*angle)+.16*Math.sin(angle))*Math.exp(-((y/.32)**2)),centreZ(y)]));
      }
      for(let i=0;i<rows.length-1;i++) {
        const a=i*2;
        if(angle===start) faceIndices.push(a,a+2,a+1,a+1,a+2,a+3);
        else faceIndices.push(a,a+1,a+2,a+1,a+3,a+2);
      }
      mesh(group,face,faceIndices,part,true);
    }
    return curved;
  }
  tissue(cutaway,dentin,pulp,'dentin',true);
  tissue(cutaway,pulp,null,'pulp',true);
  const cutCrown=tissue(cutaway,enamel,dentin,'enamel',true);
  const cutRoot=tissue(cutaway,cementum,dentin,'root',true);
  const wholeCrown=tissue(intact,enamel,null,'enamel',false);
  const wholeRoot=tissue(intact,cementum,null,'root',false);
  // Analytic central-difference normals above sample through the same CEJ,
  // eliminating the lighting seam without averaging two mismatched tangents.
  const anchors={
    enamel:new THREE.Vector3(...point(enamel,1.10,Math.PI/2)),
    dentin:new THREE.Vector3(...point(dentin,.48,Math.PI/2)).multiply(new THREE.Vector3(.68,1,1)),
    pulp:new THREE.Vector3(...point(pulp,.60,0)),
    root:new THREE.Vector3(...point(cementum,-1.20,Math.PI/2))
  };
  const anchorCandidates={};
  const anchorCandidatesCutaway={};
  for(const [part,surface,y] of [['enamel',enamel,1.02],['root',cementum,-1.18]]) {
    anchorCandidates[part]=Array.from({length:32},(_,i)=>new THREE.Vector3(...point(surface,y,i*Math.PI/16)));
    anchorCandidatesCutaway[part]=Array.from({length:25},(_,i)=>new THREE.Vector3(...point(surface,y,Math.PI/2+i*Math.PI/16)));
  }
  // Place internal pins within the coloured cut strip, not on a tissue border.
  for(const [part,surface,inner,y] of [['dentin',dentin,pulp,.48],['pulp',pulp,null,.60]]) {
    anchorCandidatesCutaway[part]=[Math.PI/2,Math.PI*2].map(angle=>{
      const outer=new THREE.Vector3(...point(surface,y,angle));
      const inside=inner?new THREE.Vector3(...point(inner,y,angle)):
        new THREE.Vector3(centre(y),y+.065*(Math.cos(2*angle)+.16*Math.sin(angle))*Math.exp(-((y/.32)**2)),centreZ(y));
      return outer.lerp(inside,.5);
    });
    anchors[part]=anchorCandidatesCutaway[part][0].clone();
  }
  const labelBounds=[];
  for(const [surface,ys] of [[enamel,[0,.18,.45,.80,1.1,1.35,1.58,1.70,1.79]],
    [cementum,[-2.23,-2.1,-1.84,-1.6,-1.3,-.95,-.55,-.2,0]]]) {
    for(const y of ys)for(let i=0;i<24;i++)labelBounds.push(new THREE.Vector3(...point(surface,y,i*Math.PI/12)));
  }
  return {
    cutaway,intact,
    anchors,anchorCandidates,anchorCandidatesCutaway,labelBounds,
    proportions:{crownHeight:1.80,rootLength:2.23,guide:{crown:10.5,root:13,width:8.5,depth:7}},
    triangleCount
  };
}
