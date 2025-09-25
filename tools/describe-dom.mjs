import puppeteer from 'puppeteer';

(async () => {
  const url = 'http://localhost:8080/';
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

  const result = await page.evaluate(() => {
    function cs(el, prop) { return window.getComputedStyle(el).getPropertyValue(prop); }
    const body = document.body;
    const bodyStyles = {
      display: cs(body, 'display'),
      visibility: cs(body, 'visibility'),
      opacity: cs(body, 'opacity'),
      width: body.getBoundingClientRect().width,
      height: body.getBoundingClientRect().height,
      classes: Array.from(body.classList)
    };

    const topChildren = Array.from(body.children).slice(0, 10).map(el => ({
      tag: el.tagName,
      id: el.id || null,
      class: el.className || null,
      textLength: el.textContent ? el.textContent.trim().length : 0,
      display: cs(el, 'display'),
      visibility: cs(el, 'visibility'),
      opacity: cs(el, 'opacity'),
      rect: el.getBoundingClientRect ? {
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
        x: Math.round(el.getBoundingClientRect().x),
        y: Math.round(el.getBoundingClientRect().y)
      } : null
    }));

    const news = document.getElementById('news') || document.getElementById('news-container') || null;
    const newsContainer = document.getElementById('news-container');
    const contactForm = document.getElementById('contact-form');

    // find elements with computed opacity 0 or display none or visibility hidden
    const hiddenEls = Array.from(document.querySelectorAll('body *')).filter(el => {
      const s = window.getComputedStyle(el);
      return s && (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0);
    }).slice(0, 20).map(el => ({ tag: el.tagName, id: el.id || null, class: el.className || null, display: window.getComputedStyle(el).display, visibility: window.getComputedStyle(el).visibility, opacity: window.getComputedStyle(el).opacity }));

    return {
      url: location.href,
      title: document.title,
      bodyTextLength: document.body.textContent ? document.body.textContent.trim().length : 0,
      bodyStyles,
      topChildren,
      newsContainerExists: !!newsContainer,
      newsContainerChildCount: newsContainer ? newsContainer.children.length : 0,
      newsContainerTextLength: newsContainer ? (newsContainer.textContent || '').trim().length : 0,
      contactFormExists: !!contactForm,
      contactFormFields: contactForm ? Array.from(contactForm.querySelectorAll('input,textarea,select')).map(i => ({ id: i.id, name: i.name, type: i.type || i.tagName })) : [],
      hiddenSample: hiddenEls,
      htmlLength: document.documentElement.innerHTML.length
    };
  });

  await browser.close();
  console.log(JSON.stringify(result, null, 2));
})();
