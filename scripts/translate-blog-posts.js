#!/usr/bin/env node
/**
 * One-time migration script: translate blog posts to English.
 * Uses Anthropic API to translate title, excerpt, and content.
 *
 * Usage: ANTHROPIC_API_KEY=sk-... node scripts/translate-blog-posts.js [--all | --count N]
 *
 * Options:
 *   --all      Translate all posts (default: only posts without titleEn)
 *   --count N  Translate only N posts at a time (default: 5)
 *   --dry-run  Show what would be translated without making changes
 *
 * The script saves progress after each post, so it can be interrupted and resumed.
 */

const fs = require('fs');
const path = require('path');

const BLOG_FILE = path.join(__dirname, '..', 'data', 'blog-posts.json');
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const countIdx = args.indexOf('--count');
const batchSize = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 5;
const translateAll = args.includes('--all');

async function callClaude(apiKey, prompt, maxTokens = 4096) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok || !data.content || !data.content[0]) {
    throw new Error('API error: ' + JSON.stringify(data));
  }
  return data.content[0].text;
}

function buildTranslationPrompt(post) {
  return `Translate the following Polish blog post about voiceover/recording services into English.
The post is from powitania.pl — a professional voiceover studio.

IMPORTANT RULES:
- Maintain the same HTML structure (tags, classes, etc.)
- Keep brand names unchanged (Powitania.pl, etc.)
- Keep Polish proper names (person names) unchanged
- Use professional voiceover/audio industry terminology
- The translation should sound natural, not literal
- Return ONLY the JSON object, no other text

Translate these three fields:

Title (PL): ${post.title}
Excerpt (PL): ${post.excerpt}
Content (PL): ${post.content}

Return a JSON object with exactly these keys:
{
  "titleEn": "English title here",
  "excerptEn": "English excerpt here",
  "contentEn": "English HTML content here"
}`;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: Set ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  let posts = JSON.parse(fs.readFileSync(BLOG_FILE, 'utf8'));

  // Find posts that need translation
  const toTranslate = translateAll
    ? posts
    : posts.filter(p => !p.titleEn);

  const batch = toTranslate.slice(0, batchSize);

  console.log(`Found ${toTranslate.length} posts to translate, processing ${batch.length} in this batch.`);
  if (isDryRun) {
    batch.forEach((p, i) => console.log(`  ${i + 1}. ${p.title} (${p.content.length} chars)`));
    console.log('Dry run — no changes made.');
    return;
  }

  let translated = 0;
  for (const post of batch) {
    console.log(`\nTranslating: "${post.title}" (${post.content.length} chars)...`);

    try {
      const prompt = buildTranslationPrompt(post);
      const maxTokens = Math.max(4096, Math.ceil(post.content.length * 1.5));
      const result = await callClaude(apiKey, prompt, Math.min(maxTokens, 8192));

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = result.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const translation = JSON.parse(jsonStr);

      // Find and update the post in the original array
      const idx = posts.findIndex(p => p.slug === post.slug);
      if (idx !== -1) {
        posts[idx].titleEn = translation.titleEn;
        posts[idx].excerptEn = translation.excerptEn;
        posts[idx].contentEn = translation.contentEn;
      }

      // Save after each post (resume-safe)
      fs.writeFileSync(BLOG_FILE, JSON.stringify(posts, null, 2), 'utf8');

      translated++;
      console.log(`  ✓ Done (titleEn: "${translation.titleEn.substring(0, 60)}...")`);

      // Small delay between API calls
      if (translated < batch.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`  ✗ Error translating "${post.title}":`, err.message);
      // Continue with next post
    }
  }

  console.log(`\n=== Done: ${translated}/${batch.length} posts translated ===`);
  if (toTranslate.length > batchSize) {
    console.log(`Run again to translate the next batch (${toTranslate.length - batchSize} remaining).`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
