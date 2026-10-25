/**
 * Original procedural, single-root incisor for Dental Studio.
 * Curved surfaces and shared cut boundaries are designed for education rather
 * than diagnosis. This is not a patient scan or a clinically validated atlas.
 * No third-party geometry, textures or medical measurements are used.
 */
export function createTooth(THREE) {
  const cutaway = new THREE.Group();
  const intact = new THREE.Group();
  cutaway.name = 'Incisor — anatomical section';
  intact.name = 'Incisor — exterior';

  // Canonical longitudinal profiles: [height, mesiodistal radius, depth].
  // The upper cap is a superelliptic blade: it closes gradually over a broad,
  // softly rounded incisal contour, rather than collapsing a wide ring at once.
  const enamel = {
    profile:[[0,.445,.36],[.16,.482,.385],[.40,.58,.405],[.75,.70,.37],
      [1.1,.765,.28],[1.35,.775,.17],[1.43,.775,.115]],
    cap:{base:1.43,top:1.67,width:.775,depth:.115,power:6}, crown:true
  };
  const dentin = {
    profile:[[-2.20,0,0],[-2.185,.025,.028],[-2.16,.052,.055],[-2.14,.058,.064],[-2.11,.075,.081],
      [-1.98,.105,.112],[-1.75,.155,.158],[-1.40,.22,.216],[-1.0,.29,.272],
      [-.6,.35,.31],[-.2,.41,.338],[0,.445,.36],[.16,.462,.364],
      [.40,.525,.34],[.75,.615,.279],[1.1,.665,.152],[1.23,.65,.09]],
    cap:{base:1.23,top:1.46,width:.65,depth:.09,power:5},
    tip:{bottom:-2.20,top:-2.14,width:.058,depth:.064}, crown:true
  };
  const cementum = {
    profile:[[-2.22,0,0],[-2.20,.043,.046],[-2.17,.060,.064],[-2.15,.068,.073],[-2.12,.083,.09],
      [-1.98,.119,.126],[-1.75,.17,.173],[-1.40,.235,.231],[-1.0,.305,.287],
      [-.6,.365,.325],[-.2,.424,.352],[-.08,.433,.354],[0,.445,.36]],
    tip:{bottom:-2.22,top:-2.15,width:.068,depth:.073}, crown:false
  };
  const pulp = {
    profile:[[-2.20,0,0],[-2.17,.008,.008],[-2.10,.012,.012],[-1.98,.017,.016],
      [-1.75,.024,.022],[-1.40,.032,.028],[-1.0,.041,.034],[-.6,.051,.040],
      [-.2,.071,.049],[0,.092,.058],[.3,.135,.074],[.65,.17,.075],
      [.90,.165,.062],[1.04,.145,.038]],
    cap:{base:1.04,top:1.19,width:.145,depth:.038,power:4}, crown:true, pulp:true
  };
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
    return sampleProfile(surface.profile,y,axis);
  }
  function radius(surface,y,axis) {
    const outer=rawRadius(surface,y,axis);
    if(surface===cementum && y>=-2.16 && y<=0) {
      const coat=.015*smooth(0,.16,-y);
      const guaranteed=rawRadius(dentin,y,axis)+coat;
      const blend=smooth(-2.16,-2.08,y);
      return outer+(guaranteed-outer)*blend;
    }
    return outer;
  }
  function centre(y) {
    const root=clamp(-y/2.22,0,1);
    return .12*root*root*root;
  }
  function point(surface,y,angle) {
    const rx=radius(surface,y,1),rz=radius(surface,y,2);
    const sine=Math.sin(angle),cosine=Math.cos(angle);
    const crown=smooth(0,.32,y);
    // A rounded triangular/ovoid cervical section gradually becomes a broad
    // rounded rectangle toward the incisal third, without sharp box edges.
    const exponent=1-.16*crown;
    const u=Math.sign(sine)*Math.pow(Math.abs(sine),exponent);
    const v=Math.sign(cosine)*Math.pow(Math.abs(cosine),exponent);
    const active=rx>0||rz>0;
    const distal=1-.035*crown*smooth(0,1,u);
    const x=centre(y)+rx*u*distal;
    let z=rz*v;
    if(y>0 && active) {
      const centreFace=1-u*u;
      if(cosine>=0) {
        // Restrained labial developmental lobes: a few hundredths of a unit.
        z*=1+.022*Math.cos(3*Math.PI*u)*Math.exp(-(((y-.75)/.55)**2));
      } else {
        const fossa=.18*Math.exp(-(((y-.86)/.38)**2))*centreFace;
        const cingulum=.18*Math.exp(-(((y-.20)/.19)**2))*centreFace;
        const marginal=.04*Math.exp(-(((Math.abs(u)-.8)/.15)**2))*Math.exp(-(((y-.75)/.6)**2));
        z*=1-fossa+cingulum+marginal;
      }
    }
    // CEJ curves around the tooth rather than forming a horizontal hard band.
    // It is identical for adjoining tissues and decays smoothly in the root.
    const cej=.045*Math.cos(2*angle)*Math.exp(-((y/.24)**2));
    const edge=surface.cap ? smooth(surface.cap.base,maxY(surface),y) : 0;
    // A gently sloping, almost flat incisal silhouette with a rounder distal
    // corner; shallow scalloping is an illustrative contour, not a sharp tip.
    let incisal=0;
    if(surface.cap && y<=maxY(surface)) {
      const incisalX=rx*u/surface.cap.width;
      incisal=edge*(-.025*incisalX-.015*incisalX*incisalX+.009*Math.cos(3*Math.PI*incisalX));
      if(surface.pulp) incisal=edge*.028*Math.cos(2*Math.PI*incisalX);
    }
    return [x,y+cej+incisal,z];
  }

  // Every tissue uses precisely the same canonical y levels. Inner boundaries
  // call the same point evaluator as the adjacent outer boundary, so strip
  // edges coincide numerically even along the curved cervical/incisal region.
  const levels=new Set([-2.22,-2.20,0]);
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
  exteriorMaterials.enamel.vertexColors=true;
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
    if(part==='enamel' && !section) {
      // A restrained cervical tint softens the natural enamel/cementum change.
      // Vertex colour avoids texture downloads and costly transparent passes.
      const tint=[];
      for(let i=0;i<positions.length;i+=3) {
        const t=smooth(0,.65,positions[i+1]);
        tint.push(1,.982+.018*t,.942+.058*t);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
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
    if(!section) return curved;
    for(const angle of [start,start+sweep]) {
      const face=[],faceIndices=[];
      for(const y of rows) {
        face.push(...point(surface,y,angle));
        // Pulp is solid to the gently curved longitudinal axis.
        face.push(...(inner?point(inner,y,angle):[centre(y),y+.045*Math.cos(2*angle)*Math.exp(-((y/.24)**2)),0]));
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
  // The two tissues meet at CEJ with common positions and shared smooth normals.
  function smoothCervical(crown,root) {
    const cp=crown.geometry.attributes.position,cn=crown.geometry.attributes.normal;
    const rp=root.geometry.attributes.position,rn=root.geometry.attributes.normal;
    const rootIndex=new Map();
    for(let i=0;i<rp.count;i++) {
      if(Math.abs(rp.getY(i))>.05) continue;
      rootIndex.set([rp.getX(i),rp.getY(i),rp.getZ(i)].map(v=>Math.round(v*1e6)).join(','),i);
    }
    for(let i=0;i<cp.count;i++) {
      if(Math.abs(cp.getY(i))>.05) continue;
      const key=[cp.getX(i),cp.getY(i),cp.getZ(i)].map(v=>Math.round(v*1e6)).join(',');
      const j=rootIndex.get(key);
      if(j===undefined) continue;
      const average=new THREE.Vector3().fromBufferAttribute(cn,i).add(new THREE.Vector3().fromBufferAttribute(rn,j)).normalize();
      cn.setXYZ(i,average.x,average.y,average.z);rn.setXYZ(j,average.x,average.y,average.z);
    }
    cn.needsUpdate=true;rn.needsUpdate=true;
  }
  smoothCervical(cutCrown,cutRoot);smoothCervical(wholeCrown,wholeRoot);
  return {
    cutaway,intact,
    anchors:{
      enamel:new THREE.Vector3(...point(enamel,1.12,Math.PI/2)),
      dentin:new THREE.Vector3(.355,.43,0),
      pulp:new THREE.Vector3(0,.51,.065),
      root:new THREE.Vector3(...point(cementum,-1.35,Math.PI/2))
    },
    triangleCount
  };
}
