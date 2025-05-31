// API Configuration
const API_BASE_URL = 'http://localhost:5000/api'; // Change to your deployed URL
const TMDB_API_KEY = 'bd594712da60f7589d4fec58ccb34acd';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Auth token management
let authToken = localStorage.getItem('authToken');

// API helper function
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Authentication API
const authAPI = {
    async register(username, email, password) {
        const data = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return data;
    },

    async login(username, password) {
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return data;
    },

    logout() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    }
};

// User API
const userAPI = {
    async getProfile() {
        return await apiCall('/users/profile');
    },

    async updateProfile(profileData) {
        return await apiCall('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    },

    async updateTop5Films(top5Films) {
        return await apiCall('/users/top5', {
            method: 'PUT',
            body: JSON.stringify({ top5Films })
        });
    },

    async addToWatchlist(movieId, movieTitle) {
        return await apiCall('/users/watchlist', {
            method: 'POST',
            body: JSON.stringify({ movieId, movieTitle })
        });
    },

    async removeFromWatchlist(movieId) {
        return await apiCall(`/users/watchlist/${movieId}`, {
            method: 'DELETE'
        });
    },

    async searchUsers(query) {
        return await apiCall(`/users/search?q=${encodeURIComponent(query)}`);
    }
};

// Review API
const reviewAPI = {
    async createReview(reviewData) {
        return await apiCall('/reviews', {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    },

    async getReviews(filters = {}) {
        const params = new URLSearchParams(filters);
        return await apiCall(`/reviews?${params}`);
    },

    async likeReview(reviewId) {
        return await apiCall(`/reviews/${reviewId}/like`, {
            method: 'POST'
        });
    }
};

// Friends API
const friendsAPI = {
    async sendFriendRequest(username) {
        return await apiCall('/friends/request', {
            method: 'POST',
            body: JSON.stringify({ username })
        });
    },

    async respondToFriendRequest(friendshipId, action) {
        return await apiCall(`/friends/request/${friendshipId}`, {
            method: 'PUT',
            body: JSON.stringify({ action })
        });
    },

    async getFriendRequests() {
        return await apiCall('/friends/requests');
    }
};

// Activity API
const activityAPI = {
    async getActivityFeed(type = 'friends', page = 1) {
        return await apiCall(`/activities/feed?type=${type}&page=${page}`);
    }
};

// TMDB API (keep existing functions)
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

// Updated authentication functions
async function handleRegister(username, email, password) {
    try {
        const result = await authAPI.register(username, email, password);
        updateUIForLoggedInUser();
        showPage('home');
        alert(`Welcome to Movielized, ${result.user.username}!`);
        await loadUserProfile(); // Load fresh user data
    } catch (error) {
        alert(`Registration failed: ${error.message}`);
    }
}

async function handleLogin(username, password) {
    try {
        const result = await authAPI.login(username, password);
        updateUIForLoggedInUser();
        showPage('home');
        alert(`Welcome back, ${result.user.username}!`);
        await loadUserProfile(); // Load fresh user data
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
}

function handleLogout() {
    authAPI.logout();
    document.getElementById('authBtn').style.display = 'block';
    document.getElementById('userDropdown').style.display = 'none';
    document.getElementById('watchlist-nav').style.display = 'none';
    document.getElementById('activity-nav').style.display = 'none';
    document.getElementById('userMenu').style.display = 'none';
    showPage('home');
}

// Updated user profile management
async function loadUserProfile() {
    if (!authToken) return;
    
    try {
        const data = await userAPI.getProfile();
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Update UI with real data
        if (currentUser.watchlist) {
            watchlist = currentUser.watchlist;
        }
        if (currentUser.top5Films) {
            userTop5Films = currentUser.top5Films;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        // If token is invalid, logout
        if (error.message.includes('token')) {
            handleLogout();
        }
    }
}

// Updated watchlist functions
async function addToWatchlistAPI(movieId, movieTitle) {
    if (!currentUser) {
        alert('Please sign in to add movies to your watchlist!');
        return;
    }
    
    try {
        await userAPI.addToWatchlist(movieId, movieTitle);
        watchlist.push(movieId);
        alert(`"${movieTitle}" added to watchlist!`);
        
        if (currentPage === 'watchlist') {
            loadWatchlistPage();
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function removeFromWatchlistAPI(movieId, movieTitle) {
    if (!currentUser) return;
    
    try {
        await userAPI.removeFromWatchlist(movieId);
        watchlist = watchlist.filter(id => id !== movieId);
        alert(`"${movieTitle}" removed from watchlist!`);
        
        if (currentPage === 'watchlist') {
            loadWatchlistPage();
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Updated top 5 films functions
async function saveTop5FilmsAPI() {
    if (!currentUser) return;
    
    try {
        await userAPI.updateTop5Films(tempTop5Films);
        userTop5Films = [...tempTop5Films];
        loadProfileTop5();
        closeEditTop5Modal();
        alert('Your top 5 films have been updated!');
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Real review system
async function showMovieDetailsWithReviews(movieId) {
    try {
        const movie = await fetchFromTMDB(`/movie/${movieId}`);
        const credits = await fetchFromTMDB(`/movie/${movieId}/credits`);
        
        // Get reviews from backend
        let reviews = [];
        try {
            const reviewData = await reviewAPI.getReviews({ movieId, limit: 5 });
            reviews = reviewData.reviews;
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
        
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        
        const isInWatchlist = watchlist.includes(movieId);
        const watchlistText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        
        // Check if user has reviewed this movie
        const userReview = reviews.find(review => review.userId._id === currentUser?.id);
        const hasReviewed = !!userReview;
        
        const reviewsHTML = reviews.length > 0 ? `
            <div style="margin-top: 20px;">
                <h3>Recent Reviews:</h3>
                ${reviews.map(review => `
                    <div style="background: #333; padding: 1rem; margin: 0.5rem 0; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <strong>${review.userId.username}</strong>
                            <div>
                                <span style="color: #ffd700;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                                <button onclick="likeReview('${review._id}')" style="margin-left: 1rem; background: none; border: none; color: #ff6b6b; cursor: pointer;">
                                    ❤️ ${review.likes.length}
                                </button>
                            </div>
                        </div>
                        <p style="color: #ccc;">${review.reviewText}</p>
                        <small style="color: #888;">${new Date(review.createdAt).toLocaleDateString()}</small>
                    </div>
                `).join('')}
            </div>
        ` : '<p style="margin-top: 20px; color: #888;">No reviews yet. Be the first to review!</p>';
        
        const movieDetails = `
            <div style="max-width: 700px; margin: 20px auto; padding: 20px; background: #2a2a2a; border-radius: 10px; color: white; max-height: 80vh; overflow-y: auto;">
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
                
                ${currentUser ? `
                    <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 5px;">
                        <h3>Rate & Review</h3>
                        ${hasReviewed ? 
                            `<p style="color: #ff6b6b;">You have already reviewed this movie.</p>` :
                            `<div id="reviewForm">
                                <div style="margin: 10px 0;">
                                    <label>Rating: </label>
                                    <select id="movieRating" style="background: #333; color: white; border: none; padding: 5px;">
                                        <option value="">Select rating</option>
                                        <option value="1">1 Star</option>
                                        <option value="2">2 Stars</option>
                                        <option value="3">3 Stars</option>
                                        <option value="4">4 Stars</option>
                                        <option value="5">5 Stars</option>
                                    </select>
                                </div>
                                <textarea id="reviewText" placeholder="Write your review..." 
                                    style="width: 100%; height: 80px; background: #333; color: white; border: none; padding: 10px; border-radius: 5px; resize: vertical;"></textarea>
                                <button onclick="submitReview(${movieId}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path || ''}', '${movie.release_date ? movie.release_date.split('-')[0] : ''}')" 
                                    style="margin-top: 10px; background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                                    Submit Review
                                </button>
                            </div>`
                        }
                    </div>
                ` : ''}
                
                ${reviewsHTML}
                
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    ${currentUser ? `
                        <button onclick="toggleWatchlistAPI(${movieId}, '${movie.title.replace(/'/g, "\\'")}', this)" 
                            style="padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ${watchlistText}
                        </button>
                    ` : ''}
                    <button onclick="closeMovieDetails()" 
                        style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
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

async function submitReview(movieId, movieTitle, moviePoster, movieYear) {
    const rating = document.getElementById('movieRating').value;
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!rating || !reviewText) {
        alert('Please provide both a rating and review text.');
        return;
    }
    
    try {
        await reviewAPI.createReview({
            movieId: parseInt(movieId),
            movieTitle,
            moviePoster,
            movieYear,
            rating: parseInt(rating),
            reviewText
        });
        
        alert('Review submitted successfully!');
        closeMovieDetails();
        
        // Refresh user profile to update stats
        await loadUserProfile();
    } catch (error) {
        alert(`Error submitting review: ${error.message}`);
    }
}

async function likeReview(reviewId) {
    if (!currentUser) {
        alert('Please sign in to like reviews!');
        return;
    }
    
    try {
        await reviewAPI.likeReview(reviewId);
        // Refresh the movie details to show updated like count
        // You could make this more efficient by just updating the specific review
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Updated activity feed with real data
async function loadRealActivityFeed() {
    if (!currentUser) return;
    
    try {
        const data = await activityAPI.getActivityFeed(currentActivityTab);
        const activities = data.activities;
        
        if (activities.length === 0) {
            document.getElementById('activityFeed').innerHTML = '<p>No activity to show.</p>';
            return;
        }
        
        const activityHTML = activities.map(activity => {
            let text = '';
            const user = activity.userId.username;
            const timeAgo = getTimeAgo(activity.createdAt);
            
            switch (activity.activityType) {
                case 'watched_movie':
                    text = `<strong class="reviewer-name">${user}</strong> watched <span class="activity-movie">${activity.movieTitle}</span>`;
                    break;
                case 'rated_movie':
                    text = `<strong class="reviewer-name">${user}</strong> rated <span class="activity-movie">${activity.movieTitle}</span> ${activity.rating ? '★'.repeat(activity.rating) + '☆'.repeat(5-activity.rating) : ''}`;
                    break;
                case 'reviewed_movie':
                    text = `<strong class="reviewer-name">${user}</strong> reviewed <span class="activity-movie">${activity.movieTitle}</span>`;
                    break;
                case 'liked_review':
                    const targetUser = activity.targetUserId ? activity.targetUserId.username : 'someone';
                    text = `<strong class="reviewer-name">${user}</strong> liked ${targetUser}'s review`;
                    break;
                case 'added_to_watchlist':
                    text = `<strong class="reviewer-name">${user}</strong> added <span class="activity-movie">${activity.movieTitle}</span> to their watchlist`;
                    break;
                case 'added_friend':
                    const friendUser = activity.targetUserId ? activity.targetUserId.username : 'someone';
                    text = `<strong class="reviewer-name">${user}</strong> is now friends with <strong class="reviewer-name">${friendUser}</strong>`;
                    break;
                case 'updated_top5':
                    text = `<strong class="reviewer-name">${user}</strong> updated their top 5 films`;
                    break;
                default:
                    text = `<strong class="reviewer-name">${user}</strong> did something`;
            }
            
            return `
                <div class="activity-item">
                    <div class="activity-avatar"></div>
                    <div class="activity-text">${text}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        }).join('');
        
        document.getElementById('activityFeed').innerHTML = activityHTML;
    } catch (error) {
        console.error('Error loading activity feed:', error);
        document.getElementById('activityFeed').innerHTML = '<p>Error loading activity feed.</p>';
    }
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
}

// Friend management
async function searchAndAddFriend() {
    if (!currentUser) {
        alert('Please sign in first!');
        return;
    }
    
    const username = prompt('Enter username to add as friend:');
    if (!username) return;
    
    try {
        await friendsAPI.sendFriendRequest(username);
        alert(`Friend request sent to ${username}!`);
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function loadFriendRequests() {
    if (!currentUser) return;
    
    try {
        const data = await friendsAPI.getFriendRequests();
        const requests = data.requests;
        
        if (requests.length > 0) {
            const requestsText = requests.map(req => 
                `${req.requester.username} wants to be your friend`
            ).join('\n');
            
            if (confirm(`You have ${requests.length} friend request(s):\n${requestsText}\n\nWould you like to accept the first one?`)) {
                await friendsAPI.respondToFriendRequest(requests[0]._id, 'accept');
                alert('Friend request accepted!');
                await loadUserProfile(); // Refresh user data
            }
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

// Utility functions for backward compatibility
function toggleWatchlistAPI(movieId, movieTitle) {
    const isInWatchlist = watchlist.includes(movieId);
    if (isInWatchlist) {
        removeFromWatchlistAPI(movieId, movieTitle);
    } else {
        addToWatchlistAPI(movieId, movieTitle);
    }
    closeMovieDetails();
}

// Override the original showMovieDetails function
window.showMovieDetails = showMovieDetailsWithReviews;