// Smart Reads v1.2 - Feed Management and Interactivity

// RSS Feed Sources organized by category
const feedSources = {
    tech: [
        { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
        { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
        { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' }
    ],
    medicine: [
        { url: 'https://www.statnews.com/feed/', name: 'STAT News' },
        { url: 'https://www.sciencedaily.com/rss/health_medicine.xml', name: 'Science Daily Medicine' }
    ],
    business: [
        { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets' },
        { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC Top News' },
        { url: 'https://www.wsj.com/xml/rss/3_7085.xml', name: 'WSJ Business' }
    ],
    science: [
        { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'Science Daily' },
        { url: 'https://www.quantamagazine.org/feed/', name: 'Quanta Magazine' }
    ],
    sports: [
        { url: 'https://www.espn.com/espn/rss/nba/news', name: 'ESPN NBA' },
        { url: 'https://www.espn.com/espn/rss/nfl/news', name: 'ESPN NFL' },
        { url: 'https://www.espn.com/espn/rss/soccer/news', name: 'ESPN Soccer' }
    ],
    books: [
        { url: 'https://fourminutebooks.com/feed/', name: 'Four Minute Books' },
        { url: 'https://fs.blog/feed/', name: 'Farnam Street' }
    ],
    ophthalmology: [
        { url: 'https://www.healio.com/news/ophthalmology/feed', name: 'Healio Ophthalmology' },
        { url: 'https://www.medscape.com/cx/rssfeeds/2224.xml', name: 'Medscape Ophthalmology' },
        { url: 'https://eyewire.news/feed/', name: 'EyeWire News' }
    ],
    glaucoma: [
        { url: 'https://www.healio.com/news/ophthalmology/glaucoma/feed', name: 'Healio Glaucoma' },
        { url: 'https://glaucomatoday.com/feed/', name: 'Glaucoma Today' },
        { url: 'https://www.reviewofophthalmology.com/rss/glaucoma', name: 'Review of Ophthalmology - Glaucoma' }
    ]
};

// Global state
let allArticles = [];
let currentCategory = 'all';
let searchQuery = '';

// Sources with paywalls - URLs will be routed through removepaywall.com
const paywalledSources = [
    'WSJ Business',
    'Bloomberg Markets',
    'STAT News'
];

// Check if source has paywall and return appropriate URL
function getArticleUrl(link, sourceName) {
    if (paywalledSources.includes(sourceName)) {
        return `https://www.removepaywall.com/search?url=${encodeURIComponent(link)}`;
    }
    return link;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadFeeds();
});

// Setup event listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            displayArticles();
        });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadFeeds();
    });

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            displayArticles();
        });
    }
}

// Load all RSS feeds
async function loadFeeds() {
    const loadingEl = document.getElementById('loading');
    const feedEl = document.getElementById('feed');
    const errorEl = document.getElementById('error');

    loadingEl.style.display = 'block';
    feedEl.innerHTML = '';
    errorEl.style.display = 'none';
    allArticles = [];

    const promises = [];

    // Fetch all feeds
    for (const [category, feeds] of Object.entries(feedSources)) {
        for (const feed of feeds) {
            promises.push(fetchFeed(feed.url, feed.name, category));
        }
    }

    try {
        const results = await Promise.allSettled(promises);

        // Collect all successful articles
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                allArticles.push(...result.value);
            }
        });

        // Sort by date (newest first)
        allArticles.sort((a, b) => b.date - a.date);

        loadingEl.style.display = 'none';

        if (allArticles.length === 0) {
            errorEl.style.display = 'block';
        } else {
            displayArticles();
        }
    } catch (error) {
        console.error('Error loading feeds:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// Fetch individual RSS feed using a CORS proxy
async function fetchFeed(feedUrl, sourceName, category) {
    try {
        // Using RSS2JSON service as a CORS proxy
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (data.status !== 'ok') {
            console.warn(`Failed to fetch ${sourceName}:`, data.message);
            return [];
        }

        // Parse items
        return data.items.slice(0, 10).map(item => {
            const fullText = stripHtml(item.description || item.content || '', false);
            // Extract image from enclosure, thumbnail, or content
            let image = item.enclosure?.link || item.thumbnail || null;
            if (!image && item.content) {
                const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) image = imgMatch[1];
            }

            return {
                title: item.title,
                link: item.link,
                description: fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText,
                fullDescription: fullText,
                image: image,
                date: new Date(item.pubDate),
                category: category,
                source: sourceName
            };
        });
    } catch (error) {
        console.error(`Error fetching ${sourceName}:`, error);
        return [];
    }
}

// Strip HTML tags from description
function stripHtml(html, truncate = true) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    if (!truncate) return text;
    // Limit description length for preview
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

// Display articles based on current filter and search
function displayArticles() {
    const feedEl = document.getElementById('feed');
    feedEl.innerHTML = '';

    let filteredArticles = currentCategory === 'all'
        ? allArticles
        : allArticles.filter(article => article.category === currentCategory);

    // Apply search filter
    if (searchQuery) {
        filteredArticles = filteredArticles.filter(article =>
            article.title.toLowerCase().includes(searchQuery) ||
            article.description.toLowerCase().includes(searchQuery) ||
            article.source.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredArticles.length === 0) {
        feedEl.innerHTML = '<p style="text-align: center; color: var(--secondary-color); padding: 2rem;">No articles found. Try a different search or category.</p>';
        return;
    }

    filteredArticles.forEach((article, index) => {
        const articleCard = createArticleCard(article, index);
        feedEl.appendChild(articleCard);
    });
}

// Create article card element (Google News style with image)
function createArticleCard(article, index) {
    const card = document.createElement('div');
    card.className = `article-card ${article.category}`;

    const relativeTime = getRelativeTime(article.date);
    const hasMoreContent = article.fullDescription.length > 200;
    const articleUrl = getArticleUrl(article.link, article.source);
    const isPaywalled = paywalledSources.includes(article.source);

    // Create image HTML if available
    const imageHtml = article.image
        ? `<div class="article-image">
               <img src="${article.image}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'">
           </div>`
        : '';

    card.innerHTML = `
        <div class="article-content-wrapper">
            <div class="article-text">
                <div class="article-header">
                    <span class="category-tag ${article.category}">${article.category}</span>
                    <span class="source-name">${article.source}${isPaywalled ? ' 🔓' : ''}</span>
                </div>
                <h2 class="article-title">
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer">${article.title}</a>
                </h2>
                ${article.description ? `<p class="article-description">${article.description}</p>` : ''}
                ${hasMoreContent ? `
                    <div class="expandable-content" style="display: none;">
                        <p class="full-description">${article.fullDescription}</p>
                    </div>
                    <button class="expand-btn" data-expanded="false">▼ Show More</button>
                ` : ''}
                <div class="article-meta">
                    <span class="article-date">${relativeTime}</span>
                    <a href="${articleUrl}" target="_blank" rel="noopener noreferrer" class="read-article-link">Read Article →</a>
                </div>
            </div>
            ${imageHtml}
        </div>
    `;

    // Add expand/collapse functionality
    const expandBtn = card.querySelector('.expand-btn');
    if (expandBtn) {
        const expandableContent = card.querySelector('.expandable-content');
        const shortDescription = card.querySelector('.article-description');
        expandBtn.addEventListener('click', () => {
            const isExpanded = expandBtn.dataset.expanded === 'true';
            if (isExpanded) {
                expandableContent.style.display = 'none';
                shortDescription.style.display = 'block';
                expandBtn.textContent = '▼ Show More';
                expandBtn.dataset.expanded = 'false';
            } else {
                expandableContent.style.display = 'block';
                shortDescription.style.display = 'none';
                expandBtn.textContent = '▲ Show Less';
                expandBtn.dataset.expanded = 'true';
            }
        });
    }

    return card;
}

// Get relative time string
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Save scroll position
window.addEventListener('beforeunload', () => {
    localStorage.setItem('smartReadsScrollPos', window.scrollY);
});

// Restore scroll position
window.addEventListener('load', () => {
    const savedPos = localStorage.getItem('smartReadsScrollPos');
    if (savedPos) {
        window.scrollTo(0, parseInt(savedPos));
    }
});
