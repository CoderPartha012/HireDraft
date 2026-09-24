import { load } from 'cheerio';

export function descriptionText(html) {
  if (typeof html !== 'string') return null;
  const $ = load(html);
  $('script, style, noscript, iframe, button').remove();
  const walk = node => {
    if (node.type === 'text') return node.data;
    if (node.name === 'br') return '\n';
    const content = (node.children || []).map(walk).join('');
    if (node.name === 'li') return `\n• ${content.trim()}\n`;
    if (['p', 'div', 'section', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4'].includes(node.name)) return `\n${content}\n`;
    return content;
  };
  return walk($.root()[0]).replace(/\r/g, '').replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() || null;
}
