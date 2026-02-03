// Smart Reads v2.1 - Feed Management and Interactivity

// RSS Feed Sources organized by category (reordered, books removed)
const feedSources = {
    tech: [
        { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
        { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
        { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Technology' }
    ],
    ophthalmology: [
        { url: 'https://news.google.com/rss/search?q=ophthalmology', name: 'Google News Ophthalmology', useBackup: true },
        { url: 'https://news.google.com/rss/search?q=glaucoma', name: 'Google News Glaucoma', useBackup: true },
        { url: 'https://news.google.com/rss/search?q=eye+surgery', name: 'Google News Eye Surgery', useBackup: true },
        { url: 'https://news.google.com/rss/search?q=cataract', name: 'Google News Cataract', useBackup: true }
    ],
    business: [
        { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets' },
        { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC Top News' },
        { url: 'https://www.wsj.com/xml/rss/3_7085.xml', name: 'WSJ Business' },
        { url: 'https://www.reutersagency.com/feed/?best-topics=business-finance', name: 'Reuters Business' },
        { url: 'https://www.usnews.com/rss/money', name: 'US News Money' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', name: 'NYT Business' }
    ],
    sports: [
        { url: 'https://www.espn.com/espn/rss/nba/news', name: 'ESPN NBA' },
        { url: 'https://www.espn.com/espn/rss/nfl/news', name: 'ESPN NFL' },
        { url: 'https://www.espn.com/espn/rss/soccer/news', name: 'ESPN Soccer' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', name: 'NYT Sports' }
    ],
    perspectives: [
        { url: 'https://www.vox.com/rss/index.xml', name: 'Vox' },
        { url: 'https://www.vox.com/rss/future-perfect/index.xml', name: 'Vox Future Perfect' },
        { url: 'https://www.vox.com/rss/policy-and-politics/index.xml', name: 'Vox Policy & Politics' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml', name: 'NYT Opinion' },
        { url: 'https://www.theatlantic.com/feed/all/', name: 'The Atlantic' },
        { url: 'https://www.newyorker.com/feed/news', name: 'The New Yorker' },
        { url: 'https://www.economist.com/the-world-this-week/rss.xml', name: 'The Economist' }
    ],
    sciences: [
        { url: 'https://www.sciencedaily.com/rss/health_medicine.xml', name: 'Science Daily Medicine' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', name: 'NYT Health' },
        { url: 'https://www.sciencedaily.com/rss/all.xml', name: 'Science Daily' },
        { url: 'https://www.quantamagazine.org/feed/', name: 'Quanta Magazine' },
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', name: 'NYT Science' }
    ]
};

// Global state
let allArticles = [];
let currentCategory = 'all';
let selectedSources = new Set(); // Changed to Set for multi-select
let searchQuery = '';

// Sources with paywalls - URLs will be routed through removepaywall.com
const paywalledSources = [
    'WSJ Business',
    'Bloomberg Markets',
    'NYT Technology',
    'NYT Health',
    'NYT Business',
    'NYT Science',
    'NYT Sports',
    'NYT Opinion',
    'The Atlantic',
    'The New Yorker',
    'The Economist'
];

// Map source names to their parent publication
function getParentSource(sourceName) {
    const parentMap = {
        'NYT Technology': 'NYT',
        'NYT Health': 'NYT',
        'NYT Business': 'NYT',
        'NYT Science': 'NYT',
        'NYT Sports': 'NYT',
        'NYT Opinion': 'NYT',
        'ESPN NBA': 'ESPN',
        'ESPN NFL': 'ESPN',
        'ESPN Soccer': 'ESPN',
        'Science Daily': 'Science Daily',
        'Science Daily Medicine': 'Science Daily',
        'Vox': 'Vox',
        'Vox Future Perfect': 'Vox',
        'Vox Policy & Politics': 'Vox',
        'Google News Ophthalmology': 'Google News',
        'Google News Glaucoma': 'Google News',
        'Google News Eye Surgery': 'Google News',
        'Google News Cataract': 'Google News'
    };
    return parentMap[sourceName] || sourceName;
}

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
    loadTodaysGames();
});

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.category;
            updateSourceChecklist();
            displayArticles();
        });
    });

    // Hard refresh button
    document.getElementById('hard-refresh-btn').addEventListener('click', () => {
        location.reload(true);
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

// Update source checklist in sidebar
function updateSourceChecklist() {
    const checklistContainer = document.getElementById('source-checklist');
    if (!checklistContainer) return;

    // Get unique parent sources for current category
    let parentSources = [];
    if (currentCategory === 'all') {
        parentSources = [...new Set(allArticles.map(a => getParentSource(a.source)))].sort();
    } else {
        parentSources = [...new Set(allArticles
            .filter(a => a.category === currentCategory)
            .map(a => getParentSource(a.source)))].sort();
    }

    // Clear and rebuild checklist
    checklistContainer.innerHTML = '';

    // Add "Select All" option
    const selectAllItem = document.createElement('div');
    selectAllItem.className = 'source-checkbox-item';
    selectAllItem.innerHTML = `
        <input type="checkbox" id="source-all" checked>
        <label for="source-all"><strong>All Sources</strong></label>
    `;
    checklistContainer.appendChild(selectAllItem);

    // Add individual sources
    parentSources.forEach(source => {
        const item = document.createElement('div');
        item.className = 'source-checkbox-item';
        const sourceId = `source-${source.replace(/\s+/g, '-').toLowerCase()}`;
        item.innerHTML = `
            <input type="checkbox" id="${sourceId}" data-source="${source}" checked>
            <label for="${sourceId}">${source}</label>
        `;
        checklistContainer.appendChild(item);
    });

    // Reset selected sources (all selected by default)
    selectedSources = new Set(parentSources);

    // Add event listeners
    const allCheckbox = document.getElementById('source-all');
    allCheckbox.addEventListener('change', (e) => {
        const checkboxes = checklistContainer.querySelectorAll('input[data-source]');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            if (e.target.checked) {
                selectedSources.add(cb.dataset.source);
            } else {
                selectedSources.delete(cb.dataset.source);
            }
        });
        displayArticles();
    });

    checklistContainer.querySelectorAll('input[data-source]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedSources.add(e.target.dataset.source);
            } else {
                selectedSources.delete(e.target.dataset.source);
            }
            // Update "All" checkbox state
            const allChecked = selectedSources.size === parentSources.length;
            document.getElementById('source-all').checked = allChecked;
            displayArticles();
        });
    });
}

// Load all RSS feeds (fast categories first, ophthalmology in background)
async function loadFeeds() {
    const loadingEl = document.getElementById('loading');
    const feedEl = document.getElementById('feed');
    const errorEl = document.getElementById('error');

    loadingEl.style.display = 'block';
    feedEl.innerHTML = '';
    errorEl.style.display = 'none';
    allArticles = [];

    const fastPromises = [];
    const slowPromises = [];

    // Separate fast feeds from slow feeds (ophthalmology)
    for (const [category, feeds] of Object.entries(feedSources)) {
        for (const feed of feeds) {
            if (feed.useBackup) {
                // Ophthalmology feeds - load in background
                slowPromises.push(fetchFeedDirect(feed.url, feed.name, category));
            } else {
                // All other feeds - load first
                fastPromises.push(fetchFeed(feed.url, feed.name, category));
            }
        }
    }

    try {
        // First: Load fast feeds and display immediately
        const fastResults = await Promise.allSettled(fastPromises);

        fastResults.forEach(result => {
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
            updateSourceChecklist();
            displayArticles();
        }

        // Second: Load ophthalmology in background, then merge
        if (slowPromises.length > 0) {
            loadOphthalmologyInBackground(slowPromises);
        }
    } catch (error) {
        console.error('Error loading feeds:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// Load ophthalmology feeds in background and merge when ready
async function loadOphthalmologyInBackground(promises) {
    try {
        const results = await Promise.allSettled(promises);

        const ophthalmologyArticles = [];
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                ophthalmologyArticles.push(...result.value);
            }
        });

        if (ophthalmologyArticles.length > 0) {
            // Merge ophthalmology articles into main feed
            allArticles.push(...ophthalmologyArticles);

            // Re-sort by date
            allArticles.sort((a, b) => b.date - a.date);

            // Refresh display and source checklist
            updateSourceChecklist();
            displayArticles();

            console.log(`Added ${ophthalmologyArticles.length} ophthalmology articles`);
        }
    } catch (error) {
        console.error('Error loading ophthalmology feeds:', error);
    }
}

// Fetch feed using rss2json (primary method for most feeds)
async function fetchFeed(feedUrl, sourceName, category) {
    try {
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();

        if (data.status !== 'ok') {
            console.warn(`Failed to fetch ${sourceName}:`, data.message);
            return [];
        }

        return data.items.slice(0, 10).map(item => {
            const fullText = stripHtml(item.description || item.content || '', false);
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

// Fetch feed using allorigins proxy and XML parsing (for Google News/ophthalmology)
async function fetchFeedDirect(feedUrl, sourceName, category) {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(proxyUrl);
        const text = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        if (items.length === 0) {
            console.warn(`No items found for ${sourceName}`);
            return [];
        }

        const articles = [];
        items.forEach((item, index) => {
            if (index >= 10) return;

            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';

            const fullText = stripHtml(description, false);

            articles.push({
                title: title,
                link: link,
                description: fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText,
                fullDescription: fullText,
                image: null,
                date: new Date(pubDate),
                category: category,
                source: sourceName
            });
        });

        console.log(`Loaded ${articles.length} articles from ${sourceName}`);
        return articles;
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
    return text.length > 200 ? text.substring(0, 200) + '...' : text;
}

// Display articles based on current filter and search
function displayArticles() {
    const feedEl = document.getElementById('feed');
    feedEl.innerHTML = '';

    let filteredArticles = currentCategory === 'all'
        ? allArticles
        : allArticles.filter(article => article.category === currentCategory);

    // Apply source filter (multi-select)
    if (selectedSources.size > 0) {
        filteredArticles = filteredArticles.filter(article =>
            selectedSources.has(getParentSource(article.source))
        );
    }

    // Apply search filter
    if (searchQuery) {
        filteredArticles = filteredArticles.filter(article =>
            article.title.toLowerCase().includes(searchQuery) ||
            article.description.toLowerCase().includes(searchQuery) ||
            article.source.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredArticles.length === 0) {
        feedEl.innerHTML = '<p style="text-align: center; color: var(--secondary-color); padding: 2rem;">No articles found. Try a different search or filter.</p>';
        return;
    }

    filteredArticles.forEach((article, index) => {
        const articleCard = createArticleCard(article, index);
        feedEl.appendChild(articleCard);
    });
}

// Create article card element
function createArticleCard(article, index) {
    const card = document.createElement('div');
    card.className = `article-card ${article.category}`;

    const relativeTime = getRelativeTime(article.date);
    const hasMoreContent = article.fullDescription.length > 200;
    const articleUrl = getArticleUrl(article.link, article.source);
    const isPaywalled = paywalledSources.includes(article.source);

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

// Load today's NBA and NFL games
async function loadTodaysGames() {
    const gamesContainer = document.getElementById('games-container');

    try {
        // Fetch NBA games
        const nbaGames = await fetchESPNGames('basketball', 'nba');
        // Fetch NFL games
        const nflGames = await fetchESPNGames('football', 'nfl');

        const allGames = [...nbaGames, ...nflGames];

        if (allGames.length === 0) {
            gamesContainer.innerHTML = '<p class="loading-games">No games scheduled today</p>';
            return;
        }

        gamesContainer.innerHTML = '';
        allGames.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.className = 'game-item';
            gameItem.innerHTML = `
                <div class="league">${game.league}</div>
                <div class="teams">${game.teams}</div>
                <div class="game-time">${game.time}</div>
            `;
            gamesContainer.appendChild(gameItem);
        });
    } catch (error) {
        console.error('Error loading games:', error);
        gamesContainer.innerHTML = '<p class="loading-games">Unable to load games</p>';
    }
}

// Fetch games from ESPN API
async function fetchESPNGames(sport, league) {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.events || data.events.length === 0) {
            return [];
        }

        return data.events.slice(0, 3).map(event => {
            const competition = event.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

            let timeStr = 'TBD';
            if (competition.status) {
                if (competition.status.type.completed) {
                    timeStr = `Final: ${awayTeam.score}-${homeTeam.score}`;
                } else if (competition.status.type.state === 'in') {
                    timeStr = `Live: ${awayTeam.score}-${homeTeam.score}`;
                } else {
                    const gameDate = new Date(event.date);
                    timeStr = gameDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                }
            }

            return {
                league: league.toUpperCase(),
                teams: `${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`,
                time: timeStr
            };
        });
    } catch (error) {
        console.error(`Error fetching ${league} games:`, error);
        return [];
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
