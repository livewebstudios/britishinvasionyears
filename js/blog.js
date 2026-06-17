/* ============================================================
   THE BRITISH INVASION YEARS — blog.js
   Renders the blog index (blog.html) and single posts (post.html)
   from window.BIY_POSTS (js/blog-data.js). Pure vanilla, no fetch —
   works on any host and from file://. Decap will eventually manage the
   source content; re-run gen-blog.js to regenerate blog-data.js.
   ============================================================ */
(function () {
  'use strict';

  var POSTS = window.BIY_POSTS || [];

  // Categories hidden from the blog index (posts kept in data, just not displayed).
  var HIDDEN_CATEGORIES = { 'show-announcement': true };
  var VISIBLE = POSTS.filter(function (p) { return !HIDDEN_CATEGORIES[p.category]; });

  /* ---------- tiny markdown ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, t, u) {
      var ext = /^https?:/i.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + '</a>';
    });
    return s;
  }
  function bodyToHtml(body) {
    return body.split(/\n{2,}/).map(function (para) {
      return '<p>' + inline(para).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return iso || '';
    return MONTHS[parseInt(m[2], 10) - 1] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
  }

  function cardHtml(p, feature) {
    var href = 'post.html?slug=' + encodeURIComponent(p.slug);
    return '<article class="post-card card-glow' + (feature ? ' feature' : '') + '">' +
      '<a class="post-thumb" href="' + href + '"><img src="' + p.image + '" alt="' + esc(p.title) + '" loading="lazy"></a>' +
      '<div class="post-body">' +
        '<span class="post-cat">' + esc(p.categoryLabel) + '</span>' +
        '<div class="post-meta">' + fmtDate(p.date) + '</div>' +
        '<h3><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
        '<p class="post-excerpt">' + esc(p.excerpt) + '</p>' +
        '<a class="textlink" href="' + href + '">Read More &rarr;</a>' +
      '</div>' +
    '</article>';
  }

  /* ============================================================
     BLOG INDEX
     ============================================================ */
  var grid = document.getElementById('blogGrid');
  if (grid) {
    var filtersEl = document.getElementById('blogFilters');
    var featureEl = document.getElementById('blogFeature');
    var state = { filter: 'all' };

    // unique categories in date order of appearance (hidden categories excluded)
    var cats = [];
    VISIBLE.forEach(function (p) { if (cats.indexOf(p.category) === -1) cats.push(p.category); });

    if (filtersEl) {
      var chips = ['<button class="blog-filter active" data-cat="all">All</button>'];
      cats.forEach(function (c) {
        var label = (VISIBLE.filter(function (p) { return p.category === c; })[0] || {}).categoryLabel || c;
        chips.push('<button class="blog-filter" data-cat="' + c + '">' + esc(label) + '</button>');
      });
      filtersEl.innerHTML = chips.join('');
      filtersEl.addEventListener('click', function (e) {
        var btn = e.target.closest('.blog-filter');
        if (!btn) return;
        state.filter = btn.getAttribute('data-cat');
        filtersEl.querySelectorAll('.blog-filter').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        render();
      });
    }

    function render() {
      var featured = VISIBLE.filter(function (p) { return p.featured; })[0] || null;
      var list = VISIBLE.slice();

      if (state.filter === 'all') {
        if (featureEl && featured) {
          featureEl.innerHTML = cardHtml(featured, true);
          featureEl.style.display = '';
          list = list.filter(function (p) { return p.slug !== featured.slug; });
        }
      } else {
        if (featureEl) { featureEl.innerHTML = ''; featureEl.style.display = 'none'; }
        list = list.filter(function (p) { return p.category === state.filter; });
      }

      grid.innerHTML = list.length
        ? list.map(function (p) { return cardHtml(p, false); }).join('')
        : '<p class="blog-empty">No posts in this category yet — check back soon.</p>';

      // animate in
      grid.querySelectorAll('.post-card').forEach(function (el) {
        if (window.LWS && window.LWS.observe) window.LWS.observe(el);
      });
      if (featureEl && window.LWS && window.LWS.observe) {
        featureEl.querySelectorAll('.post-card').forEach(window.LWS.observe);
      }
    }
    render();
  }

  /* ============================================================
     SINGLE POST
     ============================================================ */
  var article = document.getElementById('postArticle');
  if (article) {
    var slug = new URLSearchParams(window.location.search).get('slug');
    var post = POSTS.filter(function (p) { return p.slug === slug; })[0];

    if (!post) {
      article.innerHTML = '<div class="post-article" style="text-align:center">' +
        '<h1>Post Not Found</h1>' +
        '<p class="post-excerpt" style="color:var(--ink)">We couldn\'t find that article.</p>' +
        '<div class="post-back"><a class="textlink" href="blog.html">&larr; Back to the Blog</a></div>' +
        '</div>';
      return;
    }

    document.title = post.title + ' — The British Invasion Years';
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', post.excerpt);

    var tagsHtml = (post.tags && post.tags.length)
      ? '<div class="post-tags">' + post.tags.map(function (t) {
          return '<span class="tag">' + esc(t.replace(/-/g, ' ')) + '</span>';
        }).join('') + '</div>'
      : '';

    article.innerHTML =
      '<span class="post-cat">' + esc(post.categoryLabel) + '</span>' +
      '<h1>' + esc(post.title) + '</h1>' +
      '<div class="post-meta">' + fmtDate(post.date) + '</div>' +
      '<img class="post-hero" src="' + post.image + '" alt="' + esc(post.title) + '">' +
      '<div class="post-content">' + bodyToHtml(post.body) + '</div>' +
      tagsHtml +
      '<div class="post-back"><a class="textlink" href="blog.html">&larr; Back to the Blog</a></div>';
  }

})();
