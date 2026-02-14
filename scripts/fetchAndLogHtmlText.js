// Script: fetchAndLogHtmlText.js
// Description: Fetches a URL, extracts text using extractTextFromHtml, and writes it to a log file.



const fs = require('fs');
const path = require('path');

// Native fetch in Node.js v18+
async function fetchWebpage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    return html;
  } catch (error) {
    console.error(`Error fetching webpage: ${error.message}`);
    throw error;
  }
}


function extractTextFromHtml(html, url) {
  // Only for znaci.org URLs: extract all <p> tags within <div id="hronologija-sadrzaj">
  if (/https?:\/\/(www\.)?znaci\.org\//.test(url)) {
    console.log('[extractTextFromHtml] Matched znaci.org domain.');
    const divMatch = html.match(/<div[^>]+id=["']hronologija-sadrzaj["'][^>]*>([\s\S]*?)<\/div>/i);
    if (divMatch) {
      console.log('[extractTextFromHtml] Found hronologija-sadrzaj div.');
      const divContent = divMatch[1];
      // Extract all <p>...</p> blocks
      const pMatches = divContent.match(/<p[\s\S]*?<\/p>/gi);
      if (pMatches && pMatches.length > 0) {
        console.log(`[extractTextFromHtml] Found ${pMatches.length} <p> tags in hronologija-sadrzaj div.`);
        // Clean each <p> block
        let allText = pMatches.map(p => {
          let t = p.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          t = t.replace(/<br\s*\/?>(?![^<]*<)/gi, '\n');
          t = t.replace(/<[^>]+>/g, ' ');
          t = t.replace(/&nbsp;/g, ' ');
          t = t.replace(/&amp;/g, '&');
          t = t.replace(/&lt;/g, '<');
          t = t.replace(/&gt;/g, '>');
          t = t.replace(/&quot;/g, '"');
          t = t.replace(/&#x27;/g, "'");
          t = t.replace(/&apos;/g, "'");
          t = t.replace(/\s+/g, ' ').trim();
          return t;
        }).join('\n');
        return allText;
      }
    }
    // If not found, fallback to empty string
    return '';
  }
  // Fallback: old extraction for other domains
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<br\s*\/>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#x27;/g, "'");
  text = text.replace(/&apos;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node fetchAndLogHtmlText.js <URL>');
  process.exit(1);
}

async function fetchAndLogHtmlText(url) {
  try {
    const html = await fetchWebpage(url);
    const text = extractTextFromHtml(html, url);
    const logFilename = `html_text_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const logPath = path.resolve(__dirname, '..', 'public', 'assets', 'brigades', 'model_test', logFilename);
    fs.writeFileSync(logPath, text, 'utf8');
    console.log(`Text extracted and saved to: ${logPath}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchAndLogHtmlText(url);
