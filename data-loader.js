// YAML Data Loader for Portfolio
/** Set true to load rank data; also remove `hidden` from the LeetCode nav link and section in index.html. */
const ENABLE_LEETCODE = false;

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

class PortfolioDataLoader {
  constructor() {
    this.data = null;
  }

  async loadData() {
    try {
      const response = await fetch(`data.yaml?v=${Date.now()}`, { cache: 'no-store' });
      const yamlText = await response.text();
      this.data = this.parseYAML(yamlText);
      this.populatePortfolio();
    } catch (error) {
      console.error('Error loading YAML data:', error);
      this.showError();
    }
  }

  parseYAML(yamlText) {
    if (typeof jsyaml === 'undefined') {
      throw new Error('js-yaml library not available');
    }
    return jsyaml.load(yamlText);
  }

  showError() {
    const pill = document.querySelector('.pill');
    if (pill) pill.textContent = 'Could not load portfolio data';
    const h1 = document.querySelector('h1');
    if (h1) {
      h1.innerHTML = `Hi, I'm <span class="text-gradient">Error</span>`;
    }
    const kicker = document.querySelector('.kicker');
    if (kicker) {
      kicker.textContent = 'Please refresh the page or open the browser console for details.';
    }
  }

  populatePortfolio() {
    if (!this.data) return;

    this.populatePersonalInfo();
    this.populateProjects();
    this.populateSkills();
    this.populateHighlights();
    this.populateExperience();
    this.populateCertifications();
    this.populateContact();
    this.populateFooter();

    if (ENABLE_LEETCODE) {
      this.loadLeetCodeChart();
    }

    if (window.location.hash) {
      setTimeout(() => this.scrollToHashIfNeeded(), 400);
    }
  }

  linkifyDescription(html) {
    if (!this.data.auto_links) return html;
    let out = html;
    Object.entries(this.data.auto_links).forEach(([text, url]) => {
      const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      out = out.replace(regex, `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    });
    return out;
  }

  populatePersonalInfo() {
    const personal = this.data.personal;
    if (!personal) return;

    const pill = document.querySelector('.pill');
    if (pill && personal.title) pill.textContent = personal.title;

    const h1 = document.querySelector('h1');
    if (h1 && personal.name) {
      h1.innerHTML = `Hi, I'm <span class="text-gradient">${personal.name}</span>`;
    }

    const kicker = document.querySelector('.kicker');
    if (kicker && personal.description) {
      kicker.innerHTML = this.linkifyDescription(personal.description);
    }

    const facts = document.getElementById('hero-facts');
    if (facts && Array.isArray(personal.quick_facts)) {
      facts.innerHTML = personal.quick_facts.map((fact) => `<li>${fact}</li>`).join('');
    }

    const tags = document.getElementById('hero-tags');
    if (tags && Array.isArray(personal.skills_tags)) {
      tags.innerHTML = personal.skills_tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
    }
  }

  populateProjects() {
    const projects = this.data.projects;
    if (!projects || !Array.isArray(projects)) return;

    const el = document.getElementById('projects-grid');
    if (!el) return;

    el.innerHTML = projects
      .map((project) => {
        const raw = String(project.link ?? '').trim();
        const hasLink = raw.length > 0 && raw !== '#';
        const label = String(project.link_text || 'View')
          .replace(/\s*→\s*$/, '')
          .trim() || 'View';
        const linkRow = hasLink
          ? `<a class="link-arrow" href="${escapeAttr(raw)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} →</a>`
          : '';
        return `
      <article class="card project-card">
        <h3>${project.title || 'Untitled'}</h3>
        <p class="muted">${project.description || ''}</p>
        <div class="tag-row">${Array.isArray(project.tags) ? project.tags.map((tag) => `<span class="tag">${tag}</span>`).join('') : ''}</div>
        ${linkRow}
      </article>
    `;
      })
      .join('');
  }

  populateSkills() {
    const skills = this.data.skills;
    if (!skills || !Array.isArray(skills)) return;

    const el = document.getElementById('skills-grid');
    if (!el) return;

    el.innerHTML = skills
      .map((skill) => {
        const body =
          skill.items && Array.isArray(skill.items)
            ? `<ul class="muted">${skill.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
            : `<p class="muted">${skill.description || ''}</p>`;
        return `
      <div class="card skill-card">
        <h3>${skill.category || 'Category'}</h3>
        ${body}
      </div>
    `;
      })
      .join('');
  }

  populateHighlights() {
    const highlights = this.data.highlights;
    if (!highlights || !Array.isArray(highlights)) return;

    const el = document.getElementById('highlights-grid');
    if (!el) return;

    el.innerHTML = highlights
      .map(
        (h) => `
      <div class="card highlight-card">
        <h3>${h.title || ''}</h3>
        <ul class="muted">
          ${Array.isArray(h.items) ? h.items.map((item) => `<li>${item}</li>`).join('') : ''}
        </ul>
      </div>
    `
      )
      .join('');
  }

  populateExperience() {
    const experience = this.data.experience;
    if (!experience || !Array.isArray(experience)) return;

    const el = document.getElementById('experience-timeline');
    if (!el) return;

    el.innerHTML = experience
      .map((exp) => {
        const bullets =
          exp.items && Array.isArray(exp.items)
            ? `<ul class="muted">${exp.items.map((item) => `<li>${item}</li>`).join('')}</ul>`
            : '';
        const extra = exp.additional_period
          ? `<p class="muted"><strong>${exp.additional_period}</strong> · ${exp.additional_location || ''} — ${exp.additional_description || ''}</p>`
          : '';
        return `
      <div class="tl-item">
        <h3>${exp.company || ''} — ${exp.role || ''}</h3>
        <p class="meta muted">${exp.period || ''} · ${exp.location || ''}</p>
        ${exp.description ? `<p class="muted">${exp.description}</p>` : ''}
        ${bullets}
        ${extra}
      </div>
    `;
      })
      .join('');
  }

  populateCertifications() {
    const certs = this.data.certifications;
    const el = document.getElementById('certifications-grid');
    const section = document.getElementById('certifications');
    const navLink = document.querySelector('a[href="#certifications"]');
    if (!el || !section) return;

    if (!certs || !Array.isArray(certs) || certs.length === 0) {
      section.hidden = true;
      if (navLink) navLink.hidden = true;
      return;
    }

    section.hidden = false;
    if (navLink) navLink.hidden = false;

    const slideWidth = 60; // percent per slide
    const n = certs.length;

    const slidesHtml = certs.map((c, i) => {
      const title = escapeHtml(c.title || '');
      const subtitle = escapeHtml(c.subtitle || '');
      const url = escapeAttr(c.url || '');
      const image = escapeAttr(c.image || '');
      const pdf = escapeAttr(c.pdf || '');
      const verifyBtn = url && url !== '#'
        ? `<a class="btn btn-primary cert-btn" href="${url}" target="_blank" rel="noopener noreferrer">Verify</a>`
        : '';
      const pdfFilename = pdf
        ? pdf.split('/').pop().replace('.pdf', '') + '-Umesh_Gaikwad.pdf'
        : '';
      const downloadBtn = pdf
        ? `<a class="btn btn-ghost cert-btn" href="${pdf}" download="${escapeAttr(pdfFilename)}">Download PDF</a>`
        : '';
      return `
      <div class="cert-slide${i === 0 ? ' active' : ''}" data-index="${i}">
        ${image ? `<img src="${image}" alt="${title}" class="cert-image" />` : ''}
        <div class="cert-slide-info">
          <h3>${title}</h3>
          <p class="muted">${subtitle}</p>
          <div class="cert-actions">${verifyBtn}${downloadBtn}</div>
        </div>
      </div>`;
    }).join('');

    const dots = certs.map((_, i) =>
      `<button class="cert-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to certificate ${i + 1}"></button>`
    ).join('');

    el.innerHTML = `
      <div class="cert-carousel">
        <button class="cert-nav cert-prev" aria-label="Previous certificate">&#8249;</button>
        <div class="cert-slides">
          <div class="cert-track">${slidesHtml}</div>
        </div>
        <button class="cert-nav cert-next" aria-label="Next certificate">&#8250;</button>
      </div>
      <div class="cert-dots">${dots}</div>
    `;

    let current = 0;
    const track = el.querySelector('.cert-track');
    const slideEls = el.querySelectorAll('.cert-slide');
    const dotEls = el.querySelectorAll('.cert-dot');
    const slidesContainer = el.querySelector('.cert-slides');

    function getOffset(idx) {
      const containerCenter = 50;
      const slideCenter = slideWidth / 2;
      return -(idx * slideWidth) + containerCenter - slideCenter;
    }

    function goTo(idx) {
      slideEls[current].classList.remove('active');
      dotEls[current].classList.remove('active');
      current = ((idx % n) + n) % n;
      slideEls[current].classList.add('active');
      dotEls[current].classList.add('active');
      track.style.transform = `translateX(${getOffset(current)}%)`;
    }

    track.style.transform = `translateX(${getOffset(0)}%)`;

    el.querySelector('.cert-prev').addEventListener('click', () => goTo(current - 1));
    el.querySelector('.cert-next').addEventListener('click', () => goTo(current + 1));
    dotEls.forEach((dot) => {
      dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
    });

    slideEls.forEach((slide) => {
      slide.addEventListener('click', () => {
        const idx = Number(slide.dataset.index);
        if (idx !== current) goTo(idx);
      });
    });

    // Drag/swipe support
    let startX = 0;
    let isDragging = false;

    slidesContainer.style.cursor = 'grab';
    slidesContainer.style.userSelect = 'none';

    slidesContainer.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      isDragging = true;
      slidesContainer.style.cursor = 'grabbing';
    });

    slidesContainer.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      if (Math.abs(e.clientX - startX) > 10) {
        slidesContainer.setPointerCapture(e.pointerId);
      }
    });

    slidesContainer.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      slidesContainer.style.cursor = 'grab';
      const diff = e.clientX - startX;
      if (Math.abs(diff) > 40) {
        goTo(diff > 0 ? current - 1 : current + 1);
      }
    });

    slidesContainer.addEventListener('pointercancel', () => {
      isDragging = false;
      slidesContainer.style.cursor = 'grab';
    });

    slidesContainer.addEventListener('dragstart', (e) => e.preventDefault());

    // Horizontal scroll support
    let wheelLocked = false;
    slidesContainer.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < 15 || Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      goTo(e.deltaX > 0 ? current + 1 : current - 1);
      setTimeout(() => { wheelLocked = false; }, 800);
    }, { passive: false });
  }

  populateContact() {
    const contact = this.data.contact;
    if (!contact) return;

    const el = document.getElementById('contact-inner');
    if (!el) return;

    const email = contact.email || '';
    const phone = contact.phone_primary || '';
    const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : '#';

    el.innerHTML = `
      <p class="contact-lede">Open to conversations about <strong>platform engineering</strong>, <strong>Kubernetes</strong>, and <strong>reliable cloud operations</strong>.</p>
      <div class="contact-direct" aria-label="Email and phone">
        <p class="contact-direct-hint">Click a value to select all, or use Copy.</p>
        <div class="contact-row">
          <span class="contact-label">Email</span>
          <span class="contact-value" tabindex="0" title="Click to select">${escapeHtml(email)}</span>
          <button type="button" class="copy-btn js-copy" data-copy="${escapeAttr(email)}">Copy</button>
          <a class="contact-chip action" href="mailto:${escapeAttr(email)}">Mail</a>
        </div>
        <div class="contact-row">
          <span class="contact-label">Phone</span>
          <span class="contact-value" tabindex="0" title="Click to select">${escapeHtml(phone)}</span>
          <button type="button" class="copy-btn js-copy" data-copy="${escapeAttr(phone)}">Copy</button>
          <a class="contact-chip action" href="${escapeAttr(telHref)}">Call</a>
        </div>
      </div>
      <div class="contact-links">
        <a class="contact-chip" href="${contact.linkedin || '#'}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a class="contact-chip" href="${contact.hackerrank || '#'}" target="_blank" rel="noopener noreferrer">HackerRank</a>
        ${
          contact.portfolio
            ? `<a class="contact-chip" href="${escapeAttr(contact.portfolio)}" target="_blank" rel="noopener noreferrer">Portfolio</a>`
            : ''
        }
      </div>
    `;

    el.querySelectorAll('.contact-value').forEach((span) => {
      span.addEventListener('click', () => {
        const range = document.createRange();
        range.selectNodeContents(span);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });

    el.querySelectorAll('.js-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        if (!text) return;
        const prevLabel = btn.textContent;
        const done = () => {
          btn.textContent = 'Copied';
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = prevLabel;
            btn.disabled = false;
          }, 1600);
        };
        const fallback = () => {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          document.body.appendChild(ta);
          ta.select();
          try {
            return document.execCommand('copy');
          } catch {
            return false;
          } finally {
            document.body.removeChild(ta);
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(() => {
            if (fallback()) done();
          });
        } else if (fallback()) {
          done();
        }
      });
    });
  }

  populateFooter() {
    const footer = this.data.footer;
    if (!footer) return;

    const nameEl = document.getElementById('footer-name');
    if (nameEl && footer.name) nameEl.textContent = footer.name;

    const msgEl = document.getElementById('footer-message');
    if (msgEl && footer.message) msgEl.textContent = footer.message;
  }

  async loadLeetCodeChart() {
    if (!ENABLE_LEETCODE) return;
    try {
      const response = await fetch(`leetcode-rank-data.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        this.scrollToHashIfNeeded();
        return;
      }

      const rankData = await response.json();
      if (!rankData.data || rankData.data.length === 0) {
        this.scrollToHashIfNeeded();
        return;
      }

      this.renderLeetCodeChart(rankData.data);
      this.updateLeetCodeStats(rankData.data);
      this.scrollToHashIfNeeded();
    } catch (error) {
      console.error('Error loading LeetCode rank data:', error);
      this.scrollToHashIfNeeded();
    }
  }

  scrollToHashIfNeeded() {
    const hash = window.location.hash;
    if (!hash) return;
    const headerEl = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 72;
    const offset = headerEl + 12;
    setTimeout(() => {
      const target = document.querySelector(hash);
      if (target) {
        const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, hash === '#leetcode' ? 280 : 80);
  }

  renderLeetCodeChart(data) {
    const ctx = document.getElementById('leetcodeChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#38bdf8';
    const textColor = cs.getPropertyValue('--text').trim();
    const mutedColor = cs.getPropertyValue('--muted').trim();
    const cardColor = cs.getPropertyValue('--surface').trim();
    const borderColor = cs.getPropertyValue('--border').trim();

    let accentFill = 'rgba(56, 189, 248, 0.12)';
    if (accent.startsWith('#')) {
      const hex = accent.slice(1);
      const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
      const n = parseInt(full, 16);
      if (!Number.isNaN(n)) {
        accentFill = `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.12)`;
      }
    }

    const rankByDate = {};
    data.forEach((entry) => {
      const date = entry.date;
      if (!rankByDate[date] || entry.rank < rankByDate[date]) {
        rankByDate[date] = entry.rank;
      }
    });

    const sortedDates = Object.keys(rankByDate).sort((a, b) => new Date(a) - new Date(b));
    const dates = sortedDates;
    const ranks = sortedDates.map((date) => rankByDate[date]);
    const isInverted = ranks.length > 0 && ranks[0] > 1000;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'LeetCode rank',
            data: ranks,
            borderColor: accent,
            backgroundColor: accentFill,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: accent,
            pointBorderColor: cardColor,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: textColor, font: { size: 12, family: 'Plus Jakarta Sans, sans-serif' } },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: cardColor,
            titleColor: textColor,
            bodyColor: textColor,
            borderColor,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(ctx) {
                return `Rank: ${ctx.parsed.y.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: mutedColor,
              maxRotation: 45,
              minRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
              callback(value, index) {
                const date = dates[index];
                if (!date) return '';
                const d = new Date(date);
                return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
              },
            },
            grid: { color: borderColor },
          },
          y: {
            reverse: isInverted,
            ticks: {
              color: mutedColor,
              callback(val) {
                return val.toLocaleString();
              },
            },
            grid: { color: borderColor },
          },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
      },
    });
  }

  updateLeetCodeStats(data) {
    if (!data || data.length === 0) return;

    const rankByDate = {};
    data.forEach((entry) => {
      const date = entry.date;
      const rankNum = Number(entry.rank);
      if (!rankByDate[date] || rankNum < rankByDate[date]) {
        rankByDate[date] = rankNum;
      }
    });

    const sortedDates = Object.keys(rankByDate).sort((a, b) => new Date(a) - new Date(b));
    const latestDate = sortedDates[sortedDates.length - 1];
    const currentDayRanks = data
      .filter((d) => d.date === latestDate)
      .map((d) => Number(d.rank))
      .filter((n) => Number.isFinite(n));
    const currentRank = currentDayRanks.length ? Math.min(...currentDayRanks) : rankByDate[latestDate];
    const bestRank = Math.min(...Object.values(rankByDate));
    const daysTracked = sortedDates.length;

    const cur = document.getElementById('currentRank');
    if (cur) cur.textContent = currentRank.toLocaleString();
    const best = document.getElementById('bestRank');
    if (best) best.textContent = bestRank.toLocaleString();
    const days = document.getElementById('daysTracked');
    if (days) days.textContent = daysTracked;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loader = new PortfolioDataLoader();
  loader.loadData();
});
