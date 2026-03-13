// ========== 3D BACKGROUND CANVAS ==========
(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');

  const COLS = 18, ROWS = 14;
  const GRID_W = 2200, GRID_D = 1600;
  const FOV = 520;
  const TILT = 0.38;
  const PARTICLE_COUNT = 55;
  const MAX_LINK = 160;

  let W, H, mouseX = 0.5, mouseY = 0.5, t = 0;

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

  // Project a 3D point onto 2D canvas
  function project(x3, y3, z3) {
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);
    const ry = y3 * cosT - z3 * sinT;
    const rz = y3 * sinT + z3 * cosT;
    const s = FOV / (FOV + rz + 600);
    return {
      x: W / 2 + x3 * s,
      y: H * 0.62 + ry * s,
      s
    };
  }

  // Particles floating in space
  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(), y: Math.random(),
    z: Math.random() * 0.7 + 0.2,
    vx: (Math.random() - 0.5) * 0.00025,
    vy: (Math.random() - 0.5) * 0.00018,
  }));

  // ── Shared 3D box helpers (used by drawServers & drawWires) ──
  function boxPts(cx, cz, bw, bh, bd) {
    return [
      [cx-bw/2, 0,   cz-bd/2], [cx+bw/2, 0,   cz-bd/2],
      [cx+bw/2, 0,   cz+bd/2], [cx-bw/2, 0,   cz+bd/2],
      [cx-bw/2, -bh, cz-bd/2], [cx+bw/2, -bh, cz-bd/2],
      [cx+bw/2, -bh, cz+bd/2], [cx-bw/2, -bh, cz+bd/2],
    ].map(([x, y, z]) => project(x, y, z));
  }
  function lerp2(a, b, f) { return { x: a.x+(b.x-a.x)*f, y: a.y+(b.y-a.y)*f }; }

  // ── Wire connections between components ──
  // (x, y, z) in world space; y is negative = above floor
  const NODES = {
    monitor:   [0,    -62,  370],
    router:    [0,    -19,  505],
    leftRack:  [-390, -150, 620],
    rightRack: [390,  -150, 620],
  };
  const LINKS = [
    ['monitor',  'router'   ],
    ['router',   'leftRack' ],
    ['router',   'rightRack'],
    ['leftRack', 'rightRack'],
  ];
  // Data packets: each moves along a link in one direction
  const dataPackets = LINKS.flatMap(([na, nb]) => {
    const a = NODES[na], b = NODES[nb];
    return [
      { a, b,     p: 0.05, spd: 0.0028 + Math.random() * 0.0018 },
      { a, b,     p: 0.55, spd: 0.0020 + Math.random() * 0.0018 },
      { a: b, b: a, p: 0.30, spd: 0.0032 + Math.random() * 0.0018 },
    ];
  });

  function drawWires(light) {
    const gRGB = light ? '13,27,42' : '90,166,198';
    LINKS.forEach(([na, nb]) => {
      const a = NODES[na], b = NODES[nb];
      const pa = project(a[0], a[1], a[2]);
      const pb = project(b[0], b[1], b[2]);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `rgba(${gRGB},0.13)`; ctx.lineWidth = 0.9; ctx.stroke();
    });
  }

  function drawPackets(light) {
    const dotRGB = light ? '90,166,198' : '110,189,156';
    dataPackets.forEach(pkt => {
      pkt.p += pkt.spd;
      if (pkt.p > 1) pkt.p -= 1;
      const wx = pkt.a[0] + (pkt.b[0] - pkt.a[0]) * pkt.p;
      const wy = pkt.a[1] + (pkt.b[1] - pkt.a[1]) * pkt.p;
      const wz = pkt.a[2] + (pkt.b[2] - pkt.a[2]) * pkt.p;
      const p2d = project(wx, wy, wz);
      const r = Math.max(1.2, 3 * p2d.s);
      // Glow halo
      const g = ctx.createRadialGradient(p2d.x, p2d.y, 0, p2d.x, p2d.y, r * 4.5);
      g.addColorStop(0, `rgba(${dotRGB},0.80)`);
      g.addColorStop(1, `rgba(${dotRGB},0)`);
      ctx.beginPath(); ctx.arc(p2d.x, p2d.y, r * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      // Bright core
      ctx.beginPath(); ctx.arc(p2d.x, p2d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${dotRGB},1)`; ctx.fill();
    });
  }

  // ── Server racks + router + monitor on the 3D grid ──
  function drawServers(light) {
    const gRGB = light ? '13,27,42'   : '90,166,198';
    const lG   = light ? '90,166,198' : '110,189,156';
    const lR   = light ? '198,90,90'  : '255,120,100';

    function wireBox(p, alpha) {
      ctx.strokeStyle = `rgba(${gRGB},${alpha})`; ctx.lineWidth = 0.9;
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]]
        .forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(p[a].x,p[a].y); ctx.lineTo(p[b].x,p[b].y); ctx.stroke(); });
    }
    function topCap(p, alpha) {
      ctx.beginPath();
      ctx.moveTo(p[4].x,p[4].y); ctx.lineTo(p[5].x,p[5].y); ctx.lineTo(p[6].x,p[6].y); ctx.lineTo(p[7].x,p[7].y);
      ctx.closePath(); ctx.fillStyle = `rgba(${gRGB},${alpha})`; ctx.fill();
    }

    function rack(cx, cz) {
      const bw=110, bh=300, bd=72, units=8, a=0.16;
      const p = boxPts(cx, cz, bw, bh, bd);
      wireBox(p, a); topCap(p, a * 0.22);
      for (let i = 0; i < units; i++) {
        const f0 = i/units, fm = (i+0.5)/units;
        // Divider
        const dl = lerp2(p[4],p[0],f0), dr = lerp2(p[5],p[1],f0);
        ctx.beginPath(); ctx.moveTo(dl.x,dl.y); ctx.lineTo(dr.x,dr.y);
        ctx.strokeStyle=`rgba(${gRGB},${a*0.4})`; ctx.lineWidth=0.5; ctx.stroke();
        // Row midpoints
        const ml=lerp2(p[4],p[0],fm), mr=lerp2(p[5],p[1],fm), rw=mr.x-ml.x;
        // LED
        const pulse=(Math.sin(t*2.8+i*1.3)+1)/2;
        ctx.beginPath(); ctx.arc(ml.x+rw*0.09,(ml.y+mr.y)/2,1.8,0,Math.PI*2);
        ctx.fillStyle=`rgba(${i%4===3?lR:lG},${(0.3+pulse*0.55).toFixed(2)})`; ctx.fill();
        // Activity bar
        const bf=0.18+0.62*Math.abs(Math.sin(t*0.85+i*1.5));
        ctx.beginPath(); ctx.moveTo(ml.x+rw*0.18,(ml.y*0.6+mr.y*0.4)); ctx.lineTo(ml.x+rw*(0.18+bf*0.72),(ml.y*0.6+mr.y*0.4));
        ctx.strokeStyle=`rgba(${gRGB},${a*0.75})`; ctx.lineWidth=1.6; ctx.stroke();
      }
    }

    function routerBox(cx, cz) {
      const bw=165, bh=36, bd=88, numPorts=8, a=0.15;
      const p = boxPts(cx, cz, bw, bh, bd);
      wireBox(p, a); topCap(p, a * 0.2);
      // Port LEDs horizontally across front face center
      const midL=lerp2(p[4],p[0],0.5), midR=lerp2(p[5],p[1],0.5);
      for (let i=0; i<numPorts; i++) {
        const pt=lerp2(midL,midR,(i+0.5)/numPorts);
        const pulse=(Math.sin(t*3.2+i*0.85)+1)/2;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,1.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(${lG},${(0.3+pulse*0.6).toFixed(2)})`; ctx.fill();
      }
      // Activity bar near top of front face
      const tL=lerp2(p[4],p[0],0.22), tR=lerp2(p[5],p[1],0.22);
      const bfw=(tR.x-tL.x)*(0.35+0.45*Math.abs(Math.sin(t*1.2)));
      ctx.beginPath(); ctx.moveTo(tL.x+(tR.x-tL.x)*0.08,(tL.y+tR.y)/2); ctx.lineTo(tL.x+(tR.x-tL.x)*0.08+bfw,(tL.y+tR.y)/2);
      ctx.strokeStyle=`rgba(${gRGB},${a*0.8})`; ctx.lineWidth=1.2; ctx.stroke();
    }

    function monitor(cx, cz) {
      const bw=200, bh=122, bd=14, a=0.14;
      const p = boxPts(cx, cz, bw, bh, bd);
      wireBox(p, a);
      // Screen data lines
      const lines=6;
      for (let li=0; li<lines; li++) {
        const fm=(li+0.5)/lines;
        const ml=lerp2(p[4],p[0],fm), mr=lerp2(p[5],p[1],fm), rw=mr.x-ml.x;
        const bf=0.08+0.76*Math.abs(Math.sin(t*0.55+li*1.1));
        ctx.beginPath(); ctx.moveTo(ml.x+rw*0.05,(ml.y+mr.y)/2); ctx.lineTo(ml.x+rw*bf,(ml.y+mr.y)/2);
        ctx.strokeStyle=`rgba(${gRGB},${a*0.75})`; ctx.lineWidth=1.4; ctx.stroke();
      }
      // Blinking cursor
      if (Math.sin(t*3)>0) {
        const fm=(lines-0.5)/lines;
        const ml=lerp2(p[4],p[0],fm), mr=lerp2(p[5],p[1],fm), rw=mr.x-ml.x;
        const bf=0.08+0.76*Math.abs(Math.sin(t*0.55+(lines-1)*1.1));
        ctx.beginPath(); ctx.arc(ml.x+rw*bf+4,(ml.y+mr.y)/2,2.2,0,Math.PI*2);
        ctx.fillStyle=`rgba(${lG},0.65)`; ctx.fill();
      }
      // Stand
      const base=project(cx,0,cz-bd/2-10), bot=lerp2(lerp2(p[0],p[1],0.5),lerp2(p[4],p[5],0.5),0.02);
      ctx.beginPath(); ctx.moveTo(bot.x,bot.y); ctx.lineTo(base.x,base.y);
      ctx.strokeStyle=`rgba(${gRGB},${a*1.3})`; ctx.lineWidth=2; ctx.stroke();
    }

    // Closest → farthest draw order for correct overlap
    monitor(0, 370);
    routerBox(0, 505);
    rack(-390, 620);
    rack( 390, 620);
  }

  function drawFrame() {
    t += 0.007;
    ctx.clearRect(0, 0, W, H);

    const light = document.body.classList.contains('light');
    const gridRGB  = light ? '13,27,42'    : '90,166,198';
    const dotRGB   = light ? '90,166,198'  : '110,189,156';
    const gridBase = light ? 0.10          : 0.14;

    drawServers(light);
    drawWires(light);

    // ── Perspective grid ──
    const zCycle = GRID_D;
    const zOffset = (t * 28) % (zCycle / ROWS);

    for (let r = 0; r <= ROWS; r++) {
      const zRaw = (r / ROWS) * zCycle - zOffset;
      const z3 = ((zRaw % zCycle) + zCycle) % zCycle - zCycle * 0.15;
      const depth = 1 - (z3 + zCycle * 0.15) / (zCycle * 1.15);
      const alpha = depth * depth * gridBase;
      if (alpha < 0.004) continue;

      // horizontal line
      const pL = project(-GRID_W / 2, 0, z3);
      const pR = project( GRID_W / 2, 0, z3);
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.strokeStyle = `rgba(${gridRGB},${alpha.toFixed(3)})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    for (let c = 0; c <= COLS; c++) {
      const x3 = (c / COLS - 0.5) * GRID_W;
      const pFar  = project(x3, 0, -zCycle * 0.15);
      const pNear = project(x3, 0,  zCycle * 0.85);

      const grad = ctx.createLinearGradient(pFar.x, pFar.y, pNear.x, pNear.y);
      grad.addColorStop(0,   `rgba(${gridRGB},0)`);
      grad.addColorStop(0.4, `rgba(${gridRGB},${(gridBase * 0.5).toFixed(3)})`);
      grad.addColorStop(1,   `rgba(${gridRGB},${gridBase.toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(pFar.x, pFar.y);
      ctx.lineTo(pNear.x, pNear.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    drawPackets(light);

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
