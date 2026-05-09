/* GYMBRAT — theme.js v2 */
(() => {
  'use strict';

  /* Drawers */
  const drawers = document.querySelectorAll('.drawer');
  const openDrawer = (id) => { const d = document.getElementById(id); if (!d) return; d.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; };
  const closeAll = () => { drawers.forEach(d => d.setAttribute('aria-hidden','true')); document.body.style.overflow=''; };

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-drawer-toggle]');
    if (toggle) { e.preventDefault(); const id = toggle.getAttribute('data-drawer-toggle'); const d = document.getElementById(id); if (d.getAttribute('aria-hidden') === 'false') closeAll(); else { closeAll(); openDrawer(id); } return; }
    if (e.target.closest('[data-drawer-close]')) { e.preventDefault(); closeAll(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  /* Quantity steppers */
  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-qty-step]'); if (!step) return;
    const wrap = step.closest('.qty'); if (!wrap) return;
    const input = wrap.querySelector('input');
    const dir = parseInt(step.getAttribute('data-qty-step'), 10);
    const next = Math.max(parseInt(input.min || '0', 10), (parseInt(input.value, 10) || 0) + dir);
    input.value = next; input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  /* PDP thumbnail switcher */
  const main = document.querySelector('[data-main-image]');
  if (main) {
    const thumbs = document.querySelectorAll('[data-thumb]');
    thumbs.forEach((t) => {
      t.addEventListener('click', () => {
        thumbs.forEach(x => x.classList.remove('is-active'));
        t.classList.add('is-active');
        const src = t.getAttribute('data-src');
        if (src) main.src = src;
      });
    });
  }

  /* Add-to-cart with drawer reveal + button success animation */
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-product-form], .product-form, .showcase-actions');
    if (!form) return;
    e.preventDefault();
    const submitter = e.submitter || form.querySelector('button[type=submit]');
    const isBuyNow = submitter && submitter.matches('[data-buy-now]');
    const originalLabel = submitter ? submitter.innerHTML : '';
    if (submitter) {
      submitter.classList.add('is-busy');
      submitter.disabled = true;
    }
    const fd = new FormData(form);
    if (submitter && submitter.name && !fd.has(submitter.name)) fd.append(submitter.name, submitter.value || '');
    try {
      const r = await fetch('/cart/add.js', { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('add failed');
      const cart = await fetch('/cart.js').then(x => x.json());
      document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = String(cart.item_count).padStart(2,'0'));
      try {
        const html = await fetch(window.location.pathname + '?sections=header').then(x => x.json());
        if (html.header) {
          const tmp = document.createElement('div'); tmp.innerHTML = html.header;
          const newDrawer = tmp.querySelector('#CartDrawer');
          if (newDrawer) document.querySelector('#CartDrawer').replaceWith(newDrawer);
        }
      } catch(_) {}
      if (submitter) {
        submitter.classList.remove('is-busy');
        submitter.classList.add('is-success');
        submitter.innerHTML = '✓ Added';
      }
      if (isBuyNow) {
        setTimeout(() => { window.location.href = '/checkout'; }, 350);
      } else {
        openDrawer('CartDrawer');
        setTimeout(() => {
          if (!submitter) return;
          submitter.classList.remove('is-success');
          submitter.disabled = false;
          submitter.innerHTML = originalLabel;
        }, 1600);
      }
    } catch (err) {
      if (submitter) { submitter.classList.remove('is-busy'); submitter.disabled = false; }
      form.submit();
    }
  });

  /* Floating subscribe — dismissable + persisted */
  const sub = document.querySelector('[data-float-subscribe]');
  if (sub) {
    if (localStorage.getItem('gb-sub-dismissed') === '1') sub.hidden = true;
    sub.querySelector('[data-float-close]')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      sub.hidden = true; localStorage.setItem('gb-sub-dismissed', '1');
    });
  }

  /* Reveal */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.story, .testimonial, .spec, .card, .feature').forEach(el => { el.classList.add('reveal'); io.observe(el); });

  /* PDP carousel — center image highlighted, right images fade out */
  document.querySelectorAll('[data-pdp-carousel]').forEach((carousel) => {
    const imgs = carousel.querySelectorAll('[data-pdp-img]');
    const nextBtn = carousel.querySelector('[data-pdp-next]');
    if (!imgs.length) return;
    let active = 0;

    function paint() {
      imgs.forEach((img, i) => {
        const rel = i - active;                // negative = went left, 0 = center, positive = right
        // Center anchor: 50% horizontally. Each slot offsets by 22vw.
        const offset = rel === 0 ? '0vw' : (rel * 22) + 'vw';
        const scale  = rel === 0 ? 1 : Math.max(0.62, 1 - Math.abs(rel) * 0.12);
        const alpha  = rel === 0 ? 1 : Math.max(0,    1 - Math.abs(rel) * 0.45);
        // Cards moving LEFT (rel < 0) slide far left so the dark info panel covers them.
        const slideOff = rel < 0 ? -40 : 0;     // additional vw push for outgoing-left
        img.style.transform = 'translate(calc(-50% + ' + offset + ' + ' + slideOff + 'vw), -50%) scale(' + scale + ')';
        img.style.opacity   = String(alpha);
        img.style.zIndex    = String(20 - Math.abs(rel));
        img.style.pointerEvents = rel === 0 ? 'auto' : 'none';
      });
    }

    nextBtn?.addEventListener('click', () => {
      active = (active + 1) % imgs.length;
      paint();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { active = (active + 1) % imgs.length; paint(); }
      if (e.key === 'ArrowLeft')  { active = (active - 1 + imgs.length) % imgs.length; paint(); }
    });

    paint();
  });

  /* Showcase card stack — z-stacked at same position, scroll fades top card up */
  document.querySelectorAll('[data-card-stack]').forEach((stack) => {
    const cards = stack.querySelectorAll('[data-card]');
    if (!cards.length) return;
    const N = cards.length;
    const isDesktop = () => window.matchMedia('(min-width: 1101px)').matches;

    const reset = () => cards.forEach(c => { c.style.transform = ''; c.style.opacity = ''; });

    const update = () => {
      if (!isDesktop()) { reset(); return; }
      const r = stack.getBoundingClientRect();
      const totalScroll = Math.max(1, r.height - window.innerHeight);
      const scrolled = Math.max(0, Math.min(totalScroll, -r.top));
      const per = totalScroll / N;
      cards.forEach((card, i) => {
        const p = Math.max(0, Math.min(1, (scrolled - i * per) / per));
        if (p <= 0) {
          card.style.transform = '';
        } else {
          // outgoing card slides up; opacity stays constant
          const ty = -p * 90;          // vh — translates fully out of view
          const sc = 1 - p * 0.04;
          card.style.transform = 'translateY(' + ty + 'vh) scale(' + sc + ')';
        }
        card.style.opacity = '1';
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
