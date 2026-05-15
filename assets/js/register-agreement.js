(function(){
  const overlay = document.getElementById('registerAgreementOverlay');
  const check = document.getElementById('registerAgreementCheck');
  const continueBtn = document.getElementById('agreementContinueBtn');
  const backBtn = document.getElementById('agreementBackBtn');

  if(!overlay || !check || !continueBtn) return;

  const registerTriggers = Array.from(document.querySelectorAll('a, button, [role="button"]')).filter((el) => {
    const text = (el.textContent || '').toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const dataTarget = (el.getAttribute('data-target') || '').toLowerCase();
    return text.includes('register') || text.includes('daftar') || href.includes('register') || dataTarget.includes('register');
  });

  function hasAccepted(){
    return sessionStorage.getItem('icikiwirRegisterAgreement') === 'accepted';
  }

  function openAgreement(){
    overlay.classList.add('is-open');
    document.body.classList.add('register-agreement-lock');
    check.checked = false;
    continueBtn.disabled = true;
  }

  function closeAgreement(){
    overlay.classList.remove('is-open');
    document.body.classList.remove('register-agreement-lock');
  }

  function showRegisterForm(){
    sessionStorage.setItem('icikiwirRegisterAgreement', 'accepted');
    closeAgreement();

    const registerPanel = document.querySelector('#register, #registerForm, .register-form, [data-panel="register"], [data-auth="register"]');
    const loginPanel = document.querySelector('#login, #loginForm, .login-form, [data-panel="login"], [data-auth="login"]');

    if(registerPanel){
      registerPanel.classList.remove('hidden', 'd-none', 'is-hidden');
      registerPanel.style.display = '';
      registerPanel.scrollIntoView({behavior:'smooth', block:'center'});
    }

    if(loginPanel && registerPanel && loginPanel !== registerPanel){
      // Don't force hide if project JS handles tabs, only reduce accidental double panels when class-based.
      if(loginPanel.classList.contains('active')) loginPanel.classList.remove('active');
    }

    const registerTab = document.querySelector('[data-target="register"], [data-auth-tab="register"], .register-tab');
    if(registerTab) registerTab.click();

    setTimeout(() => {
      const firstInput = document.querySelector('#register input, #registerForm input, .register-form input, [data-panel="register"] input');
      if(firstInput) firstInput.focus({preventScroll:true});
    }, 250);
  }

  check.addEventListener('change', () => {
    continueBtn.disabled = !check.checked;
  });

  continueBtn.addEventListener('click', showRegisterForm);
  if(backBtn) backBtn.addEventListener('click', closeAgreement);

  overlay.addEventListener('click', (e) => {
    if(e.target === overlay) closeAgreement();
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && overlay.classList.contains('is-open')) closeAgreement();
  });

  registerTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      if(hasAccepted()) return;
      e.preventDefault();
      e.stopPropagation();
      openAgreement();
    }, true);
  });
})();
