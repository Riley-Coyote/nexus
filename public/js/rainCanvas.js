export class RainCanvas {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.columns = [];
    this.fontSize = 16;
    this.chars = '01⧉☍⋇✶⟁🜇'.split('');
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  resize(){
    const {innerWidth:w, innerHeight:h} = window;
    this.canvas.width = w;
    this.canvas.height = h;
    this.columns = new Array(Math.floor(w / this.fontSize)).fill(0);
  }
  tick(){
    const {ctx, fontSize, chars, columns} = this;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    ctx.fillStyle = '#00ff9c';
    ctx.font = fontSize + 'px JetBrainsMono, monospace';
    columns.forEach((y,i)=>{
      const text = chars[Math.random()*chars.length|0];
      ctx.fillText(text, i*fontSize, y);
      columns[i] = y > this.canvas.height + Math.random()*100
        ? 0 : y + fontSize;
    });
    this.raf = requestAnimationFrame(()=>this.tick());
  }
  start(){ this.tick(); }
  stop(){ cancelAnimationFrame(this.raf); }
}

const rc = new RainCanvas(document.getElementById('rainCanvas'));
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  rc.start();
  document.addEventListener('visibilitychange',()=>{
    document.hidden ? rc.stop() : rc.start();
  });
}
