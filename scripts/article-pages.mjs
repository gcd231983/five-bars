// The index is an allowlist of published human-authored articles.
// Drafts stay outside site/ and are never deployed by this generator.
import {readFileSync} from 'node:fs';

export const ARTICLE_INDEX='articles.html';
const base='https://fivebars.info/';
const manifest=new URL('../editorial/articles.json',import.meta.url);
const escape=(value)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateFormatter=new Intl.DateTimeFormat('en-US',{dateStyle:'long',timeZone:'UTC'});
export const articlePath=slug=>'articles/'+slug+'.html';
const isDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;

export function parseArticleIndex(input){
 if(!Array.isArray(input))throw Error('Article index must be an array');
 const slugs=new Set();
 for(const row of input){
  if(!row||typeof row.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)||slugs.has(row.slug)||
   !isDate(row.published)||!['title','summary','author','series'].every(key=>typeof row[key]==='string'&&row[key].trim()))
   throw Error('Invalid or duplicate article metadata: '+String(row?.slug));
  slugs.add(row.slug);
 }
 return [...input].sort((a,b)=>b.published.localeCompare(a.published)||a.slug.localeCompare(b.slug));
}

export function readArticleIndex(){return parseArticleIndex(JSON.parse(readFileSync(manifest,'utf8')));}

export function renderArticleIndex(articles){
 const entries=parseArticleIndex(articles).map(row=>`   <li class="panel">
    <p class="eyebrow">${escape(row.series)}</p>
    <h2><a href="${articlePath(row.slug)}">${escape(row.title)}</a></h2>
    <p>${escape(row.summary)}</p>
    <p class="archive-meta">By ${escape(row.author)} · <time datetime="${row.published}">${dateFormatter.format(new Date(row.published))}</time></p>
   </li>`).join('\n');
 return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Read The Switch Receipt and other bylined Five Bars articles on phone upgrades, carrier plans, and what they really cost.">
<title>Articles and The Switch Receipt | Five Bars</title>
<link rel="canonical" href="${base+ARTICLE_INDEX}">
<link rel="icon" type="image/svg+xml" href="five-bars-mark.svg">
<link rel="stylesheet" href="articles/receipt.css">
</head>
<body>
<a class="skip" href="#articles">Skip to articles</a>
<header class="mast"><div class="frame mast-inner"><a class="brand" href="./"><img src="five-bars-mark.svg" width="34" height="30" alt="">Five Bars</a><nav aria-label="Site navigation"><a class="preview" href="./#switch">Switch &amp; Save</a></nav></div></header>
<main class="frame archive" id="articles">
 <p class="eyebrow">FIVE BARS EDITORIAL</p>
 <h1>Articles</h1>
 <p class="standfirst">In The Switch Receipt, Gian De Cecco works through a phone or plan decision, shows the math, and explains what would change his answer.</p>
 ${entries?'<ul class="archive-list">\n'+entries+'\n </ul>':'<p>No articles published yet.</p>'}
</main>
<footer class="frame footer"><span>Five Bars · Better wireless. Less guesswork.</span><nav aria-label="Editorial links"><a href="about.html">About Five Bars</a><a href="editorial.html">Editorial standards</a><a href="report.html">Report a correction</a></nav></footer>
</body>
</html>
`;
}
