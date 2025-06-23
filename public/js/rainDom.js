import {visibilityInterval} from './utility.js';

class AdaptiveASCIIFluidSimulation{
  constructor(){
    this.container = document.getElementById('ascii-container');
    this.layers = [
      {element: document.getElementById('layer1'), chars:[' ','·','∘','○'], speed:0.3, scale:2},
      {element: document.getElementById('layer2'), chars:[' ','⋅','∘','○','●'], speed:0.5, scale:1.5},
      {element: document.getElementById('layer3'), chars:[' ','·','∘','○','●','◉'], speed:0.8, scale:1}
    ];
    this.ripples = [];
    this.time = 0;
    this.resize();
    this.setup();
  }
  resize(){
    const fontSize = Math.max(6, Math.min(window.innerHeight/100, 16));
    this.layers.forEach(l=>{ l.element.style.fontSize = fontSize + 'px'; });
    const charWidth = fontSize * 0.5;
    const lineHeight = fontSize * 1.0;
    this.cols = Math.max(Math.ceil(window.innerWidth/charWidth)+5, 50);
    this.rows = Math.max(Math.ceil(window.innerHeight/lineHeight)+3, 30);
  }
  setup(){
    let rt; window.addEventListener('resize',()=>{
      clearTimeout(rt); rt=setTimeout(()=>this.resize(),250);
    },{passive:true});
    this.interval = visibilityInterval(()=>{
      this.createRipple(Math.random(),Math.random(),0.2+Math.random()*0.3);
    },5000);
  }
  createRipple(x,y,intensity){
    if(this.ripples.length>=6) this.ripples.shift();
    this.ripples.push({x,y,intensity,radius:0,maxRadius:0.3,life:1,decay:0.015});
  }
  updateRipples(){
    this.ripples = this.ripples.filter(r=>{ r.radius+=0.01; r.life-=r.decay; return r.life>0;});
  }
  noise(x,y,t){
    let val=0, amp=1, freq=1;
    for(let i=0;i<3;i++){
      val += amp*Math.sin(freq*(x*0.02+Math.cos(t*0.001+y*0.01)) +
                      freq*(y*0.03+Math.sin(t*0.0008+x*0.015)) +
                      t*0.002*freq);
      amp*=0.6; freq*=2;
    }
    return val/2;
  }
  calculateIntensity(col,row,idx){
    const x=col/this.cols, y=row/this.rows, layer=this.layers[idx];
    let intensity = this.noise(col*layer.scale, row*layer.scale, this.time*layer.speed);
    this.ripples.forEach(r=>{
      const dx=x-r.x, dy=y-r.y; const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<r.maxRadius){
        const effect=Math.sin((dist-r.radius)*20)*r.intensity*r.life*Math.max(0,1-dist/r.maxRadius);
        intensity += effect;
      }
    });
    intensity=(intensity+1)/2;
    return Math.max(0,Math.min(1,intensity));
  }
  render(){
    this.layers.forEach((layer,idx)=>{
      let html='';
      for(let row=0; row<this.rows; row++){
        for(let col=0; col<this.cols; col++){
          const intensity=this.calculateIntensity(col,row,idx);
          const charIndex=Math.floor(intensity*(layer.chars.length-1));
          const char=layer.chars[charIndex]||' ';
          const colorClass=Math.floor(intensity*9);
          html += `<span class="char intensity-${colorClass}">${char}</span>`;
        }
        html+='\n';
      }
      layer.element.innerHTML=html;
    });
  }
  tick(){
    this.time++; this.updateRipples(); this.render();
    this.raf=requestAnimationFrame(()=>this.tick());
  }
  start(){ if(!this.raf) this.tick(); }
  stop(){ cancelAnimationFrame(this.raf); this.raf=null; }
}

const sim = new AdaptiveASCIIFluidSimulation();
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  sim.start();
  document.addEventListener('visibilitychange',()=>{
    document.hidden ? sim.stop() : sim.start();
  });
}
