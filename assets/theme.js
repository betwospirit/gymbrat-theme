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

  /* FAQ hover reveal */
  document.querySelectorAll('.faq__item').forEach((item) => {
    item.addEventListener('mouseenter', () => { item.open = true; });
    item.addEventListener('mouseleave', () => { item.open = false; });
    item.addEventListener('focusin', () => { item.open = true; });
    item.addEventListener('focusout', () => {
      requestAnimationFrame(() => {
        if (!item.contains(document.activeElement)) item.open = false;
      });
    });
  });

  /* Showcase variant popup */
  const showcasePopup = document.querySelector('[data-showcase-variant-popup]');
  let activeShowcaseForm = null;
  let activeShowcaseVariants = [];
  let activeShowcaseSelection = {};
  let activeShowcaseOptionNames = [];

  const money = (cents) => {
    const value = Number(cents || 0) / 100;
    return '$' + (Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2));
  };

  const unique = (items) => Array.from(new Set(items.filter(Boolean)));
  const showcaseOptionKey = (index) => 'option' + (index + 1);
  const showcaseOptionLabel = (index) => {
    const option = activeShowcaseOptionNames[index];
    if (typeof option === 'string') return option;
    if (option?.name) return option.name;
    return index === 0 ? 'Color' : index === 1 ? 'Size' : 'Option';
  };
  const showcaseOptionKeys = () => ['option1', 'option2', 'option3'].filter((key) => {
    return unique(activeShowcaseVariants.map((variant) => variant[key])).length;
  });

  const closeShowcasePopup = () => {
    if (!showcasePopup) return;
    showcasePopup.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const updateShowcasePopupVariant = () => {
    if (!showcasePopup || !activeShowcaseForm) return;
    const requiredKeys = showcaseOptionKeys();
    const isComplete = requiredKeys.every((key) => Boolean(activeShowcaseSelection[key]));
    const selected = isComplete ? activeShowcaseVariants.find((variant) => {
      return requiredKeys.every((key) => {
        return String(variant[key] || '') === String(activeShowcaseSelection[key] || '');
      });
    }) : null;
    const add = showcasePopup.querySelector('[data-popup-add]');
    const price = showcasePopup.querySelector('[data-popup-price]');
    const color = showcasePopup.querySelector('[data-popup-color]');
    const size = showcasePopup.querySelector('[data-popup-size]');
    const image = showcasePopup.querySelector('[data-popup-image]');

    if (color) color.textContent = activeShowcaseSelection.option1 || '--';
    if (size) size.textContent = activeShowcaseSelection.option2 || '--';
    if (selected && price) price.textContent = money(selected.price);
    if (selected?.featured_image?.src && image) image.src = selected.featured_image.src;
    if (add) {
      add.disabled = !isComplete;
      add.dataset.variantId = selected && selected.id ? selected.id : '';
    }
  };

  const setShowcaseValue = (key, value) => {
    activeShowcaseSelection[key] = value;
    const allKeys = showcaseOptionKeys();
    const idx = allKeys.indexOf(key);
    allKeys.slice(idx + 1).forEach((nextKey) => {
      if (!activeShowcaseSelection[nextKey]) return;
      const stillValid = activeShowcaseVariants.some((variant) => {
        return allKeys.slice(0, idx + 1).every((currentKey) => {
          return String(variant[currentKey] || '') === String(activeShowcaseSelection[currentKey] || '');
        }) && String(variant[nextKey] || '') === String(activeShowcaseSelection[nextKey] || '');
      });
      if (!stillValid) activeShowcaseSelection[nextKey] = '';
    });
  };

  const renderShowcaseSelectors = () => {
    if (!showcasePopup) return;
    const wrap = showcasePopup.querySelector('[data-popup-selectors]');
    if (!wrap) return;
    wrap.innerHTML = '';
    showcaseOptionKeys().forEach((key) => {
      const values = unique(activeShowcaseVariants.map((variant) => variant[key]));
      if (!values.length) return;
      const optionName = showcaseOptionLabel(showcaseOptionKeys().indexOf(key));

      const field = document.createElement('div');
      field.className = 'showcase-variant-popup__field';
      field.dataset.optionKey = key;

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'showcase-variant-popup__trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');

      const triggerLabel = document.createElement('span');
      triggerLabel.className = 'showcase-variant-popup__trigger-label';
      triggerLabel.textContent = activeShowcaseSelection[key] || ('Select ' + optionName);
      trigger.appendChild(triggerLabel);

      const list = document.createElement('ul');
      list.className = 'showcase-variant-popup__options';
      list.setAttribute('role', 'listbox');

      values.forEach((value) => {
        const item = document.createElement('li');
        item.className = 'showcase-variant-popup__option';
        item.setAttribute('role', 'option');
        item.dataset.value = value;
        item.textContent = value;
        if (activeShowcaseSelection[key] === value) item.classList.add('is-selected');
        item.addEventListener('click', () => {
          setShowcaseValue(key, value);
          field.classList.add('has-value');
          field.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
          renderShowcaseSelectors();
          updateShowcasePopupVariant();
        });
        list.appendChild(item);
      });

      trigger.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const wasOpen = field.classList.contains('is-open');
        wrap.querySelectorAll('.showcase-variant-popup__field.is-open').forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.showcase-variant-popup__trigger')?.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          field.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });

      field.append(trigger, list);
      if (activeShowcaseSelection[key]) field.classList.add('has-value');
      wrap.appendChild(field);

      if (values.length === 1 && !activeShowcaseSelection[key]) {
        setShowcaseValue(key, values[0]);
        field.classList.add('has-value');
        triggerLabel.textContent = values[0];
      }
    });
  };

  document.addEventListener('click', (e) => {
    if (!showcasePopup) return;
    if (showcasePopup.getAttribute('aria-hidden') === 'true') return;
    if (e.target.closest('.showcase-variant-popup__field')) return;
    showcasePopup.querySelectorAll('.showcase-variant-popup__field.is-open').forEach((field) => {
      field.classList.remove('is-open');
      field.querySelector('.showcase-variant-popup__trigger')?.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-showcase-variant-open]');
    if (opener && showcasePopup) {
      e.preventDefault();
      activeShowcaseForm = opener.closest('[data-showcase-product-form]');
      const variantsScript = activeShowcaseForm?.querySelector('[data-showcase-variants]');
      const optionsScript = activeShowcaseForm?.querySelector('[data-showcase-options]');
      try {
        activeShowcaseVariants = JSON.parse(variantsScript?.textContent || '[]');
      } catch (_) {
        activeShowcaseVariants = [];
      }
      try {
        activeShowcaseOptionNames = JSON.parse(optionsScript?.textContent || '[]');
      } catch (_) {
        activeShowcaseOptionNames = [];
      }

      const firstVariant = activeShowcaseVariants[0] || null;
      activeShowcaseSelection = {};
      if (firstVariant) {
        activeShowcaseOptionNames.forEach((_, index) => {
          const key = showcaseOptionKey(index);
          if (firstVariant[key] && unique(activeShowcaseVariants.map(v => v[key])).length === 1) {
            activeShowcaseSelection[key] = firstVariant[key];
          }
        });
      }

      showcasePopup.querySelector('[data-popup-title]').textContent = opener.dataset.productTitle || '';
      showcasePopup.querySelector('[data-popup-price]').textContent = opener.dataset.productPrice || '';
      const image = showcasePopup.querySelector('[data-popup-image]');
      image.src = opener.dataset.productImage || '';
      image.alt = opener.dataset.productTitle || '';

      renderShowcaseSelectors();
      updateShowcasePopupVariant();
      showcasePopup.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      showcasePopup.querySelector('select, button')?.focus();
      return;
    }

    if (e.target.closest('[data-showcase-variant-close]')) {
      e.preventDefault();
      closeShowcasePopup();
      return;
    }

    const add = e.target.closest('[data-popup-add]');
    if (add && showcasePopup) {
      e.preventDefault();
      if (!activeShowcaseForm) return;
      const variantId = add.dataset.variantId || activeShowcaseForm.querySelector('input[name="id"]')?.value;
      if (!variantId) return;
      const input = activeShowcaseForm.querySelector('input[name="id"]');
      if (input) input.value = variantId;
      closeShowcasePopup();
      if (typeof activeShowcaseForm.requestSubmit === 'function') {
        activeShowcaseForm.requestSubmit();
      } else {
        activeShowcaseForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && showcasePopup?.getAttribute('aria-hidden') === 'false') closeShowcasePopup();
  });

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

  /* Showcase card stack — pinned Nivis-style scroll cards */
  document.querySelectorAll('[data-card-stack]').forEach((stack) => {
    const cards = stack.querySelectorAll('[data-card]');
    if (!cards.length) return;
    const section = stack.closest('.showcase');
    const head = section ? section.querySelector('.showcase__head') : null;
    const overlays = section ? section.querySelectorAll('.showcase-background-overlay') : [];
    const backgrounds = Array.from(cards).map(card => card.getAttribute('data-bg')).filter(Boolean);
    const colors = ['#1f1e21', '#2e2e30', '#3c3c3f', '#4b4a4e', '#59585d', '#68676c'];
    const nav = document.createElement('div');
    nav.className = 'product-showcase-navigation';
    nav.setAttribute('aria-label', 'Product showcase navigation');
    const navButtons = Array.from(cards).map((card, index) => {
      const image = card.querySelector('.showcase-product-img');
      const button = document.createElement('button');
      const thumb = document.createElement('img');
      button.type = 'button';
      button.className = 'product-showcase-nav-thumb';
      button.setAttribute('aria-label', 'Go to product ' + (index + 1));
      thumb.src = image?.currentSrc || image?.getAttribute('src') || backgrounds[index] || '';
      thumb.alt = image?.getAttribute('alt') || '';
      thumb.width = 56;
      thumb.height = 56;
      button.appendChild(thumb);
      button.addEventListener('click', () => {
        const totalScroll = Math.max(1, section.offsetHeight - window.innerHeight);
        const target = section.offsetTop + (index / Math.max(1, cards.length - 1)) * totalScroll;
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
      nav.appendChild(button);
      return button;
    });
    if (navButtons.length) document.body.appendChild(nav);
    let activeBg = 0;
    let activeOverlay = 0;

    const isDesktop = () => window.matchMedia('(min-width: 1101px)').matches;
    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

    const paintBackground = (index) => {
      if (!overlays.length || !backgrounds[index] || index === activeBg) return;
      const nextOverlay = (activeOverlay + 1) % overlays.length;
      overlays[nextOverlay].style.backgroundImage = 'url(' + backgrounds[index] + ')';
      overlays[nextOverlay].style.opacity = '1';
      overlays[activeOverlay].style.opacity = '0';
      activeBg = index;
      activeOverlay = nextOverlay;
    };

    if (overlays.length && backgrounds[0]) {
      overlays[0].style.backgroundImage = 'url(' + backgrounds[0] + ')';
      overlays[0].style.opacity = '1';
      overlays[1]?.style.setProperty('opacity', '0');
    }

    const reset = () => {
      stack.style.transform = '';
      nav.classList.remove('is-visible');
      if (head) { head.style.opacity = ''; head.style.visibility = ''; }
      cards.forEach(c => {
        c.style.transform = '';
        c.style.opacity = '';
        c.style.backgroundColor = '';
      });
    };

    const update = () => {
      if (!isDesktop()) { reset(); return; }
      const r = section.getBoundingClientRect();
      const totalScroll = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolled = clamp(-r.top, 0, totalScroll);
      const progress = scrolled / totalScroll;
      const intro = clamp((window.innerHeight - r.top) / (window.innerHeight * 0.48));
      const active = Math.min(cards.length - 1, Math.round(progress * (cards.length - 1)));

      stack.style.transform = 'translateY(' + ((1 - intro) * 100) + '%)';
      if (head) {
        const headOpacity = clamp(1 - (progress - 0.03) / 0.04);
        head.style.opacity = headOpacity;
        head.style.visibility = headOpacity <= 0.01 ? 'hidden' : '';
      }
      nav.classList.toggle('is-visible', r.top <= 80 && r.bottom >= window.innerHeight * 0.45);
      navButtons.forEach((button, i) => button.classList.toggle('active', i === active));
      paintBackground(active);

      cards.forEach((card, i) => {
        const raw = progress * (cards.length - 1);
        const outgoing = clamp(raw - i);
        const relative = i - active;
        let y = relative > 0 ? 12 * relative : 0;
        let scale = relative > 0 ? Math.max(.88, .98 - (relative - 1) * .02) : 1;

        if (i < cards.length - 1 && outgoing > 0) {
          y = -outgoing * window.innerHeight;
          scale = 1 - outgoing * .02;
        }

        if (i <= active) {
          card.style.backgroundColor = '#0d0b14';
        } else {
          card.style.backgroundColor = colors[Math.min(relative - 1, colors.length - 1)] || '#0d0b14';
        }

        card.style.transform = 'translateY(calc(-50% + ' + y + 'px)) scale(' + scale + ')';
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
