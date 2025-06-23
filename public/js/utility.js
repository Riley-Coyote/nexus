export function visibilityInterval(fn, delay){
  let id;
  const start=()=>{ id = setInterval(fn, delay); };
  const stop=()=> clearInterval(id);
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });
  if(!document.hidden) start();
  return { start, stop };
}
