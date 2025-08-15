# Umesh Gaikwad - Portfolio

A clean, fast, and maintainable portfolio website built with vanilla HTML, CSS, and JavaScript. All content is managed through a YAML configuration file for easy updates.

## Features

- **YAML-based content management** - Easy to update information without touching HTML
- **Responsive design** - Works on all devices
- **Dark/Light theme toggle** - User preference is saved
- **Fast loading** - No frameworks, just vanilla web technologies
- **Accessible** - Semantic HTML and keyboard navigation
- **Modern styling** - CSS Grid, Flexbox, and custom properties

## File Structure

```
profile/
├── index.html          # Main HTML file (minimal structure)
├── data.yaml           # ✅ EDIT HERE - All portfolio content (YAML format)
├── data-loader.js      # JavaScript to load YAML data
└── README.md           # This file
```

## How to Update Content

### Workflow:
1. **Edit `data.yaml`** - Make your changes in the human-readable YAML format
2. **Refresh browser** - Your changes will appear instantly!

**That's it!** No scripts to run, no conversion needed.

### 1. Personal Information
Edit the `personal` section in `data.yaml`:
```yaml
personal:
  name: "Your Name"
  title: "Your Title"
  description: "Your description"
  quick_facts:
    - "Fact 1"
    - "Fact 2"
  skills_tags:
    - "Skill 1"
    - "Skill 2"
```

### 2. Projects
Add or modify projects in the `projects` section:
```yaml
projects:
  - title: "Project Name"
    description: "Project description"
    tags: ["Tag1", "Tag2"]
    link: "https://github.com/..."
    link_text: "View Project →"
```

### 3. Skills
Update skills in the `skills` section:
```yaml
skills:
  - category: "Category Name"
    description: "Skill description"
  - category: "Another Category"
    items:
      - "Item 1"
      - "Item 2"
```

### 4. Experience
Modify work experience in the `experience` section:
```yaml
experience:
  - company: "Company Name"
    role: "Job Title"
    period: "Duration"
    location: "Location"
    description: "Brief description"
    items:
      - "Achievement 1"
      - "Achievement 2"
```

### 5. Contact Information
Update contact details in the `contact` section:
```yaml
contact:
  email_primary: "your.email@example.com"
  phone_primary: "+1234567890"
  linkedin: "https://linkedin.com/in/..."
  # ... other contact methods
```

## Adding New Sections

To add a new section:

1. Add the data structure to `data.yaml`
2. Add the HTML structure to `index.html` (with loading placeholders)
3. Add the population logic to `data-loader.js`

## Local Development

1. Clone or download the files
2. Open `index.html` in a web browser (or serve with `python3 -m http.server 8000`)
3. The page will automatically load content from `data.yaml`

## Quick Updates

Just edit `data.yaml` and refresh your browser - changes appear instantly!

## Deployment

The portfolio can be deployed to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

Just upload all files and the portfolio will work immediately.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- No Internet Explorer support (uses modern CSS features)

## Customization

### Styling
All styles are in the `<style>` section of `index.html`. You can modify:
- Colors (CSS custom properties)
- Layout (Grid/Flexbox)
- Typography
- Animations

### Functionality
The JavaScript handles:
- YAML data loading
- Theme switching
- Keyboard shortcuts
- Dynamic content population

## License

This portfolio template is free to use and modify for personal and commercial projects.
