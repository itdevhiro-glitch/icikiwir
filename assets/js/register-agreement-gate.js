(function(){
  const gate = document.getElementById('icwAgreementGate');
  const checkbox = document.getElementById('icwAgreementCheckbox');
  const verifyBtn = document.getElementById('icwAgreementVerify');

  if(!gate || !checkbox || !verifyBtn) return;

  let pendingRegisterTrigger = null;

  function isRegisterTrigger(el){
    if(!el) return false;
    const text = (el.textContent || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').toLowerCase();
    const dataTarget = (el.getAttribute('data-target') || '').toLowerCase();
    const dataTab = (el.getAttribute('data-tab') || '').toLowerCase();
    const dataAuth = (el.getAttribute('data-auth-tab') || el.getAttribute('data-auth') || '').toLowerCase();
    const idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();

    return (
      text === 'daftar' ||
      text.includes('daftar') ||
      text.includes('register') ||
      href.includes('register') ||
      dataTarget.includes('register') ||
      dataTab.includes('register') ||
      dataAuth.includes('register') ||
      idClass.includes('register')
    );
  }

  function accepted(){
    return sessionStorage.getItem('icwRegisterAgreementAccepted') === 'true';
  }

  function openGate(trigger){
    pendingRegisterTrigger = trigger || null;
    checkbox.checked = false;
    verifyBtn.disabled = true;
    gate.classList.add('is-open');
    gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('icw-modal-lock');
  }

  function closeGate(){
    gate.classList.remove('is-open');
    gate.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('icw-modal-lock');
  }

  function activateRegisterClean(){
    sessionStorage.setItem('icwRegisterAgreementAccepted', 'true');
    closeGate();

    // Prefer original trigger after agreement, but avoid reopening modal.
    if(pendingRegisterTrigger){
      const trigger = pendingRegisterTrigger;
      pendingRegisterTrigger = null;
      setTimeout(() => {
        try { trigger.click(); } catch(e) {}
      }, 30);
    }

    // Fallback for common auth layouts.
    setTimeout(() => {
      const registerTab = document.querySelector(
        '[data-target="register"], [data-tab="register"], [data-auth-tab="register"], .register-tab, #registerTab'
      );
      if(registerTab) {
        try { registerTab.click(); } catch(e) {}
      }

      const registerPanel = document.querySelector(
        '#register, #registerForm, .register-form, [data-panel="register"], [data-auth="register"]'
      );
      if(registerPanel){
        registerPanel.classList.remove('hidden', 'd-none', 'is-hidden');
        registerPanel.style.removeProperty('display');
        registerPanel.scrollIntoView({behavior:'smooth', block:'center'});
      }

      const email = document.querySelector(
        '#register input[type="email"], #registerForm input[type="email"], .register-form input[type="email"], input[placeholder*="@icikiwir"], input[name*="email" i]'
      );
      if(email) email.focus({preventScroll:true});
    }, 120);
  }

  checkbox.addEventListener('change', () => {
    verifyBtn.disabled = !checkbox.checked;
  });

  verifyBtn.addEventListener('click', () => {
    if(!checkbox.checked) return;
    activateRegisterClean();
  });

  document.addEventListener('click', (e) => {
    const close = e.target.closest('[data-icw-agreement-close]');
    if(close){
      e.preventDefault();
      closeGate();
      return;
    }

    const trigger = e.target.closest('a, button, [role="button"], [data-target], [data-tab], [data-auth-tab]');
    if(trigger && isRegisterTrigger(trigger) && !accepted()){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openGate(trigger);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && gate.classList.contains('is-open')){
      closeGate();
    }
  });
})();
