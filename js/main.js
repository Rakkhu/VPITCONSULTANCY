// ========== 3D BACKGROUND CANVAS ==========
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  const PARTICLE_COUNT = 55;
  const MAX_LINK = 160;

  let W, H, mouseX = 0.5, mouseY = 0.5;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX / W;
    mouseY = e.clientY / H;
  });

  // Particles floating in space
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(), y: Math.random(),
    z: Math.random() * 0.7 + 0.2,
    vx: (Math.random() - 0.5) * 0.00025,
    vy: (Math.random() - 0.5) * 0.00018,
  }));

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    const light = document.body.classList.contains('light');
    const dotRGB   = light ? '90,166,198'  : '110,189,156';

    // ── Floating particles + links ──
    const px = [], py = [];
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;

      const mx = (p.x + (mouseX - 0.5) * 0.03 * p.z) * W;
      const my = (p.y + (mouseY - 0.5) * 0.03 * p.z) * H;
      px[i] = mx; py[i] = my;

      ctx.beginPath();
      ctx.arc(mx, my, p.z * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dotRGB},${(p.z * 0.55).toFixed(2)})`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = px[i] - px[j], dy = py[i] - py[j];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_LINK) {
          const a = (1 - dist / MAX_LINK) * 0.13;
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.strokeStyle = `rgba(${dotRGB},${a.toFixed(3)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(drawFrame);
  }

  drawFrame();
})();

// ========== THEME TOGGLE ==========
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  themeIcon.className = 'fas fa-moon';
}

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  themeIcon.className = isLight ? 'fas fa-moon' : 'fas fa-sun';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// ========== NAVBAR ==========
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const navItems = document.querySelectorAll('.nav-link');

let scrollTick = false;
window.addEventListener('scroll', () => {
  if (!scrollTick) {
    requestAnimationFrame(() => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
      updateActiveNav();
      scrollTick = false;
    });
    scrollTick = true;
  }
});

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navItems.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Close nav when clicking outside
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  }
});

// ========== ACTIVE NAV LINK ==========
function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const scrollPos = window.scrollY + 120;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) {
      link.classList.toggle('active', scrollPos >= top && scrollPos < top + height);
    }
  });
}

// ========== SCROLL REVEAL ==========
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger children in grids
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

// Add stagger delays to grid items
document.querySelectorAll('.services-grid .reveal, .portfolio-grid .reveal').forEach((el, i) => {
  el.dataset.delay = (i % 3) * 100;
});

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ========== CONTACT FORM ==========
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');
const formError = document.getElementById('formError');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.innerHTML = '<span>Sending...</span> <i class="fas fa-spinner fa-spin"></i>';
  submitBtn.disabled = true;
  formError.classList.remove('show');

  const data = new FormData(form);
  data.append('access_key', '4b3c0182-5053-457c-a12e-ace06a4501e6');

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      formSuccess.classList.add('show');
      form.reset();
      setTimeout(() => formSuccess.classList.remove('show'), 5000);
    } else {
      formError.classList.add('show');
    }
  } catch {
    formError.classList.add('show');
  } finally {
    submitBtn.innerHTML = '<span>Send Message</span> <i class="fas fa-paper-plane"></i>';
    submitBtn.disabled = false;
  }
});

// ========== SERVICE CARDS → SCROLL TO PORTFOLIO ==========
document.querySelectorAll('.service-card').forEach(card => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    const portfolio = document.getElementById('portfolio');
    if (portfolio) {
      const top = portfolio.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ========== FOOTER YEAR ==========
document.getElementById('year').textContent = new Date().getFullYear();

// ========== SMOOTH SCROLL OFFSET (for fixed navbar) ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ========== HERO TITLE TYPEWRITER ==========
const titleEl = document.querySelector('.hero-slogan');
if (titleEl) {
  const text = titleEl.textContent;
  titleEl.textContent = '';
  let i = 0;
  const type = () => {
    if (i < text.length) {
      titleEl.textContent += text.charAt(i++);
      setTimeout(type, 45);
    }
  };
  setTimeout(type, 800);
}
