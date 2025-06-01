// API Configuration
const API_BASE_URL = 'http://localhost:5000/api'; 

// Auth token management
let authToken = localStorage.getItem('authToken');

// API helper function
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            // Always get fresh token from localStorage
            ...(localStorage.getItem('authToken') && { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` })
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

// helper function to get auth headers
function getAuthHeaders() {
    // Always get fresh token from localStorage
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// helper function to handle API responses
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
    }
    return response.json();
}

// Auth API
const authAPI = {
    async register(username, email, password) {
        console.log('📡 Making registration request...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            console.log('📡 Response status:', response.status);
            
            // Get the response text first to see what we're dealing with
            const responseText = await response.text();
            console.log('📡 Raw response:', responseText);
            
            // Try to parse as JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log('📡 Parsed response:', responseData);
            } catch (parseError) {
                console.error('❌ Could not parse response as JSON:', parseError);
                
                // Check if the response text indicates success
                if (responseText.includes('User created') || responseText.includes('successfully')) {
                    console.log('✅ Registration appears successful based on response text');
                    return { message: 'Registration successful', user: { username } };
                }
                
                throw new Error('Server returned invalid response format');
            }
            
            // Check if request was successful (200-299 range)
            if (response.ok) {
                console.log('✅ Registration request successful');
                return responseData;
            } else {
                console.log('❌ Registration request failed with status:', response.status);
                
                // Special handling for specific status codes
                if (response.status === 409) {
                    throw new Error('Username or email already exists');
                } else if (response.status === 400) {
                    throw new Error(responseData.error || 'Invalid registration data');
                } else if (response.status === 500) {
                    // Sometimes 500 errors still create the user successfully
                    if (responseData.error && responseData.error.includes('duplicate')) {
                        throw new Error('Username or email already exists');
                    }
                    throw new Error('Server error during registration');
                } else {
                    throw new Error(responseData.error || `Registration failed with status ${response.status}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Registration fetch error:', error);
            
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server. Make sure your backend is running on localhost:5000');
            }
            
            throw error;
        }
    },

    async login(username, password) {
        console.log('📡 Making login request...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            console.log('📡 Login response status:', response.status);
            
            const responseText = await response.text();
            console.log('📡 Login raw response:', responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error('Server returned invalid response format');
            }
            
            if (response.ok) {
                console.log('✅ Login successful');
                return responseData;
            } else {
                console.log('❌ Login failed with status:', response.status);
                throw new Error(responseData.error || 'Login failed');
            }
            
        } catch (error) {
            console.error('❌ Login fetch error:', error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server');
            }
            
            throw error;
        }
    }
};



// user API
const userAPI = {
    async getProfile() {
        const response = await fetch(`${API_BASE_URL}/users/profile`, { 
            headers: getAuthHeaders()
        });
        return handleResponse(response);
    },

// Updates the updateProfile function in api.js:

    async updateProfile(profileData) {
        const result = await apiCall('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    
        if (result.token) {
            authToken = result.token;
            localStorage.setItem('authToken', authToken);
        }
        return result;
    },

    async updateTop5Films(top5Films) {
        const response = await fetch(`${API_BASE_URL}/users/top5`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ top5Films })
        });
        return handleResponse(response);
    },

    async addToWatchlist(movieId, movieTitle) {
        const response = await fetch(`${API_BASE_URL}/users/watchlist`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ movieId, movieTitle })
        });
        return handleResponse(response);
    },

    async removeFromWatchlist(movieId) {
        const response = await fetch(`${API_BASE_URL}/users/watchlist/${movieId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        return handleResponse(response);
    },

    async searchUsers(query) {
        const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });
        return handleResponse(response);
    },
    
    // Get another user's profile
    async getUserProfile(username) {
        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/${username}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to load user profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }
};

// reviews API
const reviewAPI = {
    // creates a new review
    async createReview(reviewData) {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(reviewData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create review');
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating review:', error);
            throw error;
        }
    },

    // gets the reviews
    async getReviews(params = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (params.movieId) queryParams.append('movieId', params.movieId);
            if (params.userId) queryParams.append('userId', params.userId);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.page) queryParams.append('page', params.page);

            const response = await fetch(`${API_BASE_URL}/reviews?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get reviews');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting reviews:', error);
            throw error;
        }
    },

    // to Like/unlike a review
    async toggleReviewLike(reviewId) {
        try {
            const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to toggle review like');
            }

            return await response.json();
        } catch (error) {
            console.error('Error toggling review like:', error);
            throw error;
        }
    }
};


// friendship API
const friendsAPI = {
    async sendFriendRequest(username) {
        const response = await fetch(`${API_BASE_URL}/friends/request`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        return handleResponse(response);
    },

    async respondToFriendRequest(friendshipId, action) {
        const response = await fetch(`${API_BASE_URL}/friends/request/${friendshipId}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action })
        });
        return handleResponse(response);
    },

    async getFriendRequests() {
        const response = await fetch(`${API_BASE_URL}/friends/requests`, {
            headers: getAuthHeaders()
        });
        return handleResponse(response);
    },

    // cleans the unfriend function
    async unfriend(username, friendId) {
        try {
            console.log('Attempting to unfriend:', username);
            
            const response = await fetch(`${API_BASE_URL}/friends/unfriend`, {
                method: 'DELETE',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to unfriend');
            }

            const result = await response.json();
            console.log('Unfriend successful:', result);
            return result;

        } catch (error) {
            console.error('Unfriend API error:', error);
            throw error;
        }
    }
};

// activity API - cleans the version for api.js
const activityAPI = {
    async getActivityFeed(type = 'friends', page = 1, limit = 20) {
        try {
            const response = await fetch(`${API_BASE_URL}/activities/feed?type=${type}&page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to get activity feed');
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting activity feed:', error);
            throw error;
        }
    }
};

async function handleLogin(username, password) {
    try {
        const data = await authAPI.login(username, password);
        
        // stores token and user data
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        currentUser = data.user;
        
        // loads full user profile
        await loadUserProfile();
        
        // Updates UI
        updateUIForLoggedInUser();
        
        // Ensures that the user is on the home page
        setTimeout(() => {
            showPage('home');
        }, 100);
        
    } catch (error) {
        alert(error.message || 'Login failed. Please try again.');
    }
}

async function handleRegister(username, email, password) {
    try {
        console.log('🔄 Starting registration for:', username);
        
        // Show processing notifs
        showReviewNotification('info', 'Creating your account...', {
            title: 'Registering'
        });
        
        const data = await authAPI.register(username, email, password);
        
        console.log('✅ Registration API call successful:', data);
        
        // checking if i got the expected success data
        if (data && (data.token || data.user || data.message)) {
            // stores token and the user data if provided
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                authToken = data.token;
                console.log('✅ Token saved:', data.token.substring(0, 20) + '...');
            }
            
            if (data.user) {
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                currentUser = data.user;
                console.log('✅ User data saved:', data.user);
            }
            
            // Update UI
            updateUIForLoggedInUser();
            
            // shows success notifs
            showReviewNotification('success', `Welcome to Movielized! Your account has been created successfully. Start discovering amazing movies!`, {
                title: `Welcome ${data.user?.username || username}!`
            });
            
            // navigates to home page with delay to show notifs
            setTimeout(() => {
                showPage('home');
            }, 2000); // Increased delay so user can see notifs
            
            console.log('✅ Registration completed successfully');
            return;
        } else {
            
            console.warn('⚠️ Unexpected response format, but registration might be successful:', data);
            
            if (data && typeof data === 'object') {
                showReviewNotification('warning', `Registration appears successful for ${username}! Please try logging in to continue.`, {
                    title: 'Registration Status'
                });
                setTimeout(() => {
                    showPage('auth');
                }, 2000);
                return;
            }
            
            throw new Error('Unexpected response from server');
        }
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // checks if this is actually a success case disguised as an error!!!
        if (error.message && error.message.includes('User created successfully')) {
            showReviewNotification('success', `Registration successful for ${username}! Please sign in to continue your movie journey.`, {
                title: 'Account Created'
            });
            setTimeout(() => {
                showPage('auth');
            }, 2000);
            return;
        }
        
        // shows the notifs error instead of alerts
        let errorMessage = '';
        let title = 'Registration Failed';
        
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            errorMessage = 'This username or email is already taken. Please try different credentials.';
            title = 'Account Already Exists';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and ensure the backend is running.';
            title = 'Connection Error';
        } else if (error.message.includes('Server error during registration')) {
            errorMessage = 'Server error occurred. Please try again or try logging in if account was created.';
            title = 'Server Error';
        } else {
            errorMessage = error.message || 'Something went wrong. Please try again.';
        }
        
        showReviewNotification('error', errorMessage, {
            title: title
        });
    }
}


function handleLogout() {
    // Clears local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clears app state
    currentUser = null;
    watchlist = [];
    userTop5Films = [];
    
    // Updates the UI
    document.getElementById('authBtn').style.display = 'block';
    document.getElementById('userDropdown').style.display = 'none';
    document.getElementById('watchlist-nav').style.display = 'none';
    document.getElementById('activity-nav').style.display = 'none';
    document.getElementById('userMenu').style.display = 'none';
    
    showPage('home');
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        
        // Updates currentUser with fresh data from server
        currentUser = { ...currentUser, ...data.user };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Sync watchlist and top 5 with server data
        if (currentUser.watchlist) {
            watchlist = [...currentUser.watchlist];
            localStorage.setItem('watchlist', JSON.stringify(watchlist));
            console.log('Watchlist synced from server:', watchlist.length, 'items');
        }
        
        if (currentUser.top5Films) {
            userTop5Films = [...currentUser.top5Films];
            localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
            console.log('Top 5 films synced from server:', userTop5Films.length, 'items');
        }
        
        console.log('Profile loaded and synced successfully');
        
        return currentUser;
    } catch (error) {
        console.error('Error loading user profile:', error);
        
        // Used cached data as fallback
        watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
        userTop5Films = JSON.parse(localStorage.getItem('userTop5Films')) || [];
        
        throw error;
    }
}

async function checkAuthStatus() {
    const token = localStorage.getItem("authToken");
    const userData = JSON.parse(localStorage.getItem('currentUser'));
    
    if (token && userData) {
        try {
            // Sets current user from localStorage
            currentUser = userData;
            
            // Verifies the token and load fresh user data
            await loadUserProfile();
            updateUIForLoggedInUser();
            
            console.log('Auth status checked and data synced');
        } catch (error) {
            // if Token invalid, logout
            console.log('Token invalid, logging out');
            handleLogout();
        }
    } else if (token) {
        // we have a token but no currentUser data
        try {
            // try to load the users profile with the token
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                await loadUserProfile();
                updateUIForLoggedInUser();
            } else {
                throw new Error('Invalid token');
            }
        } catch (error) {
            console.log('Could not restore user session');
            handleLogout();
        }
    }
}

// Initializing data arrays
let watchlist = [];
let userTop5Films = [];

// loads data from localStorage on startup
document.addEventListener('DOMContentLoaded', function() {
    // initializes from localStorage if available
    watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    userTop5Films = JSON.parse(localStorage.getItem('userTop5Films')) || [];
    
    console.log('Initialized data from localStorage:', {
        watchlist: watchlist.length,
        userTop5Films: userTop5Films.length
    });
});



// friend request functions
async function loadFriendRequests() {
    try {
        const data = await friendsAPI.getFriendRequests();
        if (data.requests.length > 0) {
            console.log(`You have ${data.requests.length} friend requests`);
        }
        return data.requests;
    } catch (error) {
        console.error('Failed to load friend requests:', error);
    }
}

async function searchAndAddFriend() {
    showAddFriendModal();
}

// saveTop5FilmsAPI function with notifs
async function saveTop5FilmsAPI() {
    try {
        await userAPI.updateTop5Films(tempTop5Films);
        userTop5Films = [...tempTop5Films];
        await loadUserProfile(); // Refreshes users data
        loadProfileTop5();
        closeEditTop5Modal();
        
        // shows aesthetic success notifs
        const filledSlots = tempTop5Films.filter(film => film !== null).length;
        showTop5Notification('success', 
            `Your top ${filledSlots} film${filledSlots !== 1 ? 's' : ''} ${filledSlots !== 1 ? 'have' : 'has'} been updated! They're now visible on your profile.`
        );
        
    } catch (error) {
        showTop5Notification('error', 'Failed to save your top 5 films. Please try again.');
        console.error('Save top 5 error:', error);
    }
}

// utility function for time ago
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
}

// performs search with backend integration
async function performSearch(query) {
    // it checks first if its a user search
    if (query.startsWith('@')) {
        try {
            const users = await userAPI.searchUsers(query.substring(1));
            // displays the user search results
            console.log('User search results:', users);
        } catch (error) {
            console.error('User search failed:', error);
        }
    } else {
        // regular movie search using TMDB
        let targetContainer, titleElement;
        
        if (currentPage === 'home') {
            targetContainer = 'trendingMovies';
            titleElement = document.querySelector('#homePage h2') || document.querySelector('#homePageLoggedIn h2');
        } else if (currentPage === 'films') {
            targetContainer = 'allMovies';
            titleElement = document.getElementById('filmsPageTitle');
        } else {
            showPage('home');
            targetContainer = 'trendingMovies';
            titleElement = document.querySelector('#homePage h2') || document.querySelector('#homePageLoggedIn h2');
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
}
// addding debug to see any errors in the code
async function testServerConnection() {
    try {
        console.log('Testing server connection...');
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET'
        });
        
        if (response.ok) {
            console.log('✅ Server is running and responding');
            return true;
        } else {
            console.log('❌ Server responded with error:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Cannot connect to server:', error.message);
        return false;
    }
}

console.log('API integration loaded successfully!');