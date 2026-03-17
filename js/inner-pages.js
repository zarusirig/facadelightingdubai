/* ============================================
   FACADE LIGHTING DUBAI — Inner Pages JS
   Enhanced with GSAP Scroll Reveals + ScrollSpy
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {

  // --- 0. Reduced Motion Check ---
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  // ---- Scroll Progress Bar ----
  var scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress) {
    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = percent + '%';
    }, { passive: true });
  }


  // ---- Header Scroll State ----
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }


  // ---- FAQ Accordion ----
  var faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var isActive = item.classList.contains('active');

      document.querySelectorAll('.faq-item.active').forEach(function (openItem) {
        openItem.classList.remove('active');
      });

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });


  // ---- Mobile Navigation ----
  var mobileToggle = document.querySelector('.mobile-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (mobileToggle && mainNav) {
    mobileToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('open');
      mobileToggle.classList.toggle('active', isOpen);
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', function (e) {
      if (!mobileToggle.contains(e.target) && !mainNav.contains(e.target)) {
        mainNav.classList.remove('open');
        mobileToggle.classList.remove('active');
        mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }


  // ---- Dropdown ----
  var dropdowns = document.querySelectorAll('.nav-dropdown');
  dropdowns.forEach(function (dropdown) {
    var trigger = dropdown.querySelector('a[aria-haspopup]');
    if (trigger) {
      trigger.addEventListener('click', function (e) {
        if (window.innerWidth <= 991) e.preventDefault();
        dropdown.classList.toggle('open');
      });
    }
  });


  // ---- Cursor Glow (desktop only, motion allowed) ----
  var cursorGlow = document.querySelector('.cursor-glow');
  if (cursorGlow && window.innerWidth > 991 && !prefersReducedMotion) {
    var isMoving = false;
    document.addEventListener('mousemove', function (e) {
      cursorGlow.style.left = e.clientX + 'px';
      cursorGlow.style.top = e.clientY + 'px';
      if (!isMoving) { cursorGlow.classList.add('active'); isMoving = true; }
    });
    document.addEventListener('mouseleave', function () {
      cursorGlow.classList.remove('active');
      isMoving = false;
    });
  }


  // ---- GSAP Scroll Reveal Animations (Phase 5) ----
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);

    // Article header entrance
    var articleHeader = document.querySelector('.article-header');
    if (articleHeader) {
      var headerH1 = articleHeader.querySelector('h1');
      var headerP = articleHeader.querySelector('p');
      var headerMeta = articleHeader.querySelector('.article-meta');
      var tl = gsap.timeline({ delay: 0.15 });

      if (headerMeta) tl.fromTo(headerMeta, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      if (headerH1) tl.fromTo(headerH1, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.2');
      if (headerP) tl.fromTo(headerP, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    }

    // Article hero image parallax zoom
    var heroImage = document.querySelector('.article-hero-image img');
    if (heroImage) {
      gsap.fromTo(heroImage,
        { scale: 1.05 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.article-hero-image',
            start: 'top 80%',
            end: 'bottom 20%',
            scrub: true
          }
        }
      );
    }

    // H2 headings — fade up + gold underline draw
    var articleH2s = document.querySelectorAll('.article-content h2');
    articleH2s.forEach(function (h2) {
      gsap.fromTo(h2,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: h2,
            start: 'top 85%',
            onEnter: function () { h2.classList.add('revealed'); }
          }
        }
      );
    });

    // H3 headings — subtle fade
    var articleH3s = document.querySelectorAll('.article-content h3');
    articleH3s.forEach(function (h3) {
      gsap.fromTo(h3,
        { opacity: 0, y: 15 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: h3, start: 'top 88%' }
        }
      );
    });

    // Callout boxes — slide in from left
    var callouts = document.querySelectorAll('.article-content .callout');
    callouts.forEach(function (callout) {
      gsap.fromTo(callout,
        { opacity: 0, x: -20 },
        {
          opacity: 1, x: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: callout, start: 'top 85%' }
        }
      );
    });

    // Tables — fade up
    var tables = document.querySelectorAll('.article-content table');
    tables.forEach(function (table) {
      gsap.fromTo(table,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: table, start: 'top 88%' }
        }
      );
    });

    // Related cards — staggered entrance
    var relatedCards = document.querySelectorAll('.related-card, .seed-card');
    if (relatedCards.length > 0) {
      gsap.fromTo(relatedCards,
        { opacity: 0, y: 25 },
        {
          opacity: 1, y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: relatedCards[0].parentElement,
            start: 'top 88%'
          }
        }
      );
    }

    // CTA inline — fade up
    var ctaInlines = document.querySelectorAll('.cta-inline, .cta-banner');
    ctaInlines.forEach(function (cta) {
      gsap.fromTo(cta,
        { opacity: 0, y: 20 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: cta, start: 'top 85%' }
        }
      );
    });

    // FAQ section — stagger items
    var faqItems = document.querySelectorAll('.faq-section .faq-item');
    if (faqItems.length > 0) {
      gsap.fromTo(faqItems,
        { opacity: 0, y: 15 },
        {
          opacity: 1, y: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: document.querySelector('.faq-section'),
            start: 'top 85%'
          }
        }
      );
    }

    // Section headers on inner pages
    var sectionHeaders = document.querySelectorAll('.section-header');
    sectionHeaders.forEach(function (sh) {
      gsap.fromTo(sh,
        { opacity: 0, y: 25 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sh,
            start: 'top 82%',
            onEnter: function () { sh.classList.add('revealed'); }
          }
        }
      );
    });

    // Service/section cards on inner pages
    var innerCards = document.querySelectorAll('.service-item, .section-card, .bento-item');
    if (innerCards.length > 0) {
      var cardParent = innerCards[0].parentElement;
      gsap.fromTo(innerCards,
        { opacity: 0, y: 25 },
        {
          opacity: 1, y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: cardParent,
            start: 'top 85%'
          }
        }
      );
    }
  }


  // ---- ScrollSpy for Sidebar TOC ----
  var tocLinks = document.querySelectorAll('.toc-sticky .toc-nav a');
  if (tocLinks.length > 0) {
    var headings = [];

    tocLinks.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        var target = document.getElementById(href.substring(1));
        if (target) headings.push({ el: target, link: link });
      }
    });

    if (headings.length > 0) {
      var scrollSpyHandler = function () {
        var scrollPos = window.scrollY + 120;
        var activeIndex = 0;

        for (var i = headings.length - 1; i >= 0; i--) {
          if (headings[i].el.offsetTop <= scrollPos) {
            activeIndex = i;
            break;
          }
        }

        tocLinks.forEach(function (l) { l.classList.remove('active'); });
        headings[activeIndex].link.classList.add('active');
      };

      window.addEventListener('scroll', scrollSpyHandler, { passive: true });
      scrollSpyHandler();
    }
  }

});
