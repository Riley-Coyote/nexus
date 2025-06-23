export const trapFocus = (overlay) => {
  const focusable = overlay.querySelectorAll(
    'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0], last = focusable[focusable.length-1];
  overlay.addEventListener('keydown', e=>{
    if(e.key !== 'Tab') return;
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  });
};
