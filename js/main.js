/* ============================================
   FACADE LIGHTING DUBAI — Main JavaScript
   Enhanced Visual Upgrade Edition
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- 0. Reduced Motion Check ---
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- 1. Initialize Lenis (Smooth Scrolling) ---
  let lenis = null;

  if (!prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  } else if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }


  // --- 2. Scroll Progress Bar ---
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = percent + '%';
    };

    if (lenis) {
      lenis.on('scroll', updateProgress);
    } else {
      window.addEventListener('scroll', updateProgress, { passive: true });
    }
  }


  // --- 3. GSAP Animations (only if motion allowed) ---
  if (typeof gsap !== 'undefined' && !prefersReducedMotion) {

    // Hero entrance sequence
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      const tl = gsap.timeline({ delay: 0.2 });

      const overline = heroContent.querySelector('.text-overline');
      const h1 = heroContent.querySelector('h1');
      const heroP = heroContent.querySelector('p');
      const btnWrap = heroContent.querySelector('.hero-cta-wrap, div[style]');
      const stats = heroContent.querySelectorAll('.hero-stat');

      if (overline) tl.fromTo(overline, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      if (h1) tl.fromTo(h1, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, '-=0.3');
      if (heroP) tl.fromTo(heroP, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5');
      if (btnWrap) tl.fromTo(btnWrap, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, '-=0.4');
      if (stats.length) tl.fromTo(stats, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.2');

      // Subtle parallax on scroll
      gsap.to(heroContent, {
        y: 80,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });
    }

    // Section reveals with diamond rotation
    const sections = document.querySelectorAll('.home-section');
    sections.forEach(section => {
      const header = section.querySelector('.section-header');
      if (header) {
        gsap.fromTo(header,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              onEnter: () => header.classList.add('revealed')
            }
          }
        );
      }

      const gridItems = section.querySelectorAll('.service-item, .section-card, .bento-item');
      if (gridItems.length > 0) {
        gsap.fromTo(gridItems,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section.querySelector('.services-grid, .section-grid, .bento-grid'),
              start: 'top 85%',
            }
          }
        );
      }
    });

    // Trust strip counter animation with count-up
    const trustStrip = document.querySelector('.trust-strip');
    if (trustStrip) {
      gsap.fromTo(trustStrip.querySelectorAll('.trust-item'),
        { opacity: 0, y: 15 },
        {
          opacity: 1, y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: { trigger: trustStrip, start: 'top 90%' }
        }
      );
    }

    // CTA banner reveal
    const ctaBanner = document.querySelector('.cta-banner');
    if (ctaBanner) {
      gsap.fromTo(ctaBanner,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: ctaBanner, start: 'top 85%' }
        }
      );
    }
  }


  // --- 4. Animated Stat Counter ---
  function animateCounters() {
    const statValues = document.querySelectorAll('.hero-stat-value[data-count]');
    if (!statValues.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = el.getAttribute('data-count');
          const suffix = el.getAttribute('data-suffix') || '';
          const prefix = el.getAttribute('data-prefix') || '';
          const isFloat = target.includes('.');

          const end = parseFloat(target);
          const duration = 1500;
          const useCommas = end >= 1000;
          const startTime = performance.now();

          function formatNum(n) {
            if (useCommas) return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return n.toString();
          }

          function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = isFloat
              ? (eased * end).toFixed(target.split('.')[1]?.length || 0)
              : Math.floor(eased * end);

            el.textContent = prefix + formatNum(current) + suffix;

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              el.textContent = prefix + formatNum(parseInt(target)) + suffix;
            }
          }

          requestAnimationFrame(step);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statValues.forEach(el => observer.observe(el));
  }

  animateCounters();


  // --- 5. Navigation ---
  const toggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen && typeof gsap !== 'undefined' && !prefersReducedMotion) {
        const links = nav.querySelectorAll('a');
        gsap.fromTo(links,
          { opacity: 0, y: 15, filter: 'blur(3px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.04, ease: 'power3.out', delay: 0.1 }
        );
      }
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !nav.contains(e.target)) {
        nav.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // Dropdown
  const dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('a[aria-haspopup]');
    if (trigger) {
      trigger.addEventListener('click', (e) => {
        if (window.innerWidth <= 991) e.preventDefault();
        dropdown.classList.toggle('open');
      });
    }
  });

  // Header scroll state
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      header.classList.toggle('scrolled', scrollY > 50);
    };

    if (lenis) {
      lenis.on('scroll', onScroll);
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // Nav entrance (desktop)
  if (typeof gsap !== 'undefined' && window.innerWidth > 991 && !prefersReducedMotion) {
    const navLinks = document.querySelectorAll('.main-nav > a, .main-nav > .nav-dropdown');
    const logoEl = document.querySelector('.logo');

    if (logoEl) {
      gsap.fromTo(logoEl, { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', delay: 0.2 });
    }
    if (navLinks.length > 0) {
      gsap.fromTo(navLinks, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', delay: 0.4 });
    }
  }


  // --- 6. Cursor Glow (desktop only, motion allowed) ---
  const cursorGlow = document.querySelector('.cursor-glow');
  let isMouseMoving = false;

  if (cursorGlow && window.innerWidth > 991 && !prefersReducedMotion) {
    document.addEventListener('mousemove', (e) => {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
      if (!isMouseMoving) { cursorGlow.classList.add('active'); isMouseMoving = true; }
    });

    document.addEventListener('mouseleave', () => {
      cursorGlow.classList.remove('active');
      isMouseMoving = false;
    });
  }


  // --- 7. FAQ Accordion ---
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(other => other.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });


  // --- 8. Floating Contact Button ---
  const contactTrigger = document.querySelector('.contact-trigger');
  const contactMenu = document.querySelector('.contact-menu');
  if (contactTrigger && contactMenu) {
    contactTrigger.addEventListener('click', () => {
      contactMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!contactTrigger.contains(e.target) && !contactMenu.contains(e.target)) {
        contactMenu.classList.remove('open');
      }
    });
  }

});
