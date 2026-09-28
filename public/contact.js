// Add verified contact details here. Empty values never create broken links.
const contact = { email: '', linkedin: '' };
const container = document.getElementById('contact-links');
const links = [];
if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) links.push(['Email me', 'mailto:' + contact.email]);
if (/^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9_%\-]+\/?$/.test(contact.linkedin)) links.push(['Connect on LinkedIn', contact.linkedin]);
if (links.length) {
  container.replaceChildren();
  for (const [label, href] of links) {
    const a = document.createElement('a'); a.className = 'contact-link'; a.href = href;
    a.textContent = label + ' ↗';
    if (href.startsWith('https:')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    container.append(a);
  }
}
document.getElementById('year').textContent = new Date().getFullYear();
