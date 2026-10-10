// WF-interview "Site text": plain text of the public page the user gave (first turn only). Scripts, styles and tags are removed.
// Only http(s) URLs to public hosts are accepted; the page content is treated as untrusted data by the interviewer prompt.
const res = $input.first().json || {};
let html = '';
if (typeof res.body === 'string') html = res.body;
else if (typeof res.data === 'string') html = res.data;
const text = html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 6000);
return [{ json: { text } }];
