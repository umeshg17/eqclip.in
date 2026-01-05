// YAML Data Loader for Portfolio
class PortfolioDataLoader {
  constructor() {
    this.data = null;
  }

  async loadData() {
    try {
      // Load YAML directly
      const response = await fetch('data.yaml');
      const yamlText = await response.text();
      console.log('Raw YAML text:', yamlText.substring(0, 500) + '...'); // Debug log
      
      // Use js-yaml library for reliable parsing
      this.data = this.parseYAML(yamlText);
      console.log('Parsed YAML data:', this.data); // Debug log
      console.log('Projects data:', this.data.projects); // Debug log
      this.populatePortfolio();
    } catch (error) {
      console.error('Error loading YAML data:', error);
      this.showError();
    }
  }

  parseYAML(yamlText) {
    // Use js-yaml library for reliable parsing
    try {
      if (typeof jsyaml !== 'undefined') {
        return jsyaml.load(yamlText);
      } else {
        console.error('js-yaml library not loaded');
        throw new Error('js-yaml library not available');
      }
    } catch (error) {
      console.error('Error parsing YAML:', error);
      throw error;
    }
  }

  showError() {
    // Show error message if data loading fails
    const errorMsg = 'Error loading portfolio data. Please check the console for details.';
    document.querySelector('.pill').textContent = errorMsg;
    document.querySelector('h1').innerHTML = `Hi, I'm <span style="background:linear-gradient(135deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent">Error</span>.`;
  }

  populatePortfolio() {
    if (!this.data) {
      console.error('No data loaded');
      return;
    }

    console.log('Populating portfolio with data:', this.data);

    // Populate personal info
    this.populatePersonalInfo();
    
    // Populate projects
    this.populateProjects();
    
    // Populate skills
    this.populateSkills();
    
    // Populate highlights
    this.populateHighlights();
    
    // Populate experience
    this.populateExperience();
    
    // Populate contact
    this.populateContact();
    
    // Populate footer
    this.populateFooter();
    
    // Load LeetCode rank chart
    this.loadLeetCodeChart();
  }

  populatePersonalInfo() {
    const personal = this.data.personal;
    if (!personal) {
      console.error('No personal data found');
      return;
    }

    console.log('Populating personal info:', personal);

    // Update title
    const pillElement = document.querySelector('.pill');
    if (pillElement && personal.title) {
      pillElement.textContent = personal.title;
    }
    
    // Update name in h1
    const h1 = document.querySelector('h1');
    if (h1 && personal.name) {
      h1.innerHTML = `Hi, I'm <span style="background:linear-gradient(135deg,var(--accent),var(--accent-2)); -webkit-background-clip:text; background-clip:text; color:transparent">${personal.name}</span>`;
    }
    
    // Update description
    const kickerElement = document.querySelector('.kicker');
    if (kickerElement && personal.description) {
      // Convert text to links using the auto_links mapping from data.yaml
      let descriptionWithLinks = personal.description;
      console.log('Original description:', descriptionWithLinks);
      console.log('Auto links data:', this.data.auto_links);
      
      if (this.data.auto_links) {
        Object.entries(this.data.auto_links).forEach(([text, url]) => {
          console.log(`Processing link: "${text}" -> "${url}"`);
          const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          const before = descriptionWithLinks;
          descriptionWithLinks = descriptionWithLinks.replace(regex, `<a href="${url}" target="_blank">${text}</a>`);
          console.log(`Before: "${before}", After: "${descriptionWithLinks}"`);
        });
      }
      console.log('Final description with links:', descriptionWithLinks);
      kickerElement.innerHTML = descriptionWithLinks;
    }
    
    // Update quick facts
    const quickFactsList = document.querySelector('.card ul');
    if (quickFactsList && personal.quick_facts && Array.isArray(personal.quick_facts)) {
      quickFactsList.innerHTML = personal.quick_facts.map(fact => `<li>${fact}</li>`).join('');
    }
    
    // Update skills tags
    const tagsContainer = document.querySelector('.card div[style*="display:flex"]');
    if (tagsContainer && personal.skills_tags && Array.isArray(personal.skills_tags)) {
      tagsContainer.innerHTML = personal.skills_tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }
  }

  populateProjects() {
    const projects = this.data.projects;
    console.log('Raw projects data:', projects);
    console.log('Projects type:', typeof projects);
    console.log('Is array:', Array.isArray(projects));
    
    if (!projects || !Array.isArray(projects)) {
      console.error('No projects data found or not an array');
      return;
    }

    console.log('Populating projects:', projects);
    console.log('First project:', projects[0]);
    console.log('First project title:', projects[0]?.title);

    const projectsContainer = document.querySelector('#projects .grid');
    if (!projectsContainer) {
      console.error('Projects container not found');
      return;
    }

    projectsContainer.innerHTML = projects.map(project => `
      <article class="card project">
        <h3>${project.title || 'Untitled Project'}</h3>
        <p class="muted">${project.description || 'No description available'}</p>
        <p>${Array.isArray(project.tags) ? project.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ') : ''}</p>
        <a class="btn ghost" href="${project.link || '#'}">${project.link_text || 'View →'}</a>
      </article>
    `).join('');
  }

  populateSkills() {
    const skills = this.data.skills;
    if (!skills || !Array.isArray(skills)) {
      console.error('No skills data found or not an array');
      return;
    }

    console.log('Populating skills:', skills);

    const skillsContainer = document.querySelector('#skills .grid');
    if (!skillsContainer) {
      console.error('Skills container not found');
      return;
    }

    skillsContainer.innerHTML = skills.map(skill => `
      <div class="card">
        <h3>${skill.category || 'Unknown Category'}</h3>
        ${skill.items && Array.isArray(skill.items) ? 
          `<ul class="muted">${skill.items.map(item => `<li>${item}</li>`).join('')}</ul>` :
          `<p class="muted">${skill.description || 'No description available'}</p>`
        }
      </div>
    `).join('');
  }

  populateHighlights() {
    const highlights = this.data.highlights;
    if (!highlights || !Array.isArray(highlights)) {
      console.error('No highlights data found or not an array');
      return;
    }

    console.log('Populating highlights:', highlights);

    const highlightsContainer = document.querySelector('#highlights .grid');
    if (!highlightsContainer) {
      console.error('Highlights container not found');
      return;
    }

    highlightsContainer.innerHTML = highlights.map(highlight => `
      <div class="card">
        <h3>${highlight.title || 'Untitled Highlight'}</h3>
        <ul class="muted">
          ${Array.isArray(highlight.items) ? highlight.items.map(item => `<li>${item}</li>`).join('') : '<li>No items available</li>'}
        </ul>
      </div>
    `).join('');
  }

  populateExperience() {
    const experience = this.data.experience;
    if (!experience || !Array.isArray(experience)) {
      console.error('No experience data found or not an array');
      return;
    }

    console.log('Populating experience:', experience);

    const experienceContainer = document.querySelector('#experience .timeline');
    if (!experienceContainer) {
      console.error('Experience container not found');
      return;
    }

    experienceContainer.innerHTML = experience.map(exp => `
      <div class="tl-item">
        <h3>${exp.company || 'Unknown Company'} — ${exp.role || 'Unknown Role'}</h3>
        <p class="muted">${exp.period || 'Unknown Period'} · ${exp.location || 'Unknown Location'}</p>
        ${exp.description ? `<p class="muted">${exp.description}</p>` : ''}
        ${exp.items && Array.isArray(exp.items) ? `<ul class="muted">${exp.items.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
        ${exp.additional_period ? `
          <p class="muted">${exp.additional_period} · ${exp.additional_location || ''} — ${exp.additional_description || ''}</p>
        ` : ''}
      </div>
    `).join('');
  }

  populateContact() {
    const contact = this.data.contact;
    if (!contact) {
      console.error('No contact data found');
      return;
    }

    console.log('Populating contact:', contact);

    const contactContainer = document.querySelector('#contact .card');
    if (!contactContainer) {
      console.error('Contact container not found');
      return;
    }

    contactContainer.innerHTML = `
              <p>Let's connect on <strong>Platform Engineering and Infrastructure Reliability</strong>.</p>
      <p>🔗 <a href="${contact.linkedin || '#'}">LinkedIn</a> · 💻 <a href="${contact.hackerrank || '#'}">HackerRank</a></p>
      <p>✉️ <a href="mailto:${contact.email || ''}">${contact.email || 'No email'}</a></p>
      <p>📞 <a href="tel:${contact.phone_primary || ''}">${contact.phone_primary || 'No phone'}</a></p>
    `;
  }

  populateFooter() {
    const footer = this.data.footer;
    if (!footer) {
      console.error('No footer data found');
      return;
    }

    console.log('Populating footer:', footer);

    const footerNameElement = document.getElementById('footer-name');
    if (footerNameElement && footer.name) {
      footerNameElement.textContent = footer.name;
    }

    const footerMessageElement = document.getElementById('footer-message');
    if (footerMessageElement && footer.message) {
      footerMessageElement.textContent = footer.message;
    }
  }

  async loadLeetCodeChart() {
    try {
      const response = await fetch('leetcode-rank-data.json');
      if (!response.ok) {
        console.warn('LeetCode rank data not available');
        return;
      }
      
      const rankData = await response.json();
      if (!rankData.data || rankData.data.length === 0) {
        console.warn('No LeetCode rank data available');
        return;
      }

      this.renderLeetCodeChart(rankData.data);
      this.updateLeetCodeStats(rankData.data);
    } catch (error) {
      console.error('Error loading LeetCode rank data:', error);
    }
  }

  renderLeetCodeChart(data) {
    const ctx = document.getElementById('leetcodeChart');
    if (!ctx) {
      console.error('Chart canvas not found');
      return;
    }

    // Group data by date and pick the lowest (best) rank for each day
    const rankByDate = {};
    data.forEach(entry => {
      const date = entry.date;
      if (!rankByDate[date] || entry.rank < rankByDate[date]) {
        rankByDate[date] = entry.rank;
      }
    });

    // Convert to arrays sorted by date
    const sortedDates = Object.keys(rankByDate).sort((a, b) => new Date(a) - new Date(b));
    const dates = sortedDates;
    const ranks = sortedDates.map(date => rankByDate[date]);

    // Determine if we should use inverted Y-axis (lower rank is better)
    const isInverted = ranks.length > 0 && ranks[0] > 1000;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'LeetCode Rank',
          data: ranks,
          borderColor: 'rgb(14, 165, 233)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(14, 165, 233)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: 'var(--text)',
              font: {
                size: 14
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'var(--card)',
            titleColor: 'var(--text)',
            bodyColor: 'var(--text)',
            borderColor: 'var(--border)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function(context) {
                return `Rank: ${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: 'var(--muted)',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'var(--border)'
            }
          },
          y: {
            reverse: isInverted,
            ticks: {
              color: 'var(--muted)',
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'var(--border)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  updateLeetCodeStats(data) {
    if (!data || data.length === 0) return;

    // Group data by date and pick the lowest (best) rank for each day
    const rankByDate = {};
    data.forEach(entry => {
      const date = entry.date;
      if (!rankByDate[date] || entry.rank < rankByDate[date]) {
        rankByDate[date] = entry.rank;
      }
    });

    // Get unique dates sorted
    const sortedDates = Object.keys(rankByDate).sort((a, b) => new Date(a) - new Date(b));
    const currentRank = rankByDate[sortedDates[sortedDates.length - 1]];
    const bestRank = Math.min(...Object.values(rankByDate));
    const daysTracked = sortedDates.length;

    const currentRankEl = document.getElementById('currentRank');
    if (currentRankEl) {
      currentRankEl.textContent = currentRank.toLocaleString();
    }

    const bestRankEl = document.getElementById('bestRank');
    if (bestRankEl) {
      bestRankEl.textContent = bestRank.toLocaleString();
    }

    const daysTrackedEl = document.getElementById('daysTracked');
    if (daysTrackedEl) {
      daysTrackedEl.textContent = daysTracked;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing portfolio loader...');
  const loader = new PortfolioDataLoader();
  loader.loadData();
});
