export async function submitEmail(email){
  const res = await fetch('/api/subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ email })
  });
  if(!res.ok) throw new Error('Subscribe failed');
}
