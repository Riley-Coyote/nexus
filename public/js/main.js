import {submitEmail} from './formHandler.js';

document.addEventListener('DOMContentLoaded', async () => {
  const {trapFocus} = await import('./modal.js');
  const overlay = document.querySelector('[data-modal]');
  if (overlay) trapFocus(overlay);
});

function showEmailForm(){
  const overlay = document.getElementById('emailOverlay');
  const button = document.querySelector('.enter-button');
  button.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(156, 163, 175, 0.2))';
  button.style.transform = 'scale(0.95)';
  setTimeout(() => {
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('emailInput').focus(), 200);
    button.style.background = '';
    button.style.transform = '';
  }, 300);
}

function hideEmailForm(){
  const overlay = document.getElementById('emailOverlay');
  overlay.classList.remove('active');
  document.getElementById('emailForm').reset();
}

function transitionToIndex(){
  document.body.classList.add('fade-out');
  setTimeout(() => {
    const indexURL = new URL('index.html', location.href).href;
    location.replace(indexURL);
  }, 800);
}

async function handleEmailSubmit(event){
  event.preventDefault();
  const emailInput = document.getElementById('emailInput');
  const submitButton = event.target.querySelector('.submit-button');
  const email = emailInput.value.trim();
  if(!email){
    emailInput.style.borderColor = 'rgba(239, 68, 68, 0.5)';
    emailInput.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.3)';
    setTimeout(() => {
      emailInput.style.borderColor = '';
      emailInput.style.boxShadow = '';
    }, 2000);
    return;
  }

  submitButton.textContent = 'Connecting...';
  submitButton.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(156,163,175,0.3))';
  submitButton.disabled = true;
  emailInput.style.borderColor = 'rgba(34, 197, 94, 0.5)';
  emailInput.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.3)';

  try{
    await submitEmail(email);
    submitButton.textContent = 'Link Established';
    submitButton.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.4))';
    setTimeout(transitionToIndex, 1000);
  }catch(e){
    submitButton.textContent = 'Try Again';
    submitButton.disabled = false;
  }
}

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('emailOverlay');
  if(e.key === 'Escape' && overlay.classList.contains('active')) hideEmailForm();
  if(e.key === 'Enter' && !overlay.classList.contains('active')) showEmailForm();
});

document.getElementById('emailOverlay').addEventListener('click', e => {
  if(e.target.id === 'emailOverlay') hideEmailForm();
});

window.showEmailForm = showEmailForm;
window.hideEmailForm = hideEmailForm;
window.handleEmailSubmit = handleEmailSubmit;
