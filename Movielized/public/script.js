function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function logout() {
    handleLogout();
}

// Activity Functions - Updated to use real data
async function loadActivityPage() {
    if (!currentUser) {
        showPage('auth');
        return;
    }
    loadRealActivityFeed();
}

function switchActivityTab(tab) {
    currentActivityTab = tab;
    
    // Update tab appearance
    document.getElementById('friendsActivityTab').classList.toggle('active', tab === 'friends');
    document.getElementById('yourActivityTab').classList.toggle('active', tab === 'your');
    
    loadRealActivityFeed();
}

// Event Listeners - Updated with backend integration
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                await performSearch(query);
            }
        }
    });

    // Auth forms - Updated to use backend
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = e.target.querySelector('input[type="text"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (username && password) {
            handleLogin(username, password);
        } else {
            alert('Please enter both username and password.');
        }
    });

    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = e.target.querySelector('input[type="text"]').value;
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (username && email && password) {
            handleRegister(username, email, password);
        } else {
            alert('Please fill in all fields.');
        }
    });
}

// Updated save function for Top 5
function saveTop5Films() {
    if (typeof saveTop5FilmsAPI === 'function') {
        saveTop5FilmsAPI();
    } else {
        // Fallback for local storage
        userTop5Films = [...tempTop5Films];
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        loadProfileTop5();
        closeEditTop5Modal();
        alert('Your top 5 films have been updated!');
    }
}

// Add friend functionality
function addFriend() {
    searchAndAddFriend();
}

// Updated logged-in homepage to show real data
async function loadLoggedInHomePage() {
    document.getElementById('welcomeMessage').textContent = `Welcome back ${currentUser.username}!`;
    
    // Load real user stats
    loadRealUserStats();
    
    // Load real friends activity
    try {
        const data = await activityAPI.getActivityFeed('friends', 1);
        displayFriendsActivity(data.activities.slice(0, 5));
    } catch (error) {
        console.error('Error loading friends activity:', error);
        loadMockFriendsActivity(); // Fallback to mock data
    }
    
    // Load real reviews
    try {
        const reviewData = await reviewAPI.getReviews({ limit: 3 });
        displayPopularReviews(reviewData.reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        loadMockPopularReviews(); // Fallback to mock data
    }
    
    loadRecommendations();
}

function loadRealUserStats() {
    const stats = currentUser.stats || {};
    
    document.getElementById('userStats').innerHTML = `
        <div style="display: flex; justify-content: center; gap: 2rem; margin: 1rem 0;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${stats.moviesThisYear || 0}</div>
                <div style="color: #ccc; font-size: 0.9rem;">Films This Year</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${currentUser.watchlist ? currentUser.watchlist.length : 0}</div>
                <div style="color: #ccc; font-size: 0.9rem;">In Watchlist</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${stats.following || 0}</div>
                <div style="color: #ccc; font-size: 0.9rem;">Following</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${stats.followers || 0}</div>
                <div style="color: #ccc; font-size: 0.9rem;">Followers</div>
            </div>
        </div>
    `;
}

function displayFriendsActivity(activities) {
    if (!activities || activities.length === 0) {
        loadMockFriendsActivity();
        return;
    }

    const activityHTML = activities.map(activity => {
        const user = activity.userId.username;
        const timeAgo = getTimeAgo ? getTimeAgo(activity.createdAt) : 'recently';
        
        let actionText = '';
        switch (activity.activityType) {
            case 'watched_movie':
            case 'rated_movie':
                actionText = `watched and gave ${activity.movieTitle} a ${activity.rating ? '★'.repeat(activity.rating) + '☆'.repeat(5-activity.rating) : '★★★★★'} rating`;
                break;
            case 'reviewed_movie':
                actionText = `reviewed ${activity.movieTitle}`;
                break;
            case 'added_to_watchlist':
                actionText = `added ${activity.movieTitle} to their watchlist`;
                break;
            default:
                actionText = `updated their activity`;
        }

        return `
            <div class="activity-item">
                <div class="activity-avatar"></div>
                <div class="activity-text">
                    <strong class="reviewer-name">${user}</strong> ${actionText}
                </div>
                <div class="activity-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('friendsActivity').innerHTML = activityHTML;
}

function displayPopularReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        loadMockPopularReviews();
        return;
    }

    const reviewsHTML = reviews.map(review => `
        <div class="review-card">
            <img src="${review.moviePoster || 'https://via.placeholder.com/80x120/555/white?text=Movie'}" alt="${review.movieTitle}" class="review-movie-poster">
            <div class="review-content">
                <div class="review-header">
                    <div class="reviewer-avatar"></div>
                    <span class="reviewer-name">${review.userId.username}</span>
                </div>
                <div class="review-movie-title">${review.movieTitle} ${review.movieYear}</div>
                <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                <div class="review-text">${review.reviewText}</div>
                <div class="review-date">Watched on ${new Date(review.createdAt).toLocaleDateString()} • ❤️ ${review.likes.length}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('popularReviews').innerHTML = reviewsHTML;
}

// Fallback functions for when backend is not available
function loadMockFriendsActivity() {
    const mockActivity = [
        { user: 'ESMEIMEI', action: 'watched and gave', movie: 'Dinner in America', rating: '★★★★★', time: '4h' },
        { user: 'PROGAMER31327778', action: 'watched and gave', movie: 'Spider-Man', rating: '★★★★★', time: '1d' },
        { user: 'ESMEIMEI', action: 'watched and gave', movie: 'Doctor Strange: Multiverse of Madness', rating: '★★★★★', time: '2d' }
    ];

    const activityHTML = mockActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-avatar"></div>
            <div class="activity-text">
                <strong class="reviewer-name">${activity.user}</strong> ${activity.action} 
                <span class="activity-movie">${activity.movie}</span> a ${activity.rating} rating
            </div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');

    document.getElementById('friendsActivity').innerHTML = activityHTML;
}

function loadMockPopularReviews() {
    const mockReviews = [
        {
            user: '8MANHACHIMAN',
            movie: 'All About Lily Chou-Chou',
            year: '2001',
            rating: '★★★★☆',
            text: 'The cinematography is beautiful, I really feel immersed with the characters, their world, and what they are feeling every time I watch this.',
            poster: 'https://via.placeholder.com/80x120/555/white?text=Lily',
            date: 'Watched on May 2025'
        }
    ];

    const reviewsHTML = mockReviews.map(review => `
        <div class="review-card">
            <img src="${review.poster}" alt="${review.movie}" class="review-movie-poster">
            <div class="review-content">
                <div class="review-header">
                    <div class="reviewer-avatar"></div>
                    <span class="reviewer-name">${review.user}</span>
                </div>
                <div class="review-movie-title">${review.movie} ${review.year}</div>
                <div class="review-rating">${review.rating}</div>
                <div class="review-text">${review.text}</div>
                <div class="review-date">${review.date}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('popularReviews').innerHTML = reviewsHTML;
}

// Keep all existing TMDB and other functions...
// API Functions, Page Navigation, etc. (keeping existing code)

console.log('Movielized app with backend integration loaded successfully!');// Import API functions (add this script after api.js)
// <script src="api.js"></script>

// TMDB API Configuration
const TMDB_API_KEY = 'bd594712da60f7589d4fec58ccb34acd';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// App State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 'home';
let watchlist = [];
let currentActivityTab = 'friends';
let userTop5Films = [];
let tempTop5Films = [];

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadTrendingMovies();
    setupEventListeners();
});

// Page Navigation Function
function showPage(page) {
    // Update current page state
    currentPage = page;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    // Handle home page based on login status
    if (page === 'home') {
        if (currentUser) {
            document.getElementById('homePageLoggedIn').style.display = 'block';
        } else {
            document.getElementById('homePage').style.display = 'block';
        }
    } else {
        // Show the requested page for all other pages
        const pageElement = document.getElementById(page + 'Page');
        if (pageElement) {
            pageElement.style.display = 'block';
        }
    }
    
    // Update navigation active state
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Find and highlight the active nav link
    const activeLink = document.querySelector(`nav a[onclick*="showPage('${page}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page-specific content
    switch(page) {
        case 'home':
            if (currentUser) {
                loadLoggedInHomePage();
            } else {
                loadTrendingMovies();
            }
            break;
        case 'films':
            loadAllMovies();
            break;
        case 'watchlist':
            loadWatchlistPage();
            break;
        case 'activity':
            loadActivityPage();
            break;
        case 'profile':
            loadProfilePage();
            break;
        case 'about':
            // About page doesn't need loading
            break;
        case 'auth':
            // Auth page doesn't need loading
            break;
    }
    
    // Scroll to top of page
    window.scrollTo(0, 0);
}

// Authentication Status Check
async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    if (token && currentUser) {
        // Verify token is still valid and load fresh user data
        try {
            await loadUserProfile();
            updateUIForLoggedInUser();
        } catch (error) {
            // Token invalid, logout
            handleLogout();
        }
    }
}

function updateUIForLoggedInUser() {
    document.getElementById('authBtn').style.display = 'none';
    document.getElementById('userDropdown').style.display = 'block';
    document.getElementById('watchlist-nav').style.display = 'block';
    document.getElementById('activity-nav').style.display = 'block';
    document.getElementById('userGreeting').textContent = currentUser.username;
    
    if (currentPage === 'home') {
        showPage('home');
    }
    
    // Load friend requests on login
    loadFriendRequests();
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('authBtn').style.display = 'block';
    document.getElementById('userDropdown').style.display = 'none';
    document.getElementById('watchlist-nav').style.display = 'none';
    document.getElementById('activity-nav').style.display = 'none';
    document.getElementById('userMenu').style.display = 'none';
    showPage('home');
}

// API Functions
async function fetchFromTMDB(endpoint) {
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('TMDB API Error:', error);
        throw error;
    }
}

async function loadTrendingMovies() {
    try {
        const data = await fetchFromTMDB('/trending/movie/week');
        const movies = data.results.slice(0, 8).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            overview: movie.overview,
            rating: movie.vote_average
        }));
        
        displayMovies(movies, 'trendingMovies');
    } catch (error) {
        console.error('Error loading trending movies:', error);
        document.getElementById('trendingMovies').innerHTML = '<p>Error loading movies. Please check your connection.</p>';
    }
}

async function loadAllMovies() {
    try {
        const data = await fetchFromTMDB('/movie/popular');
        const movies = data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            overview: movie.overview,
            rating: movie.vote_average
        }));
        
        displayMovies(movies, 'allMovies');
    } catch (error) {
        console.error('Error loading movies:', error);
        document.getElementById('allMovies').innerHTML = '<p>Error loading movies. Please try again.</p>';
    }
}

async function searchMovies(query) {
    try {
        const data = await fetchFromTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
        return data.results.slice(0, 12).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            overview: movie.overview,
            rating: movie.vote_average
        }));
    } catch (error) {
        console.error('Error searching movies:', error);
        return [];
    }
}

function displayMovies(movies, containerId) {
    const container = document.getElementById(containerId);
    if (movies.length === 0) {
        container.innerHTML = '<p>No movies found.</p>';
        return;
    }
    
    container.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="showMovieDetails(${movie.id})">
            <img src="${movie.poster}" alt="${movie.title}" class="movie-poster" onerror="this.src='https://via.placeholder.com/300x450/333/white?text=No+Image'">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${movie.year}</div>
                <div style="color: #ff6b6b; font-size: 0.9rem;">⭐ ${movie.rating ? movie.rating.toFixed(1) : 'N/A'}</div>
            </div>
        </div>
    `).join('');
}

async function showMovieDetails(movieId) {
    try {
        const movie = await fetchFromTMDB(`/movie/${movieId}`);
        const credits = await fetchFromTMDB(`/movie/${movieId}/credits`);
        
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        
        const isInWatchlist = watchlist.includes(movieId);
        const watchlistText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        
        const movieDetails = `
            <div style="max-width: 600px; margin: 20px auto; padding: 20px; background: #2a2a2a; border-radius: 10px; color: white;">
                <div style="display: flex; gap: 20px; margin-bottom: 20px;">
                    <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/200x300/333/white?text=No+Image'}" 
                         style="width: 200px; height: 300px; object-fit: cover; border-radius: 10px;">
                    <div style="flex: 1;">
                        <h2>${movie.title} (${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'})</h2>
                        <p><strong>Director:</strong> ${director ? director.name : 'Unknown'}</p>
                        <p><strong>Cast:</strong> ${cast || 'Unknown'}</p>
                        <p><strong>Rating:</strong> ⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}/10</p>
                        <p><strong>Runtime:</strong> ${movie.runtime ? movie.runtime + ' minutes' : 'Unknown'}</p>
                        <p><strong>Genres:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>
                    </div>
                </div>
                <p><strong>Overview:</strong> ${movie.overview || 'No overview available.'}</p>
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="toggleWatchlist(${movieId}, '${movie.title.replace(/'/g, "\\'")}', this)" style="padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        ${watchlistText}
                    </button>
                    <button onclick="closeMovieDetails()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.id = 'movieModal';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; overflow-y: auto;';
        overlay.innerHTML = movieDetails;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeMovieDetails();
        };
        
        document.body.appendChild(overlay);
        
    } catch (error) {
        console.error('Error loading movie details:', error);
        alert('Error loading movie details. Please try again.');
    }
}

function closeMovieDetails() {
    const modal = document.getElementById('movieModal');
    if (modal) {
        modal.remove();
    }
}

// Replace the existing toggleWatchlist function in script.js with this:

async function toggleWatchlist(movieId, movieTitle, buttonElement) {
    if (!currentUser) {
        alert('Please sign in to add movies to your watchlist!');
        return;
    }
    
    // Use the API version from api.js
    toggleWatchlistAPI(movieId, movieTitle);
}

// Logged-in Home Page Functions
async function loadLoggedInHomePage() {
    document.getElementById('welcomeMessage').textContent = `Welcome back ${currentUser.username}!`;
    loadUserStats();
    loadFriendsActivity();
    loadPopularReviews();
    loadRecommendations();
}

function loadUserStats() {
    const watchedCount = 0;
    
    document.getElementById('userStats').innerHTML = `
        <div style="display: flex; justify-content: center; gap: 2rem; margin: 1rem 0;">
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${watchedCount}</div>
                <div style="color: #ccc; font-size: 0.9rem;">Films This Year</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${watchlist.length}</div>
                <div style="color: #ccc; font-size: 0.9rem;">In Watchlist</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">3</div>
                <div style="color: #ccc; font-size: 0.9rem;">Friends</div>
            </div>
        </div>
    `;
}

async function loadFriendsActivity() {
    const mockActivity = [
        { user: 'ESMEIMEI', action: 'watched and gave', movie: 'Dinner in America', rating: '★★★★★', time: '4h' },
        { user: 'PROGAMER31327778', action: 'watched and gave', movie: 'Spider-Man', rating: '★★★★★', time: '1d' },
        { user: 'ESMEIMEI', action: 'watched and gave', movie: 'Doctor Strange: Multiverse of Madness', rating: '★★★★★', time: '2d' }
    ];

    const activityHTML = mockActivity.map(activity => `
        <div class="activity-item">
            <div class="activity-avatar"></div>
            <div class="activity-text">
                <strong class="reviewer-name">${activity.user}</strong> ${activity.action} 
                <span class="activity-movie">${activity.movie}</span> a ${activity.rating} rating
            </div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');

    document.getElementById('friendsActivity').innerHTML = activityHTML;
}

async function loadPopularReviews() {
    const mockReviews = [
        {
            user: '8MANHACHIMAN',
            movie: 'All About Lily Chou-Chou',
            year: '2001',
            rating: '★★★★☆',
            text: 'The cinematography is beautiful, I really feel immersed with the characters, their world, and what they are feeling every time I watch this.',
            poster: 'https://via.placeholder.com/80x120/555/white?text=Lily',
            date: 'Watched on May 2025'
        }
    ];

    const reviewsHTML = mockReviews.map(review => `
        <div class="review-card">
            <img src="${review.poster}" alt="${review.movie}" class="review-movie-poster">
            <div class="review-content">
                <div class="review-header">
                    <div class="reviewer-avatar"></div>
                    <span class="reviewer-name">${review.user}</span>
                </div>
                <div class="review-movie-title">${review.movie} ${review.year}</div>
                <div class="review-rating">${review.rating}</div>
                <div class="review-text">${review.text}</div>
                <div class="review-date">${review.date}</div>
            </div>
        </div>
    `).join('');

    document.getElementById('popularReviews').innerHTML = reviewsHTML;
}

async function loadRecommendations() {
    try {
        const data = await fetchFromTMDB('/discover/movie?with_genres=28,35');
        const movies = data.results.slice(0, 5).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            rating: movie.vote_average
        }));
        
        displayMovies(movies, 'recommendations');
    } catch (error) {
        document.getElementById('recommendations').innerHTML = '<p>Error loading recommendations.</p>';
    }
}

// Watchlist Functions
async function loadWatchlistPage() {
    if (!currentUser) {
        document.getElementById('watchlistMovies').innerHTML = '<p>Please sign in to view your watchlist.</p>';
        return;
    }

    if (watchlist.length === 0) {
        document.getElementById('watchlistMovies').innerHTML = '<p>Your watchlist is empty. Start adding movies!</p>';
        return;
    }

    try {
        document.getElementById('watchlistTitle').textContent = `Your Watchlist (${watchlist.length} movies)`;
        
        const moviePromises = watchlist.map(movieId => fetchFromTMDB(`/movie/${movieId}`));
        const movies = await Promise.all(moviePromises);
        
        const formattedMovies = movies.map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            rating: movie.vote_average
        }));
        
        displayMovies(formattedMovies, 'watchlistMovies');
    } catch (error) {
        console.error('Error loading watchlist:', error);
        document.getElementById('watchlistMovies').innerHTML = '<p>Error loading watchlist. Please try again.</p>';
    }
}

// Profile Functions
async function loadProfilePage() {
    if (!currentUser) {
        showPage('auth');
        return;
    }

    document.getElementById('profileUsername').textContent = currentUser.username + '!';
    document.getElementById('profileJoinDate').textContent = `Joined on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    
    // Load Top 5 Films
    loadProfileTop5();
    
    // Load watchlist preview
    if (watchlist.length > 0) {
        try {
            const moviePromises = watchlist.slice(0, 4).map(movieId => fetchFromTMDB(`/movie/${movieId}`));
            const movies = await Promise.all(moviePromises);
            
            const formattedMovies = movies.map(movie => ({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
                poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
                rating: movie.vote_average
            }));
            
            displayMovies(formattedMovies, 'profileWatchlist');
        } catch (error) {
            document.getElementById('profileWatchlist').innerHTML = '<p>Error loading watchlist.</p>';
        }
    }
}

async function loadProfileTop5() {
    const container = document.getElementById('profileTop5');
    
    if (userTop5Films.length === 0) {
        // Show empty slots
        container.innerHTML = Array.from({length: 5}, (_, i) => `
            <div class="top-5-slot" onclick="editTop5Films()">
                <div class="top-5-rank">${i + 1}</div>
                <span>Click to add<br>your #${i + 1} film</span>
            </div>
        `).join('');
        return;
    }

    try {
        // Load movie details for top 5 films
        const moviePromises = userTop5Films.map(movieId => 
            movieId ? fetchFromTMDB(`/movie/${movieId}`) : null
        );
        const movies = await Promise.all(moviePromises);
        
        container.innerHTML = Array.from({length: 5}, (_, i) => {
            const movie = movies[i];
            if (movie) {
                return `
                    <div class="top-5-slot filled" onclick="showMovieDetails(${movie.id})">
                        <div class="top-5-rank">${i + 1}</div>
                        <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/200x300/333/white?text=No+Image'}" 
                             alt="${movie.title}" class="top-5-poster">
                        <button class="remove-top5" onclick="removeFromTop5(${i}, event)">&times;</button>
                    </div>
                `;
            } else {
                return `
                    <div class="top-5-slot" onclick="editTop5Films()">
                        <div class="top-5-rank">${i + 1}</div>
                        <span>Click to add<br>your #${i + 1} film</span>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        console.error('Error loading top 5 films:', error);
        container.innerHTML = '<p>Error loading top 5 films.</p>';
    }
}

// Top 5 Films Management
function editTop5Films() {
    tempTop5Films = [...userTop5Films]; // Copy current top 5 for editing
    document.getElementById('editTop5Modal').style.display = 'flex';
    loadEditableTop5();
    
    // Set up search
    const searchInput = document.getElementById('top5SearchInput');
    searchInput.addEventListener('input', debounce(searchForTop5Movies, 300));
}

function closeEditTop5Modal() {
    document.getElementById('editTop5Modal').style.display = 'none';
    document.getElementById('top5SearchInput').value = '';
    document.getElementById('top5SearchResults').innerHTML = '';
}

async function loadEditableTop5() {
    const container = document.getElementById('editableTop5');
    
    if (tempTop5Films.length === 0) {
        container.innerHTML = Array.from({length: 5}, (_, i) => `
            <div class="editable-top5-slot" onclick="selectTop5Slot(${i})">
                <span>#${i + 1}<br>Empty</span>
            </div>
        `).join('');
        return;
    }

    try {
        const moviePromises = tempTop5Films.map(movieId => 
            movieId ? fetchFromTMDB(`/movie/${movieId}`) : null
        );
        const movies = await Promise.all(moviePromises);
        
        container.innerHTML = Array.from({length: 5}, (_, i) => {
            const movie = movies[i];
            if (movie) {
                return `
                    <div class="editable-top5-slot filled" onclick="selectTop5Slot(${i})">
                        <div class="top-5-rank">${i + 1}</div>
                        <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : 'https://via.placeholder.com/200x300/333/white?text=No+Image'}" 
                             alt="${movie.title}" class="top-5-poster">
                        <button class="remove-top5" onclick="removeFromTempTop5(${i}, event)" style="display: flex;">&times;</button>
                    </div>
                `;
            } else {
                return `
                    <div class="editable-top5-slot" onclick="selectTop5Slot(${i})">
                        <span>#${i + 1}<br>Empty</span>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        console.error('Error loading editable top 5:', error);
    }
}

let selectedTop5Slot = null;

function selectTop5Slot(index) {
    selectedTop5Slot = index;
    // Highlight selected slot
    document.querySelectorAll('.editable-top5-slot').forEach((slot, i) => {
        slot.style.border = i === index ? '2px solid #00ff00' : (tempTop5Films[i] ? '2px solid #ff6b6b' : '2px dashed #555');
    });
}

async function searchForTop5Movies() {
    const query = document.getElementById('top5SearchInput').value.trim();
    const resultsContainer = document.getElementById('top5SearchResults');
    
    if (!query) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        const results = await searchMovies(query);
        
        resultsContainer.innerHTML = results.slice(0, 12).map(movie => `
            <div class="search-result-item" onclick="addToTop5(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
                <img src="${movie.poster}" alt="${movie.title}" class="search-result-poster">
                <div class="search-result-title">${movie.title} (${movie.year})</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error searching movies for top 5:', error);
        resultsContainer.innerHTML = '<p>Error searching movies.</p>';
    }
}

function addToTop5(movieId, movieTitle) {
    if (selectedTop5Slot === null) {
        alert('Please select a slot first by clicking on one of the #1-5 positions.');
        return;
    }

    // Check if movie is already in top 5
    if (tempTop5Films.includes(movieId)) {
        alert('This movie is already in your top 5!');
        return;
    }

    // Add to selected slot
    tempTop5Films[selectedTop5Slot] = movieId;
    loadEditableTop5();
    
    // Clear search
    document.getElementById('top5SearchInput').value = '';
    document.getElementById('top5SearchResults').innerHTML = '';
    
    alert(`"${movieTitle}" added to position #${selectedTop5Slot + 1}!`);
    selectedTop5Slot = null;
}

function removeFromTop5(index, event) {
    event.stopPropagation();
    if (confirm('Remove this movie from your top 5?')) {
        userTop5Films[index] = null;
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        loadProfileTop5();
    }
}

function removeFromTempTop5(index, event) {
    event.stopPropagation();
    tempTop5Films[index] = null;
    loadEditableTop5();
}

function saveTop5Films() {
    userTop5Films = [...tempTop5Films];
    localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
    loadProfileTop5();
    closeEditTop5Modal();
    alert('Your top 5 films have been updated!');
}

// Utility function for debouncing search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Activity Functions
async function loadActivityPage() {
    if (!currentUser) {
        showPage('auth');
        return;
    }
    loadActivityFeed();
}

function switchActivityTab(tab) {
    currentActivityTab = tab;
    
    // Update tab appearance
    document.getElementById('friendsActivityTab').classList.toggle('active', tab === 'friends');
    document.getElementById('yourActivityTab').classList.toggle('active', tab === 'your');
    
    loadActivityFeed();
}

async function loadActivityFeed() {
    if (currentActivityTab === 'friends') {
        const friendsActivity = [
            { user: 'ESMEIMEI', action: 'watched and gave', movie: 'Dinner in America', rating: '★★★★★', time: '4h' },
            { user: 'You', action: 'liked ESMEIMEI\'s review of', movie: 'Dinner in America', time: '4h' },
            { user: 'PROGAMER31327778', action: 'watched and gave', movie: 'Spider-Man', rating: '★★★★★', time: '1d' }
        ];

        const activityHTML = friendsActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-avatar"></div>
                <div class="activity-text">
                    <strong class="reviewer-name">${activity.user}</strong> ${activity.action} 
                    <span class="activity-movie">${activity.movie}</span> ${activity.rating ? 'a ' + activity.rating + ' rating' : ''}
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');

        document.getElementById('activityFeed').innerHTML = activityHTML;
    } else {
        const yourActivity = [
            { action: 'liked ESMEIMEI\'s review of', movie: 'Dinner in America', time: '4h' },
            { action: 'watched and gave', movie: 'Spider-Man', rating: '★★★★★', time: '1d' },
            { action: 'added', movie: 'Fantastic 4', extra: 'to watchlist', time: '4h' }
        ];

        const activityHTML = yourActivity.map(activity => `
            <div class="activity-item">
                <div class="activity-avatar"></div>
                <div class="activity-text">
                    <strong class="reviewer-name">You</strong> ${activity.action} 
                    <span class="activity-movie">${activity.movie}</span> 
                    ${activity.rating ? 'a ' + activity.rating + ' rating' : ''}
                    ${activity.extra ? activity.extra : ''}
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');

        document.getElementById('activityFeed').innerHTML = activityHTML;
    }
}

// Search Functions
async function performSearch(query) {
    let targetContainer, titleElement;
    
    if (currentPage === 'home') {
        targetContainer = 'trendingMovies';
        titleElement = document.querySelector('#homePage h2');
    } else if (currentPage === 'films') {
        targetContainer = 'allMovies';
        titleElement = document.getElementById('filmsPageTitle');
    } else {
        showPage('home');
        targetContainer = 'trendingMovies';
        titleElement = document.querySelector('#homePage h2');
    }
    
    document.getElementById(targetContainer).innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Searching for "${query}"...</p>
        </div>
    `;
    
    try {
        const searchResults = await searchMovies(query);
        titleElement.textContent = `Search Results for "${query}"`;
        displayMovies(searchResults, targetContainer);
        addClearSearchButton(targetContainer, titleElement);
    } catch (error) {
        console.error('Search error:', error);
        document.getElementById(targetContainer).innerHTML = '<p>Error searching movies. Please try again.</p>';
    }
}

function addClearSearchButton(targetContainer, titleElement) {
    const existingBtn = document.getElementById('clearSearch');
    if (existingBtn) existingBtn.remove();
    
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearSearch';
    clearBtn.textContent = 'Clear Search';
    clearBtn.style.cssText = 'margin: 20px auto; display: block; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;';
    clearBtn.onclick = () => {
        document.getElementById('searchInput').value = '';
        
        if (currentPage === 'home') {
            titleElement.textContent = 'Trending Movies';
            loadTrendingMovies();
        } else if (currentPage === 'films') {
            titleElement.textContent = 'Browse Movies';
            loadAllMovies();
        }
        
        clearBtn.remove();
    };
    document.getElementById(targetContainer).parentNode.appendChild(clearBtn);
}

// Event Listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            const query = e.target.value.trim();
            if (query) {
                await performSearch(query);
            }
        }
    });

    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = e.target.querySelector('input[type="text"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (username && password) {
            currentUser = { username: username, id: Date.now() };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            showPage('home');
            alert(`Welcome back, ${username}!`);
        } else {
            alert('Please enter both username and password.');
        }
    });

    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = e.target.querySelector('input[type="text"]').value;
        const email = e.target.querySelector('input[type="email"]').value;
        const password = e.target.querySelector('input[type="password"]').value;
        
        if (username && email && password) {
            currentUser = { username: username, email: email, id: Date.now() };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            showPage('home');
            alert(`Welcome to Movielized, ${username}!`);
        } else {
            alert('Please fill in all fields.');
        }
    });
}

console.log('Movielized app loaded successfully!');