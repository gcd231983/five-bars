# Publish a Five Bars article

1. Draft privately. Only put approved, public-facing material under `site/`. Never place rough drafts, reader submissions, quote screenshots or account details there.
2. Add `site/articles/<slug>.html`; start with the first Switch Receipt for the layout. Use a unique lowercase, hyphenated slug, canonical URL, byline, published date and evidence box. Clearly separate hypothetical math, published terms, observed checkout and firsthand testing. Keep download links relative to the article.
3. Add an entry in `editorial/articles.json` with slug, headline, one-sentence summary, author, publication date (YYYY-MM-DD), and series name. The listing orders the newest items first, and the sitemap uses each article's publication date.
4. From the repository root, run `node scripts/build-comparisons.mjs` and `node --test tests/*.test.mjs`. Commit the approved article, assets, index metadata, generated `site/articles.html` and `site/sitemap.xml` in one PR.
5. After CI and GitHub Pages deployment pass, open the main site's Articles link and verify the new page and any download. Share the live canonical article URL, not the private preview URL.
