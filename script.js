// TMDB API Configuration
const TMDB_API_KEY = 'bd594712da60f7589d4fec58ccb34acd';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// App State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 'home';
let currentActivityTab = 'friends';
let tempTop5Films = [];

// Initializing App
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    loadTrendingMovies();
    setupEventListeners();
});

//edit comment 2
// setupEventListeners function
function setupEventListeners() {
    setupGlobalSearch();
    
    // Prevent duplicate form listeners using data attributes
    const loginForm = document.getElementById('loginForm');
    if (loginForm && !loginForm.dataset.listenerAdded) {
        loginForm.dataset.listenerAdded = 'true';
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = e.target.querySelector('input[type="text"]').value.trim();
            const password = e.target.querySelector('input[type="password"]').value.trim();
            
            if (username && password) {
                handleLogin(username, password);
            } else {
                alert('Please enter both username and password.');
            }
        });
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm && !signupForm.dataset.listenerAdded) {
        signupForm.dataset.listenerAdded = 'true';
        signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = e.target.querySelector('input[type="text"]').value.trim();
            const email = e.target.querySelector('input[type="email"]').value.trim();
            const password = e.target.querySelector('input[type="password"]').value.trim();
        
            if (username && email && password) {

                if (username.length < 3) {
                    showReviewNotification('warning', 'Username must be at least 3 characters long for a unique identity.', {
                        title: 'Username Too Short'
                    });
                    return;
                }
                if (password.length < 6) {
                    showReviewNotification('warning', 'Password must be at least 6 characters long for better security.', {
                        title: 'Password Too Short'
                    });
                    return;
                }
                if (!email.includes('@')) {
                    showReviewNotification('warning', 'Please enter a valid email address to continue.', {
                        title: 'Invalid Email'
                    });
                    return;
                }
            
                handleRegister(username, email, password);
            } else {
                showReviewNotification('warning', 'Please fill in all fields to create your account.', {
                    title: 'Missing Information'
                });
            }
        });
    }
}

// Funtion to be able to search from anywhere in the website
function setupGlobalSearch() {

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('keypress', handleGlobalSearch);
        newSearchInput.addEventListener('input', handleSearchInput);
    }
}

// Handling search input for real time feedback
function handleSearchInput(e) {
    const query = e.target.value.trim();
    const searchBtn = document.getElementById('searchBtn');
    
    // Enable and disable search button basing on the input
    if (searchBtn) {
        searchBtn.style.opacity = query ? '1' : '0.6';
        searchBtn.style.cursor = query ? 'pointer' : 'not-allowed';
    }
}

// Searches when hitting enter on the keyboard
async function handleGlobalSearch(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query) {
            await performGlobalSearch(query);
        } else {
            alert('Please enter a search term');
        }
    }
}


// Function to load random bg images from TMDB
async function loadRandomBackground() {
    try {
        // Getting the latest movies for bg pictures
        const data = await fetchFromTMDB('/movie/popular');
        
        // Filtering films that have bg pictures
        const moviesWithBackdrops = data.results.filter(movie => movie.backdrop_path);
        
        if (moviesWithBackdrops.length > 0) {
            // Picking a random film from TMDB
            const randomMovie = moviesWithBackdrops[Math.floor(Math.random() * moviesWithBackdrops.length)];
            const backdropUrl = `https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}`;
            
            // Applying the bg only to signed out users
            applyBackgroundToHero(backdropUrl, randomMovie.title);
        }
    } catch (error) {
        console.error('Error loading background image:', error);
        // Goes back to default bg picture
        applyDefaultHeroBackground();
    }
}

// Applying bg pictures only to signed out in the hero section
function applyBackgroundToHero(imageUrl, movieTitle) {
    const heroSection = document.querySelector('#homePage .hero');
    if (heroSection) {
        heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url('${imageUrl}')`;
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
        heroSection.style.backgroundRepeat = 'no-repeat';
        heroSection.setAttribute('data-background-movie', movieTitle);
    }
}

// Goes back to default bg picture in the hero section
function applyDefaultHeroBackground() {
    const heroSection = document.querySelector('#homePage .hero');
    if (heroSection) {
        heroSection.style.backgroundImage = 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)';
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
    }
}


// Goes back to default bg picture
function applyDefaultBackground() {
    // For signed out home page
    const heroSection = document.querySelector('#homePage .hero');
    if (heroSection) {
        heroSection.style.backgroundImage = 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)';
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
    }
    
    // For signed in homepage
    const heroImageSection = document.querySelector('#homePageLoggedIn .hero-image-section');
    if (heroImageSection) {
        heroImageSection.style.backgroundImage = 'linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%)';
        heroImageSection.style.backgroundSize = 'cover';
        heroImageSection.style.backgroundPosition = 'center';
    }
}

// UI for signed in user
function updateUIForLoggedInUser() {
    document.getElementById('authBtn').style.display = 'none';
    document.getElementById('userDropdown').style.display = 'block';
    document.getElementById('watchlist-nav').style.display = 'block';
    document.getElementById('activity-nav').style.display = 'block';
    document.getElementById('userGreeting').textContent = currentUser.username;
    
    // Forcing the navigation to go to the homepage
    setTimeout(() => {
        showPage('home');
    }, 100);
    
    // Loading friends requests on sign in
    if (typeof loadFriendRequests === 'function') {
        loadFriendRequests();
    }
}

// Toggling user menu
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Sign out function
function logout() {
    handleLogout();
}

// showPage function to rsearch listeners
function showPage(page) {
    console.log('Showing page:', page);
    
    // Updates the current page
    currentPage = page;
    
    // Hides all the pages
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    
    // Handling homepage based on the sign in status
    if (page === 'home') {
        if (currentUser) {
            document.getElementById('homePageLoggedIn').style.display = 'block';
        } else {
            document.getElementById('homePage').style.display = 'block';
        }
    } else {
        
        const pageElement = document.getElementById(page + 'Page');
        if (pageElement) {
            pageElement.style.display = 'block';
        }
    }
    
    // 
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Finds and highlights the nav link
    const activeLink = document.querySelector(`nav a[onclick*="showPage('${page}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Set ups the search listeners again after changing the page
    setTimeout(() => {
        setupGlobalSearch();
    }, 100);
    
    // Loads specific page content
    switch(page) {
        case 'home':
            if (currentUser) {
                loadLoggedInHomePage();
            } else {
                loadTrendingMovies();
            }
            break;
        case 'editProfile':
            loadEditProfilePage();
            break;
        case 'films':
            // Only loads all movies if a user didn't search
            const searchInput = document.getElementById('searchInput');
            if (!searchInput || !searchInput.value.trim()) {
                loadAllMovies();
                const titleElement = document.getElementById('filmsPageTitle');
                if (titleElement) {
                    titleElement.textContent = 'Browse Movies';
                }
            }
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
            break;
        case 'auth':
            break;
    }
    
    window.scrollTo(0, 0);
}


// Shows the public profile page
async function showUserProfile(username) {
  if (!username) return;

  try {
    currentPage = "publicProfile";

    // Hides all pages and only shows the public profile
    document
      .querySelectorAll(".page")
      .forEach((p) => (p.style.display = "none"));
    document.getElementById("publicProfilePage").style.display = "block";

    // Showing the loading state
    document.getElementById("publicProfileUsername").textContent = "Loading...";

    // Fetches users profile data
    const data = await userAPI.getUserProfile(username);
    currentPublicUser = data.user;

    // Loads the profiles
    loadPublicProfilePage();
  } catch (error) {
    console.error("Error loading user profile:", error);
    alert(`Error loading profile: ${error.message}`);
    showPage("home");
  }
}

// loadPublicProfilePage function
async function loadPublicProfilePage() {
    if (!currentPublicUser) return;

    // Displaying the pfp
    const profileAvatar = document.getElementById("publicProfileAvatar");
    if (currentPublicUser.profilePicture) {
        profileAvatar.innerHTML = `<img src="${currentPublicUser.profilePicture}" alt="${currentPublicUser.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        profileAvatar.textContent = currentPublicUser.username.charAt(0).toUpperCase();
    }

    // Updates the profile info in the profle page
    document.getElementById("publicProfileUsername").textContent = currentPublicUser.username;

    // Displays the pronouns
    const pronounsElement = document.getElementById("publicProfilePronouns");
    if (currentPublicUser.pronouns) {
        pronounsElement.textContent = currentPublicUser.pronouns;
        pronounsElement.style.display = "block";
    } else {
        pronounsElement.style.display = "none";
    }

    // Displays the bio for the user
    const bioElement = document.getElementById("publicProfileBio");
    if (currentPublicUser.bio) {
        bioElement.textContent = currentPublicUser.bio;
        bioElement.style.display = "block";
    } else {
        bioElement.style.display = "none";
    }

    // Displays the location
    const locationElement = document.getElementById("publicProfileLocation");
    if (currentPublicUser.location) {
        locationElement.textContent = `📍 ${currentPublicUser.location}`;
        locationElement.style.display = "block";
    } else {
        locationElement.style.display = "none";
    }

    document.getElementById("publicProfileJoinDate").textContent = `Joined ${new Date(currentPublicUser.joinDate).toLocaleDateString()}`;

    const followBtn = document.getElementById("followUserBtn");

    if (currentPublicUser.isFriend) {
        // Shows if the user is friends wiht another user
        followBtn.textContent = "Friends ✓";
        followBtn.style.background = "#4CAF50";
        followBtn.style.cursor = "default";
        followBtn.onclick = null; // Disable the button
    } else if (currentPublicUser.isFollowing) {
        followBtn.textContent = "Pending...";
        followBtn.style.background = "#orange";
    } else {
        // Not friends yet but can add
        followBtn.textContent = "Add Friend";
        followBtn.style.background = "#ff6b6b";
        followBtn.style.cursor = "pointer";
        followBtn.onclick = () => toggleFollowUser();
    }

    const stats = currentPublicUser.stats;
    document.getElementById("publicProfileStats").innerHTML = `
        <div class="stat">
            <div class="stat-number">${stats.moviesWatched || 0}</div>
            <div class="stat-label">FILMS</div>
        </div>
        <div class="stat">
            <div class="stat-number">${stats.moviesThisYear || 0}</div>
            <div class="stat-label">THIS YEAR</div>
        </div>
        <div class="stat">
            <div class="stat-number">${stats.following || stats.friends || 0}</div>
            <div class="stat-label">FRIENDS</div>
        </div>
    `;

    // Loads the Top 5 Films
    await loadPublicUserTop5();

    // Loads the Recent Reviews
    loadPublicUserReviews();

    // Loads Watchlist Preview only 4 movies in the profile page
    await loadPublicUserWatchlist();
}

// Loads public users top 5 films in their profile
async function loadPublicUserTop5() {
  const container = document.getElementById("publicProfileTop5");

  if (
    !currentPublicUser.top5Films ||
    currentPublicUser.top5Films.length === 0
  ) {
    container.innerHTML =
      '<p style="color: #888;">No top 5 films selected yet.</p>';
    return;
  }

  try {
    const moviePromises = currentPublicUser.top5Films.map((movieId) =>
      movieId ? fetchFromTMDB(`/movie/${movieId}`) : null
    );
    const movies = await Promise.all(moviePromises);

    container.innerHTML = Array.from({ length: 5 }, (_, i) => {
      const movie = movies[i];
      if (movie) {
        return `
                    <div class="top-5-slot filled" onclick="showMovieDetails(${
                      movie.id
                    })">
                        <div class="top-5-rank">${i + 1}</div>
                        <img src="${
                          movie.poster_path
                            ? TMDB_IMAGE_BASE_URL + movie.poster_path
                            : "https://via.placeholder.com/200x300/333/white?text=No+Image"
                        }" 
                             alt="${movie.title}" class="top-5-poster">
                    </div>
                `;
      } else {
        return `
                    <div class="top-5-slot">
                        <div class="top-5-rank">${i + 1}</div>
                        <span style="color: #888;">Empty</span>
                    </div>
                `;
      }
    }).join("");
  } catch (error) {
    console.error("Error loading public user top 5:", error);
    container.innerHTML = "<p>Error loading top 5 films.</p>";
  }
}

// Loads public users recent reviews
function loadPublicUserReviews() {
  const container = document.getElementById("publicProfileReviews");

  if (!currentPublicUser.reviews || currentPublicUser.reviews.length === 0) {
    container.innerHTML = '<p style="color: #888;">No reviews yet.</p>';
    return;
  }

  const reviewsHTML = currentPublicUser.reviews
    .slice(0, 5)
    .map(
      (review) => `
        <div class="review-card">
            <img src="${
              review.moviePoster ||
              "https://via.placeholder.com/80x120/555/white?text=Movie"
            }" alt="${review.movieTitle}" class="review-movie-poster">
            <div class="review-content">
                <div class="review-movie-title">${review.movieTitle} ${
        review.movieYear || ""
      }</div>
                <div class="review-rating">${"★".repeat(
                  review.rating
                )}${"☆".repeat(5 - review.rating)}</div>
                <div class="review-text">${review.reviewText}</div>
                <div class="review-date">Watched on ${new Date(
                  review.createdAt
                ).toLocaleDateString()} • ❤️ ${review.likes.length}</div>
            </div>
        </div>
    `
    )
    .join("");

  container.innerHTML = reviewsHTML;
}

// Loads public users watchlist preview
async function loadPublicUserWatchlist() {
  const container = document.getElementById("publicProfileWatchlist");

  // Only shows watchlist if a user is following them
  if (
    !currentPublicUser.watchlist ||
    currentPublicUser.watchlist.length === 0
  ) {
    container.innerHTML =
      '<p style="color: #888;">Watchlist is empty or private.</p>';
    return;
  }

  try {
    const moviePromises = currentPublicUser.watchlist
      .slice(0, 4)
      .map((movieId) => fetchFromTMDB(`/movie/${movieId}`));
    const movies = await Promise.all(moviePromises);

    const formattedMovies = movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.release_date ? movie.release_date.split("-")[0] : "N/A",
      poster: movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : "https://via.placeholder.com/300x450/333/white?text=No+Image",
      rating: movie.vote_average,
    }));

    displayMovies(formattedMovies, "publicProfileWatchlist");
  } catch (error) {
    container.innerHTML = "<p>Error loading watchlist preview.</p>";
  }
}

async function toggleFollowUser() {
    if (!currentPublicUser) return;
    
    try {
        if (currentPublicUser.isFriend) {
            showFriendNotification('info', 'You are already friends with this user!');
            return;
        } else {
            // Sends a friend request
            await friendsAPI.sendFriendRequest(currentPublicUser.username);
            showFriendNotification('sent', `Friend request sent to ${currentPublicUser.username}!`);
        }
        
        // Refresh the profile page and updates your own friend counts
        await showUserProfile(currentPublicUser.username);
        await updateFriendCounts();
        
    } catch (error) {
        showFriendNotification('error', error.message || 'Failed to send friend request.');
    }
}


// loadActivityPage function
async function loadActivityPage() {
    if (!currentUser) {
        showPage('auth');
        return;
    }
    
    // Loads real activity feed from users of the website
    await loadRealActivityFeed();
}


// switchActivityTab function
function switchActivityTab(tab) {
    currentActivityTab = tab;
    
    document.getElementById('friendsActivityTab').classList.toggle('active', tab === 'friends');
    document.getElementById('yourActivityTab').classList.toggle('active', tab === 'your');
    
    loadRealActivityFeed();
}

// loadRealActivityFeed function
async function loadRealActivityFeed() {
    try {
        if (typeof activityAPI === 'undefined') {
            displayEmptyActivityMessage();
            return;
        }
        
        const data = await activityAPI.getActivityFeed(currentActivityTab, 1, 20);
        
        if (data.activities && data.activities.length > 0) {
            displayActivityFeed(data.activities);
        } else {
            displayEmptyActivityMessage();
        }
    } catch (error) {
        console.error('Error loading activity feed:', error);
        displayEmptyActivityMessage();
    }
}

// Function to display if theres no activity
function displayEmptyActivityMessage() {
    const activityFeed = document.getElementById('activityFeed');
    
    if (!activityFeed) return;
    
    if (currentActivityTab === 'friends') {
        const friendCount = calculateFriendCount();
        
        if (friendCount === 0) {
            // No friends
            activityFeed.innerHTML = `
                <div style="text-align: center; padding: 3rem 2rem; background: #2a2a2a; border-radius: 10px; color: #ccc;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                    <h3 style="color: #ff6b6b; margin-bottom: 1rem;">No Friends Yet</h3>
                    <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                        Add some friends to see their activity here! <br>
                        Follow other movie lovers to discover what they're watching.
                    </p>
                    <button onclick="showPage('profile')" style="background: #ff6b6b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold;">
                        Add Friends
                    </button>
                </div>
            `;
        } else {
            // Shows when has friends but no theres no activity
            activityFeed.innerHTML = `
                <div style="text-align: center; padding: 2rem; background: #2a2a2a; border-radius: 10px; color: #888;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📽️</div>
                    <h4 style="color: #ccc; margin-bottom: 1rem;">No Recent Activity</h4>
                    <p>Your friends haven't been active recently.</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem; color: #666;">Encourage them to start watching and rating movies!</p>
                </div>
            `;
        }
    } else {
        // The users own activity tab
        activityFeed.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; background: #2a2a2a; border-radius: 10px; color: #ccc;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🎬</div>
                <h3 style="color: #ff6b6b; margin-bottom: 1rem;">No Activity Yet</h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                    Start your movie journey! <br>
                    Watch movies, write reviews, and rate films to see your activity here.
                </p>
                <button onclick="showPage('films')" style="background: #ff6b6b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Browse Movies
                </button>
            </div>
        `;
    }
}

// displayActivityFeed function
function displayActivityFeed(activities) {
    if (!activities || activities.length === 0) {
        document.getElementById('activityFeed').innerHTML = '<p style="color: #888; text-align: center;">No activities to display.</p>';
        return;
    }
    
    const activityHTML = activities.map((activity) => {
        const user = activity.userId;
        if (!user) {
            return '';
        }
        
        const username = user.username || 'Unknown User';
        const profilePicture = user.profilePicture;
        const timeAgo = getTimeAgo(activity.createdAt);
        
        let actionText = '';
        let movieInfo = '';
        let extraInfo = '';
        
        switch (activity.activityType) {
            case 'watched_movie':
                actionText = `watched`;
                movieInfo = activity.movieTitle;
                break;
            case 'rated_movie':
                actionText = `rated`;
                movieInfo = activity.movieTitle;
                extraInfo = activity.rating ? `★`.repeat(activity.rating) + `☆`.repeat(5-activity.rating) : '';
                break;
            case 'reviewed_movie':
                actionText = `wrote a review for`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_to_watchlist':
                actionText = `added to watchlist`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_friend':
                const targetUser = activity.targetUserId;
                actionText = `became friends with`;
                movieInfo = targetUser ? targetUser.username : 'someone';
                break;
            case 'updated_top5':
                actionText = `updated their top 5 films`;
                movieInfo = '';
                break;
            case 'liked_review':
                actionText = `liked a review`;
                movieInfo = '';
                break;
            default:
                actionText = `updated their activity`;
                movieInfo = '';
        }

        // Creates the profile picture
        let profilePictureHTML;
        if (profilePicture && profilePicture.trim() !== '') {
            profilePictureHTML = `<img src="${profilePicture}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profilePictureHTML = `<span style="font-weight: bold; color: white;">${username.charAt(0).toUpperCase()}</span>`;
        }

        return `
            <div class="activity-item" style="display: flex; align-items: center; padding: 1rem; border-bottom: 1px solid #333; background: #2a2a2a; margin-bottom: 0.5rem; border-radius: 8px;">
                <div onclick="showUserProfile('${username}')" style="width: 50px; height: 50px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; cursor: pointer; overflow: hidden;">
                    ${profilePictureHTML}
                </div>
                <div style="flex: 1;">
                    <div style="color: white; margin-bottom: 0.25rem;">
                        <strong style="color: #ff6b6b; cursor: pointer;" onclick="showUserProfile('${username}')">${username}</strong> 
                        ${actionText} 
                        ${movieInfo ? `<span style="color: #ccc;">${movieInfo}</span>` : ''}
                        ${extraInfo ? `<span style="color: #ffd700; margin-left: 0.5rem;">${extraInfo}</span>` : ''}
                    </div>
                    <div style="color: #888; font-size: 0.85rem;">${timeAgo}</div>
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');

    document.getElementById('activityFeed').innerHTML = activityHTML;
}

// displayFriendsActivity function
function displayFriendsActivity(activities) {
    if (!activities || activities.length === 0) {
        document.getElementById('friendsActivity').innerHTML = '<p style="color: #888; text-align: center;">No recent activity from friends.</p>';
        return;
    }

    const activityHTML = activities.map(activity => {
        const user = activity.userId;
        const username = user.username;
        const profilePicture = user.profilePicture;
        const timeAgo = getTimeAgo(activity.createdAt);
        
        let actionText = '';
        let movieInfo = '';
        
        switch (activity.activityType) {
            case 'watched_movie':
                actionText = `watched`;
                movieInfo = activity.movieTitle;
                break;
            case 'rated_movie':
                actionText = `rated`;
                movieInfo = `${activity.movieTitle} ${activity.rating ? '★'.repeat(activity.rating) + '☆'.repeat(5-activity.rating) : ''}`;
                break;
            case 'reviewed_movie':
                actionText = `reviewed`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_to_watchlist':
                actionText = `added to watchlist`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_friend':
                actionText = `became friends with ${activity.targetUserId ? activity.targetUserId.username : 'someone'}`;
                movieInfo = '';
                break;
            default:
                actionText = `updated their activity`;
                movieInfo = '';
        }

        // Create profile picture
        let profilePictureHTML;
        if (profilePicture) {
            profilePictureHTML = `<img src="${profilePicture}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profilePictureHTML = `<span style="font-weight: bold; color: white;">${username.charAt(0).toUpperCase()}</span>`;
        }

        return `
            <div class="activity-item" style="display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid #333;">
                <div onclick="showUserProfile('${username}')" style="width: 40px; height: 40px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; cursor: pointer; overflow: hidden;">
                    ${profilePictureHTML}
                </div>
                <div style="flex: 1;">
                    <div style="color: white;">
                        <strong style="color: #ff6b6b; cursor: pointer;" onclick="showUserProfile('${username}')">${username}</strong> ${actionText} ${movieInfo ? `<span style="color: #ccc;">${movieInfo}</span>` : ''}
                    </div>
                    <div style="color: #888; font-size: 0.8rem;">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('friendsActivity').innerHTML = activityHTML;
}


// toggleWatchlist function for notifs
async function toggleWatchlist(movieId, movieTitle, buttonElement) {
    console.log('toggleWatchlist called with:', movieId, movieTitle);
    
    if (!currentUser) {
        showReviewNotification('error', 'Please sign in to add movies to your watchlist!');
        return;
    }
    
    try {
        const isInWatchlist = watchlist.includes(movieId);
        console.log('Is in watchlist?', isInWatchlist);
        console.log('Current watchlist:', watchlist);
        
        if (isInWatchlist) {
            // Removes films from watchlist using the API
            console.log('Calling removeFromWatchlistAPI...');
            if (typeof removeFromWatchlistAPI === 'function') {
                await removeFromWatchlistAPI(movieId, movieTitle);
            } else {
                console.error('removeFromWatchlistAPI is not defined!');
                // Goes back to the local storage
                watchlist = watchlist.filter(id => id !== movieId);
                localStorage.setItem('watchlist', JSON.stringify(watchlist));
                showWatchlistNotification('removed', movieTitle);
            }
        } else {
            // Adds films to the watchlist using API
            console.log('Calling addToWatchlistAPI...');
            if (typeof addToWatchlistAPI === 'function') {
                await addToWatchlistAPI(movieId, movieTitle);
            } else {
                console.error('addToWatchlistAPI is not defined!');
                // Goes back to the local storage
                watchlist.push(movieId);
                localStorage.setItem('watchlist', JSON.stringify(watchlist));
                showWatchlistNotification('added', movieTitle);
            }
        }
        
        closeMovieDetails();
        
        // Refreshes the watchlist page if youre the page
        if (currentPage === 'watchlist') {
            loadWatchlistPage();
        }
        
    } catch (error) {
        console.error('Watchlist update error:', error);
        showReviewNotification('error', 'Failed to update watchlist. Please try again.');
    }
}

async function addToWatchlistAPI(movieId, movieTitle) {
    try {
        console.log('Adding to watchlist via API:', movieId, movieTitle);
        
        // Calls the backend of the API
        const result = await userAPI.addToWatchlist(movieId, movieTitle);
        console.log('Watchlist API response:', result);
        
        // Updates the local data to match the backend
        if (!watchlist.includes(movieId)) {
            watchlist.push(movieId);
        }
        
        // Updates the currentUser
        if (currentUser) {
            if (!currentUser.watchlist) {
                currentUser.watchlist = [];
            }
            if (!currentUser.watchlist.includes(movieId)) {
                currentUser.watchlist.push(movieId);
            }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        // Updates localStorage backup
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        
        showReviewNotification('success', `"${movieTitle}" added to your watchlist!`, {
            title: movieTitle
        });
        
        console.log('Watchlist updated successfully');
        
    } catch (error) {
        console.error('Failed to add to watchlist via API:', error);
        
        if (!watchlist.includes(movieId)) {
            watchlist.push(movieId);
            localStorage.setItem('watchlist', JSON.stringify(watchlist));
        }
        
        if (currentUser && currentUser.watchlist && !currentUser.watchlist.includes(movieId)) {
            currentUser.watchlist.push(movieId);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        showReviewNotification('warning', `"${movieTitle}" added locally. Changes may not persist until backend is connected.`, {
            title: movieTitle
        });
    }
}

// removeFromWatchlistAPI function
async function removeFromWatchlistAPI(movieId, movieTitle) {
    try {
        console.log('Removing from watchlist via API:', movieId, movieTitle);
        
        // Calls the backend of the API
        const result = await userAPI.removeFromWatchlist(movieId);
        console.log('Remove watchlist API response:', result);
        
        watchlist = watchlist.filter(id => id !== movieId);
        
        if (currentUser && currentUser.watchlist) {
            currentUser.watchlist = currentUser.watchlist.filter(id => id !== movieId);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        
        showReviewNotification('updated', `"${movieTitle}" removed from watchlist.`, {
            title: movieTitle
        });
        
        console.log('Watchlist removal successful');
        
    } catch (error) {
        console.error('Failed to remove from watchlist via API:', error);
        
        watchlist = watchlist.filter(id => id !== movieId);
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
        
        if (currentUser && currentUser.watchlist) {
            currentUser.watchlist = currentUser.watchlist.filter(id => id !== movieId);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        showReviewNotification('warning', `"${movieTitle}" removed locally. Changes may not persist until backend is connected.`, {
            title: movieTitle
        });
    }
}

// Displays the friend requests on the users profile page
async function displayFriendRequests() {
    if (!currentUser) return;
    
    try {
        const data = await friendsAPI.getFriendRequests();
        const container = document.getElementById('friendRequests');
        
        if (!container) return;
        
        if (data.requests && data.requests.length > 0) {
            container.innerHTML = `
                <div style="background: #2a2a2a; padding: 1rem; border-radius: 5px; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 0.5rem; color: #ff6b6b;">Pending Friend Requests</h4>
                    ${data.requests.map(req => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #444;">
                            <span>${req.requester.username}</span>
                            <div>
                                <button onclick="respondToFriendRequest('${req._id}', 'accept')" 
                                    style="background: #4CAF50; color: white; border: none; padding: 0.25rem 0.5rem; margin-right: 0.5rem; cursor: pointer; border-radius: 3px;">
                                    Accept
                                </button>
                                <button onclick="respondToFriendRequest('${req._id}', 'decline')" 
                                    style="background: #f44336; color: white; border: none; padding: 0.25rem 0.5rem; cursor: pointer; border-radius: 3px;">
                                    Decline
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading friend requests:', error);
    }
}

// respondToFriendRequest function with notifs
async function respondToFriendRequest(friendshipId, action) {
    try {
        await friendsAPI.respondToFriendRequest(friendshipId, action);
        
        if (action === 'accept') {
            showFriendNotification('accepted', 'You are now friends! Check out their profile and movie activity.');
        } else {
            showFriendNotification('declined', 'Friend request has been declined.');
        }
        
        // Refreshes the user data and UI deisgn
        await loadUserProfile();
        await displayFriendRequests();
        await updateFriendCounts();
        
    } catch (error) {
        showFriendNotification('error', `Failed to ${action} friend request. Please try again.`);
    }
}

// displayFriendsList function for the unfriend option
function displayFriendsList() {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList || !currentUser) return;
    
    console.log('Current user data:', currentUser);
    console.log('Friends array:', currentUser.friends);
    
    // Checks multiple for the possible locations for friends data
    let friends = [];
    
    if (currentUser.friends && Array.isArray(currentUser.friends)) {
        friends = currentUser.friends;
    } else if (currentUser.following && Array.isArray(currentUser.following)) {
        friends = currentUser.following;
        console.log('Using following as fallback for friends');
    }
    
    console.log('Friends to display:', friends);
    
    if (friends && friends.length > 0) {
        friendsList.innerHTML = friends.map(friend => {
            
            let profilePictureHTML;
            if (friend.profilePicture) {
                profilePictureHTML = `<img src="${friend.profilePicture}" alt="${friend.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                profilePictureHTML = `<span style="font-size: 1.5rem; font-weight: bold; color: white;">${friend.username ? friend.username.charAt(0).toUpperCase() : '?'}</span>`;
            }

            return `
                <div class="friend-card" style="background: #2a2a2a; padding: 1rem; border-radius: 5px; text-align: center; position: relative;">
                    <!-- Unfriend button in top right corner -->
                    <button onclick="confirmUnfriend('${friend.username || friend}', '${friend._id || friend.id || ''}')" 
                            style="position: absolute; top: 0.5rem; right: 0.5rem; background: #ff4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center;"
                            title="Unfriend ${friend.username || friend}">
                        ×
                    </button>
                    
                    <!-- Profile picture and username (clickable) -->
                    <div onclick="showUserProfile('${friend.username || friend}')" style="cursor: pointer;">
                        <div style="width: 60px; height: 60px; background: #ff6b6b; border-radius: 50%; margin: 0 auto 0.5rem; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            ${profilePictureHTML}
                        </div>
                        <div style="color: white; font-size: 0.9rem;">${friend.username || friend}</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        friendsList.innerHTML = '<p style="color: #888;">No friends yet. Add some friends to see their activity!</p>';
    }
}

// Confirms the unfriend action
function confirmUnfriend(username, friendId) {
    const modal = document.createElement('div');
    modal.id = 'unfriendModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: #2a2a2a; padding: 2rem; border-radius: 10px; max-width: 400px; text-align: center; color: white;">
            <h3 style="margin-bottom: 1rem; color: #ff6b6b;">Unfriend ${username}?</h3>
            <p style="margin-bottom: 2rem; color: #ccc;">
                Are you sure you want to remove <strong>${username}</strong> from your friends list? 
                This action cannot be undone.
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button onclick="executeUnfriend('${username}', '${friendId}')" 
                        style="padding: 0.75rem 1.5rem; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Yes, Unfriend
                </button>
                <button onclick="closeUnfriendModal()" 
                        style="padding: 0.75rem 1.5rem; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    
    // Closes window when clicking outside of the boz
    modal.onclick = (e) => {
        if (e.target === modal) closeUnfriendModal();
    };
    
    document.body.appendChild(modal);
}

// Closes the unfriend window
function closeUnfriendModal() {
    const modal = document.getElementById('unfriendModal');
    if (modal) {
        modal.remove();
    }
}

// executeUnfriend function notifs
async function executeUnfriend(username, friendId) {
    try {
        closeUnfriendModal();
        // Shows loading the notifs
        showFriendNotification('info', `Removing ${username} from your friends list...`);
        
        let success = false;
        
        if (typeof friendsAPI !== 'undefined' && friendsAPI.unfriend) {
            try {
                await friendsAPI.unfriend(username, friendId);
                success = true;
                console.log('API unfriend successful');
            } catch (apiError) {
                console.log('API unfriend failed (expected if backend endpoints not ready), using fallback:', apiError.message);
            }
        }
        
        if (!success) {
            await fallbackUnfriend(username, friendId);
            success = true;
            console.log('Fallback unfriend completed');
        }
        
        if (success) {
            // Shows the notifs
            showFriendNotification('declined', `${username} has been removed from your friends list.`);
            
            updateFriendListUI(username);
            
            try {
                await loadUserProfile();
            } catch (error) {
                console.log('Could not refresh from server, using local data:', error.message);
            }
            
            // Updates the friend count and refresh the page
            await updateFriendCounts();
            
            // Refreshes current page 
            if (currentPage === 'profile') {
                displayFriendsList();
            }
            
            if (currentPage === 'publicProfile' && currentPublicUser && currentPublicUser.username === username) {
                const followBtn = document.getElementById("followUserBtn");
                if (followBtn) {
                    followBtn.textContent = "Add Friend";
                    followBtn.style.background = "#ff6b6b";
                    followBtn.style.cursor = "pointer";
                    followBtn.onclick = () => toggleFollowUser();
                }
            }
        }
        
    } catch (error) {
        console.error('Error unfriending user:', error);
        showFriendNotification('error', `Failed to unfriend ${username}. Please try again.`);
    }
}

// fallbackUnfriend function with logging
async function fallbackUnfriend(username, friendId) {
    if (!currentUser) {
        throw new Error('User not logged in');
    }
    
    console.log('Starting fallback unfriend for:', username);
    console.log('Before unfriend - Friends:', currentUser.friends);
    console.log('Before unfriend - Following:', currentUser.following);
    
    let friendRemoved = false;

    // Removes from friends array
    if (currentUser.friends && Array.isArray(currentUser.friends)) {
        const originalLength = currentUser.friends.length;
        currentUser.friends = currentUser.friends.filter(friend => {
            if (typeof friend === 'object') {
                return friend.username !== username && friend._id !== friendId && friend.id !== friendId;
            } else {
                return friend !== username;
            }
        });
        
        if (currentUser.friends.length < originalLength) {
            friendRemoved = true;
            console.log('Removed from friends array');
        }
    }
    
    // Also checks for the following array
    if (currentUser.following && Array.isArray(currentUser.following)) {
        const originalLength = currentUser.following.length;
        currentUser.following = currentUser.following.filter(friend => {
            if (typeof friend === 'object') {
                return friend.username !== username && friend._id !== friendId && friend.id !== friendId;
            } else {
                return friend !== username;
            }
        });
        
        if (currentUser.following.length < originalLength) {
            friendRemoved = true;
            console.log('Removed from following array');
        }
    }
    
    // Updates the stats
    if (currentUser.stats) {
        if (currentUser.stats.friends && typeof currentUser.stats.friends === 'number') {
            currentUser.stats.friends = Math.max(0, currentUser.stats.friends - 1);
        }
        if (currentUser.stats.following && typeof currentUser.stats.following === 'number') {
            currentUser.stats.following = Math.max(0, currentUser.stats.following - 1);
        }
    }
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    console.log('After unfriend - Friends:', currentUser.friends);
    console.log('After unfriend - Following:', currentUser.following);
    console.log('Friend removed:', friendRemoved);
    
    if (!friendRemoved) {
        console.warn('Friend was not found in friends list - they may have already been removed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
}

function updateFriendListUI(removedUsername) {
    const friendsList = document.getElementById('friendsList');
    if (friendsList) {
        const friendCards = friendsList.querySelectorAll('.friend-card');
        friendCards.forEach(card => {
            const usernameElement = card.querySelector('[onclick*="showUserProfile"]');
            if (usernameElement && usernameElement.textContent.trim() === removedUsername) {
                card.remove();
                console.log('Removed friend card from UI:', removedUsername);
            }
        });
    }
    
    // Updates the friend count immediately
    const friendCount = calculateFriendCount();
    
    const profileStats = document.getElementById('profileStats');
    if (profileStats) {
        const friendStat = profileStats.querySelector('.stat:last-child .stat-number');
        if (friendStat) {
            friendStat.textContent = friendCount;
        }
    }
    
    // Updates the homepage stats if available
    const userStats = document.getElementById('userStats');
    if (userStats) {
        const friendStatElement = userStats.querySelector('div:last-child .stat-number, div:last-child > div:first-child');
        if (friendStatElement) {
            friendStatElement.textContent = friendCount;
        }
    }
}

// saveTop5FilmsAPI funciton
async function saveTop5FilmsAPI() {
    try {
        console.log('Saving top 5 films via API:', tempTop5Films);
        
        const filteredTop5 = tempTop5Films.filter(id => id !== null && id !== undefined);
        
        await userAPI.updateTop5Films(filteredTop5);
        
        userTop5Films = [...tempTop5Films];
        
        if (currentUser) {
            currentUser.top5Films = [...tempTop5Films];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        
        await loadUserProfile();
        
        loadProfileTop5();
        closeEditTop5Modal();
        
        // Show notifs
        const filledSlots = tempTop5Films.filter(film => film !== null).length;
        showTop5Notification('success', 
            `Your top ${filledSlots} film${filledSlots !== 1 ? 's' : ''} ${filledSlots !== 1 ? 'have' : 'has'} been saved to the database!`
        );
        
        console.log('Top 5 films saved successfully');
        
    } catch (error) {
        console.error('Save top 5 error:', error);
        
        userTop5Films = [...tempTop5Films];
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        
        if (currentUser) {
            currentUser.top5Films = [...tempTop5Films];
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        loadProfileTop5();
        closeEditTop5Modal();
        
        showTop5Notification('warning', 'Saved locally, but failed to sync with server. Changes may not persist.');
    }
}

// Add a friend functionality
function addFriend() {
    searchAndAddFriend();
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

// loadTrendingMovies function
async function loadTrendingMovies() {
    try {
        // Loads bg picture for signed out homepage
        loadRandomBackground();
        
        const endpoints = [
            '/trending/movie/week',
            '/trending/movie/day', 
            '/movie/popular',
            '/movie/top_rated',
            '/discover/movie?sort_by=popularity.desc&primary_release_year=2024',
            '/discover/movie?sort_by=popularity.desc&primary_release_year=2023',
            '/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000',
            '/discover/movie?with_genres=28&sort_by=popularity.desc', // Action
            '/discover/movie?with_genres=35&sort_by=popularity.desc', // Comedy
            '/discover/movie?with_genres=18&sort_by=popularity.desc', // Drama
        ];
        
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
        const randomPage = Math.floor(Math.random() * 3) + 1;
        const endpointWithPage = randomEndpoint.includes('?') 
            ? `${randomEndpoint}&page=${randomPage}`
            : `${randomEndpoint}?page=${randomPage}`;
        
        console.log('Loading trending movies from:', endpointWithPage);
        
        const data = await fetchFromTMDB(endpointWithPage);
        
        // Filters out movies with posters and shuffles it
        const moviesWithPosters = data.results.filter(movie => movie.poster_path);
        
        // Shuffles the array to get random movies from the page
        const shuffledMovies = moviesWithPosters.sort(() => Math.random() - 0.5);
        
        const movies = shuffledMovies.slice(0, 10).map(movie => ({
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
        applyDefaultHeroBackground(); // Apply fallback background
    }
}

// loadAllMovies functuin
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

// searchMovies function
async function searchMovies(query) {
    try {
        // Uses different search ways to get the better results
        const [movieResults, multiResults] = await Promise.all([
            fetchFromTMDB(`/search/movie?query=${encodeURIComponent(query)}`),
            fetchFromTMDB(`/search/multi?query=${encodeURIComponent(query)}`)
        ]);
        
        // Combining results and shows films only with posters
        const allMovies = [
            ...movieResults.results,
            ...multiResults.results.filter(item => item.media_type === 'movie')
        ];
        
        // Removes the duplicates and filter out films without posters
        const uniqueMoviesWithPosters = allMovies
            .filter((movie, index, self) => 
                movie.poster_path && // Must have poster
                movie.poster_path.trim() !== '' && // Poster path not empty
                self.findIndex(m => m.id === movie.id) === index // Remove duplicates
            );
        
        return uniqueMoviesWithPosters.slice(0, 12).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`,
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
    
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    if (!movies || movies.length === 0) {
        container.innerHTML = '<p>No movies found.</p>';
        return;
    }
    
    container.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="showMovieDetails(${movie.id})">
            <img src="${movie.poster}" 
                 alt="${movie.title}" 
                 class="movie-poster" 
                 onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD4KPHN2Zz4='"
                 loading="lazy">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${movie.year}</div>
                <div style="color: #ff6b6b; font-size: 0.9rem;">⭐ ${movie.rating ? movie.rating.toFixed(1) : 'N/A'}</div>
            </div>
        </div>
    `).join('');
}

//showMovieDetails function
async function showMovieDetails(movieId) {
    try {
        const movie = await fetchFromTMDB(`/movie/${movieId}`);
        const credits = await fetchFromTMDB(`/movie/${movieId}/credits`);
        
        const director = credits.crew.find(person => person.job === 'Director');
        const cast = credits.cast.slice(0, 5).map(actor => actor.name).join(', ');
        
        const isInWatchlist = watchlist.includes(movieId);
        const watchlistText = isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist';
        
        let reviewsHTML = '';
        if (currentUser) {
            try {
                const reviewData = await reviewAPI.getReviews({ movieId, limit: 10 });
                if (reviewData.reviews && reviewData.reviews.length > 0) {
                    reviewsHTML = `
                        <div style="margin-top: 2rem; border-top: 1px solid #444; padding-top: 1rem;">
                            <h3 style="margin-bottom: 1rem;">Reviews</h3>
                            <div style="max-height: 300px; overflow-y: auto;">
                                ${reviewData.reviews.map(review => `
                                    <div style="background: #333; padding: 1rem; margin-bottom: 1rem; border-radius: 5px;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                            <strong style="color: #ff6b6b;">${review.userId.username}</strong>
                                            <div style="color: #ffd700;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                                        </div>
                                        <p style="margin: 0; color: #ccc; font-size: 0.9rem;">${review.reviewText}</p>
                                        <small style="color: #888;">${new Date(review.createdAt).toLocaleDateString()}</small>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading reviews:', error);
            }
        }

        // This checks if the user already reviewed the film
        let userReview = null;
        let reviewFormHTML = '';
        
        if (currentUser) {
            try {
                const userReviewData = await reviewAPI.getReviews({ movieId, userId: currentUser.id, limit: 1 });
                if (userReviewData.reviews && userReviewData.reviews.length > 0) {
                    userReview = userReviewData.reviews[0];
                }
            } catch (error) {
                console.error('Error checking user review:', error);
            }

            if (userReview) {
                // When the user already reviewed a film it shows the edit review
                reviewFormHTML = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #333; border-radius: 5px;">
                        <h4 style="margin-bottom: 1rem; color: #ff6b6b;">Your Review</h4>
                        <div style="margin-bottom: 1rem;">
                            <strong>Rating:</strong> <span style="color: #ffd700;">${'★'.repeat(userReview.rating)}${'☆'.repeat(5-userReview.rating)}</span>
                        </div>
                        <p style="color: #ccc; margin-bottom: 1rem;">${userReview.reviewText}</p>
                        <button onclick="editReview(${movieId})" style="padding: 0.5rem 1rem; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">
                            Edit Review
                        </button>
                    </div>
                `;
            } else {
                // when the user didnt review yet it show the review form
                reviewFormHTML = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #333; border-radius: 5px;">
                        <h4 style="margin-bottom: 1rem; color: #ff6b6b;">Write a Review</h4>
                        <form id="reviewForm" onsubmit="submitReview(event, ${movieId}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : ''}', '${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}')">
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: #ccc;">Rating (1-5 stars):</label>
                                <div class="star-rating" style="font-size: 1.5rem; margin-bottom: 0.5rem;">
                                    ${[1,2,3,4,5].map(star => `
                                        <span class="star" data-rating="${star}" onclick="setRating(${star})" style="color: #666; cursor: pointer; margin-right: 0.2rem;">☆</span>
                                    `).join('')}
                                </div>
                                <input type="hidden" id="movieRating" required>
                            </div>
                            <div style="margin-bottom: 1rem;">
                                <label style="display: block; margin-bottom: 0.5rem; color: #ccc;">Review:</label>
                                <textarea id="reviewText" placeholder="What did you think of this movie?" required 
                                    style="width: 100%; min-height: 100px; padding: 0.5rem; background: #222; border: 1px solid #555; border-radius: 3px; color: white; resize: vertical;"></textarea>
                            </div>
                            <button type="submit" style="padding: 0.75rem 1.5rem; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                Submit Review
                            </button>
                        </form>
                    </div>
                `;
            }
        }
        
        const movieDetails = `
            <div style="max-width: 800px; margin: 20px auto; padding: 20px; background: #2a2a2a; border-radius: 10px; color: white; max-height: 90vh; overflow-y: auto;">
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
                    ${currentUser ? `
                        <button onclick="toggleWatchlist(${movieId}, '${movie.title.replace(/'/g, "\\'")}', this)" style="padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            ${watchlistText}
                        </button>
                    ` : ''}
                    <button onclick="closeMovieDetails()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Close
                    </button>
                </div>
                
                ${currentUser ? reviewFormHTML : '<p style="margin-top: 1rem; color: #888;">Sign in to write reviews.</p>'}
                ${reviewsHTML}
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

// this function allows user rating
let selectedRating = 0;

function setRating(rating) {
    selectedRating = rating;
    document.getElementById('movieRating').value = rating;
    
    // this is to update the star display
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffd700';
            star.textContent = '★';
        } else {
            star.style.color = '#666';
            star.textContent = '☆';
        }
    });
}

// submitReview function with aesthetic notifs
async function submitReview(event, movieId, movieTitle, moviePoster, movieYear) {
    event.preventDefault();
    
    if (!currentUser) {
        showReviewNotification('error', 'Please sign in to submit a review');
        return;
    }
    
    const rating = parseInt(document.getElementById('movieRating').value);
    const reviewText = document.getElementById('reviewText').value.trim();
    
    if (!rating || rating < 1 || rating > 5) {
        showReviewNotification('error', 'Please select a rating from 1 to 5 stars');
        return;
    }
    
    if (!reviewText) {
        showReviewNotification('error', 'Please write a review');
        return;
    }
    
    try {
        await reviewAPI.createReview({
            movieId,
            movieTitle,
            moviePoster,
            movieYear,
            rating,
            reviewText
        });
        
        // show the aesthetic success notifs with movie details
        showReviewNotification('success', 
            'Your review has been published and will appear in your activity feed!', 
            {
                title: movieTitle,
                year: movieYear,
                rating: rating,
                poster: moviePoster
            }
        );
        
        closeMovieDetails();
        
        // refreshing activity feed if user is on that page
        if (currentPage === 'activity') {
            loadActivityPage();
        }
        
        // refreshing home page if the user is there (to show updated activity)
        if (currentPage === 'home' && currentUser) {
            loadLoggedInHomePage();
        }
        
    } catch (error) {
        showReviewNotification('error', error.message || 'Failed to submit review. Please try again.');
    }
}

// this is to editing review function
function editReview(movieId) {
    closeMovieDetails();
    setTimeout(() => showMovieDetails(movieId), 100);
}

function closeMovieDetails() {
    const modal = document.getElementById('movieModal');
    if (modal) {
        modal.remove();
    }
}

// to loadLoggedInHomePage function
async function loadLoggedInHomePage() {
    document.getElementById('welcomeMessage').textContent = `Welcome back ${currentUser.username}!`;
    
    // for real user stats
    loadRealUserStats();
    
    // loading real friend activity
    try {
        if (typeof activityAPI !== 'undefined' && activityAPI.getActivityFeed) {
            const data = await activityAPI.getActivityFeed('friends', 1, 5);
            
            if (data.activities && data.activities.length > 0) {
                displayFriendsActivity(data.activities);
            } else {
                // if no friends activity
                displayNoFriendsMessage();
            }
        } else {
            // if API not available - show no friends message
            displayNoFriendsMessage();
        }
    } catch (error) {
        console.error('Error loading friends activity:', error);
        // if theres an error, it shows no friends message
        displayNoFriendsMessage();
    }
    
    // Loading real reviews with profile pictures
    await loadPopularReviews();
    
    // Loading recommendations
    loadRecommendations();
}

// a function to display "no friends" message
function displayNoFriendsMessage() {
    const friendsActivityContainer = document.getElementById('friendsActivity');
    
    if (!friendsActivityContainer) return;
    
    const friendCount = calculateFriendCount();
    
    if (friendCount === 0) {
        // if user has no friends:
        friendsActivityContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; background: #333; border-radius: 10px; color: #ccc;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👥</div>
                <h3 style="color: #ff6b6b; margin-bottom: 1rem;">No Friends Yet</h3>
                <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                    Add some friends to see their movie activity! <br>
                    Discover what your friends are watching, rating, and reviewing.
                </p>
                <button onclick="showPage('profile')" style="background: #ff6b6b; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Add Friends
                </button>
            </div>
        `;
    } else {
        // if user has friends but no activity yet
        friendsActivityContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #333; border-radius: 10px; color: #888;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">📽️</div>
                <p>Your friends haven't been active recently.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Check back later for their latest movie activity!</p>
            </div>
        `;
    }
}

// function to loadRealUserStats function for the home page
function loadRealUserStats() {
    const friendCount = calculateFriendCount();
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
                <div style="font-size: 2rem; font-weight: bold; color: #ff6b6b;">${friendCount}</div>
                <div style="color: #ccc; font-size: 0.9rem;">Friends</div>
            </div>
        </div>
    `;
}

// function to update friend counts after adding/removing friends
async function updateFriendCounts() {
    try {
        // Reloading user profile to get fresh data
        await loadUserProfile();
        
        // Updating the current page if it's profile or home
        if (currentPage === 'profile') {
            loadProfilePage();
        } else if (currentPage === 'home' && currentUser) {
            loadRealUserStats();
        }
    } catch (error) {
        console.error('Error updating friend counts:', error);
    }
}


// function to display real friends activity along with their pfp
function displayFriendsActivity(activities) {
    if (!activities || activities.length === 0) {
        document.getElementById('friendsActivity').innerHTML = '<p style="color: #888; text-align: center;">No recent activity from friends.</p>';
        return;
    }

    const activityHTML = activities.map(activity => {
        const user = activity.userId;
        const username = user.username;
        const profilePicture = user.profilePicture;
        const timeAgo = getTimeAgo(activity.createdAt);
        
        let actionText = '';
        let movieInfo = '';
        
        switch (activity.activityType) {
            case 'watched_movie':
                actionText = `watched`;
                movieInfo = activity.movieTitle;
                break;
            case 'rated_movie':
                actionText = `rated`;
                movieInfo = `${activity.movieTitle} ${activity.rating ? '★'.repeat(activity.rating) + '☆'.repeat(5-activity.rating) : ''}`;
                break;
            case 'reviewed_movie':
                actionText = `reviewed`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_to_watchlist':
                actionText = `added to watchlist`;
                movieInfo = activity.movieTitle;
                break;
            case 'added_friend':
                actionText = `became friends with ${activity.targetUserId ? activity.targetUserId.username : 'someone'}`;
                movieInfo = '';
                break;
            default:
                actionText = `updated their profile`;
                movieInfo = '';
        }

        // Create a profile picture HTML
        let profilePictureHTML;
        if (profilePicture) {
            profilePictureHTML = `<img src="${profilePicture}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            profilePictureHTML = `<span style="font-weight: bold; color: white;">${username.charAt(0).toUpperCase()}</span>`;
        }

        return `
            <div class="activity-item" style="display: flex; align-items: center; padding: 0.75rem; border-bottom: 1px solid #333;">
                <div onclick="showUserProfile('${username}')" style="width: 40px; height: 40px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; cursor: pointer; overflow: hidden;">
                    ${profilePictureHTML}
                </div>
                <div style="flex: 1;">
                    <div style="color: white;">
                        <strong style="color: #ff6b6b; cursor: pointer;" onclick="showUserProfile('${username}')">${username}</strong> ${actionText} ${movieInfo ? `<span style="color: #ccc;">${movieInfo}</span>` : ''}
                    </div>
                    <div style="color: #888; font-size: 0.8rem;">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('friendsActivity').innerHTML = activityHTML;
}

function displayPopularReviews(reviews) {
    const reviewsHTML = reviews.map(review => {
        const user = review.userId;
        const username = user.username;
        const profilePicture = user.profilePicture;

        // create profile picture HTML for reviewer
        let reviewerProfilePictureHTML;
        if (profilePicture) {
            reviewerProfilePictureHTML = `<img src="${profilePicture}" alt="${username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            reviewerProfilePictureHTML = `<span style="font-weight: bold; color: white; font-size: 0.8rem;">${username.charAt(0).toUpperCase()}</span>`;
        }

        return `
            <div class="review-card" style="background: #333; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; gap: 1rem;">
                    <img src="${review.moviePoster || 'https://via.placeholder.com/80x120/555/white?text=Movie'}" 
                         alt="${review.movieTitle}" 
                         style="width: 60px; height: 90px; object-fit: cover; border-radius: 4px;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <div>
                                <div style="font-weight: bold; color: white;">${review.movieTitle} ${review.movieYear || ''}</div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                                    <div onclick="showUserProfile('${username}')" style="width: 24px; height: 24px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden;">
                                        ${reviewerProfilePictureHTML}
                                    </div>
                                    <span style="color: #ff6b6b; font-size: 0.9rem; cursor: pointer;" onclick="showUserProfile('${username}')">by ${username}</span>
                                </div>
                            </div>
                            <div style="color: #ffd700; font-size: 1.1rem;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                        </div>
                        <div style="color: #ccc; font-size: 0.9rem; line-height: 1.4; margin-bottom: 0.5rem;">
                            ${review.reviewText.length > 150 ? review.reviewText.substring(0, 150) + '...' : review.reviewText}
                        </div>
                        <div style="color: #888; font-size: 0.8rem; display: flex; justify-content: space-between;">
                            <span>Watched on ${new Date(review.createdAt).toLocaleDateString()}</span>
                            <span onclick="toggleReviewLike('${review._id}')" style="cursor: pointer;">❤️ ${review.likes.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('popularReviews').innerHTML = reviewsHTML;
}

// toggleReviewLike function with the aesthetic notifs
async function toggleReviewLike(reviewId) {
    if (!currentUser) {
        showReviewNotification('error', 'Please sign in to like reviews');
        return;
    }
    
    try {
        const result = await reviewAPI.toggleReviewLike(reviewId);
        
        if (result.hasLiked) {
            showReviewNotification('liked', 'You liked this review! The author will be notified.');
        }
        
        // to refresh reviews
        loadPopularReviews();
    } catch (error) {
        console.error('Error toggling review like:', error);
        showReviewNotification('error', 'Failed to like review. Please try again.');
    }
}

// a function to show watchlist notifs
function showWatchlistNotification(type, movieTitle, moviePoster = '') {
    let message, notificationType;
    
    if (type === 'added') {
        message = 'Added to your watchlist! Find it in your Watchlist page.';
        notificationType = 'success';
    } else {
        message = 'Removed from your watchlist.';
        notificationType = 'updated';
    }
    
    showReviewNotification(notificationType, message, {
        title: movieTitle,
        poster: moviePoster
    });
}

async function loadPopularReviews() {
    try {
        const reviewData = await reviewAPI.getReviews({ limit: 5 });
        
        if (reviewData.reviews && reviewData.reviews.length > 0) {
            displayPopularReviews(reviewData.reviews);
        } else {
            document.getElementById('popularReviews').innerHTML = '<p style="color: #888; text-align: center;">No reviews yet. Be the first to review a movie!</p>';
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('popularReviews').innerHTML = '<p style="color: #888; text-align: center;">Error loading reviews.</p>';
    }
}

// getTimeAgo helper function
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


// load the EditProfilePage function
async function loadEditProfilePage() {
  if (!currentUser) {
    showPage("auth");
    return;
  }

  try {
    // loads fresh profile data from the server
    await loadUserProfile();

    // populates the form with current user data
    document.getElementById("editUsername").value = currentUser.username || "";
    document.getElementById("editEmail").value = currentUser.email || "";
    document.getElementById("editBio").value = currentUser.bio || "";
    document.getElementById("editLocation").value = currentUser.location || "";

    // handling pronouns
    if (currentUser.pronouns) {
      const pronounsSelect = document.getElementById("editPronouns");
      const customPronounsInput = document.getElementById("editCustomPronouns");

      // to Check if the pronouns match predefined options
      const predefinedOptions = [
        "he/him",
        "she/her",
        "they/them",
        "he/they",
        "she/they",
      ];
      if (predefinedOptions.includes(currentUser.pronouns)) {
        pronounsSelect.value = currentUser.pronouns;
        customPronounsInput.style.display = "none";
      } else {
        pronounsSelect.value = "custom";
        customPronounsInput.value = currentUser.pronouns;
        customPronounsInput.style.display = "block";
      }
    }

    // display profile picture or initial
    updateProfilePicturePreview();
  } catch (error) {
    console.error("Error loading edit profile page:", error);
    // use cached data as fallback
    document.getElementById("editUsername").value = currentUser.username || "";
    document.getElementById("editEmail").value = currentUser.email || "";
  }
}

// profile picture preview function
function updateProfilePicturePreview() {
    const img = document.getElementById('profilePictureImg');
    const initial = document.getElementById('profileInitial');
    
    if (currentUser.profilePicture) {
        img.src = currentUser.profilePicture;
        img.style.display = 'block';
        initial.style.display = 'none';
    } else {
        img.style.display = 'none';
        initial.style.display = 'block';
        initial.textContent = currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?';
    }
}



// handling profile picture upload
let selectedProfilePicture = null;

function handleProfilePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // checks the file size with notifs
    if (file.size > 2 * 1024 * 1024) {
        showReviewNotification('error', 'Profile picture must be less than 2MB. Please choose a smaller image for better performance.', {
            title: 'Image Too Large'
        });
        event.target.value = ''; 
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showReviewNotification('error', 'Please select a valid image file (JPG, PNG, GIF, etc.)', {
            title: 'Invalid File Type'
        });
        event.target.value = ''; 
        return;
    }
    
    // shows processing notifs
    showReviewNotification('info', 'Processing your profile picture...', {
        title: 'Uploading Image'
    });
    
    // compress and preview the image
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const maxSize = 400;
            let { width, height } = img;
            let wasResized = false;
            
            if (width > maxSize || height > maxSize) {
                wasResized = true;
                if (width > height) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // convert the image to a lower size for it able to upload
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            // update the preview
            const imgElement = document.getElementById('profilePictureImg');
            const initial = document.getElementById('profileInitial');
            
            imgElement.src = compressedDataUrl;
            imgElement.style.display = 'block';
            initial.style.display = 'none';
            
            selectedProfilePicture = compressedDataUrl;
            
            // showsthe success notifs with helpful info
            if (wasResized) {
                showReviewNotification('warning', `Image automatically resized to ${Math.round(width)}x${Math.round(height)}px for optimal performance. Don't forget to save your changes!`, {
                    title: 'Image Optimized'
                });
            } else {
                showReviewNotification('success', 'Profile picture uploaded successfully! Don\'t forget to save your changes.', {
                    title: 'Image Ready'
                });
            }
            
            console.log('Image processed successfully');
        };
        
        img.onerror = function() {
            showReviewNotification('error', 'Failed to process the image. Please try a different image file.', {
                title: 'Processing Failed'
            });
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function() {
        showReviewNotification('error', 'Failed to read the image file. Please try again.', {
            title: 'Upload Failed'
        });
    };
    
    reader.readAsDataURL(file);
}

// handling the edit profile form submission
async function handleEditProfileSubmit(event) {
    event.preventDefault();
    
    // this gets form values
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    
    // and this gets pronouns
    const pronounsSelect = document.getElementById('editPronouns');
    const customPronounsInput = document.getElementById('editCustomPronouns');
    let pronouns = pronounsSelect.value;
    if (pronouns === 'custom') {
        pronouns = customPronounsInput.value.trim();
    }
    
    // getting password fields
    const currentPassword = document.getElementById('editCurrentPassword').value;
    const newPassword = document.getElementById('editNewPassword').value;
    const confirmPassword = document.getElementById('editConfirmPassword').value;
    
    // validate the passwords if changing
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            showReviewNotification('warning', 'Please enter your current password to change it.', {
                title: 'Current Password Required'
            });
            return;
        }
        if (newPassword !== confirmPassword) {
            showReviewNotification('error', 'New passwords do not match. Please check and try again.', {
                title: 'Password Mismatch'
            });
            return;
        }
        if (newPassword.length < 6) {
            showReviewNotification('warning', 'New password must be at least 6 characters long for security.', {
                title: 'Password Too Short'
            });
            return;
        }
    }
    
    try {
        // shows processing notifs
        showReviewNotification('info', 'Updating your profile...', {
            title: 'Saving Changes'
        });
        
        // prepare update data
        const updateData = {
            username,
            email,
            bio,
            location,
            pronouns,
            profilePicture: selectedProfilePicture || currentUser.profilePicture
        };
        
        // add password change if provided
        if (currentPassword && newPassword) {
            updateData.currentPassword = currentPassword;
            updateData.newPassword = newPassword;
        }
        
        // update profile via API
        const result = await userAPI.updateProfile(updateData);
        
        // updates the local user data
        currentUser = { ...currentUser, ...result.user };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // resets password fields
        document.getElementById('editCurrentPassword').value = '';
        document.getElementById('editNewPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';
        
        // shows the success notifs
        showReviewNotification('success', 'Your profile has been updated successfully! All changes are now live and visible to other users.', {
            title: 'Profile Updated'
        });
        
        // navigates back to profile page with delay to show notifs
        setTimeout(() => {
            showPage('profile');
        }, 2000);
        
    } catch (error) {
        console.error('Profile update error:', error);
        
        if (error.message.includes('Payload Too Large') || error.message.includes('413')) {
            showReviewNotification('error', 'Your profile picture is too large. Please choose a smaller image (under 2MB) and try again.', {
                title: 'Image Too Large'
            });
        } else if (error.message.includes('Unexpected token')) {
            showReviewNotification('error', 'There was a server error. The image might be too large or there was a network issue. Please try again with a smaller image.', {
                title: 'Server Error'
            });
        } else if (error.message.includes('Username already taken')) {
            showReviewNotification('error', 'That username is already taken by another user. Please choose a different username.', {
                title: 'Username Unavailable'
            });
        } else if (error.message.includes('Email already registered')) {
            showReviewNotification('error', 'That email is already registered with another account. Please use a different email address.', {
                title: 'Email Already Exists'
            });
        } else if (error.message.includes('Current password is incorrect')) {
            showReviewNotification('error', 'Your current password is incorrect. Please check your password and try again.', {
                title: 'Invalid Password'
            });
        } else if (error.message.includes('Access token required')) {
            showReviewNotification('error', 'Your session has expired. Please refresh the page and try again.', {
                title: 'Session Expired'
            });
        } else {
            showReviewNotification('error', `Profile update failed: ${error.message}. Please try again.`, {
                title: 'Update Failed'
            });
        }
    }
}

// cancels edit profile
function cancelEditProfile() {
    // Show friendly notifs
    showReviewNotification('info', 'Profile changes have been discarded.', {
        title: 'Changes Cancelled'
    });
    
    // Resets form and navigate back
    selectedProfilePicture = null;
    setTimeout(() => {
        showPage('profile');
    }, 1000);
}

// public profile to show unfriend option for friends
async function loadPublicProfilePage() {
    if (!currentPublicUser) return;

    // displays profile picture
    const profileAvatar = document.getElementById("publicProfileAvatar");
    if (currentPublicUser.profilePicture) {
        profileAvatar.innerHTML = `<img src="${currentPublicUser.profilePicture}" alt="${currentPublicUser.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
        profileAvatar.textContent = currentPublicUser.username.charAt(0).toUpperCase();
    }

    // update profile info
    document.getElementById("publicProfileUsername").textContent = currentPublicUser.username;

    // displays pronouns
    const pronounsElement = document.getElementById("publicProfilePronouns");
    if (currentPublicUser.pronouns) {
        pronounsElement.textContent = currentPublicUser.pronouns;
        pronounsElement.style.display = "block";
    } else {
        pronounsElement.style.display = "none";
    }

    // displays the bio
    const bioElement = document.getElementById("publicProfileBio");
    if (currentPublicUser.bio) {
        bioElement.textContent = currentPublicUser.bio;
        bioElement.style.display = "block";
    } else {
        bioElement.style.display = "none";
    }

    // displaying the location
    const locationElement = document.getElementById("publicProfileLocation");
    if (currentPublicUser.location) {
        locationElement.textContent = `📍 ${currentPublicUser.location}`;
        locationElement.style.display = "block";
    } else {
        locationElement.style.display = "none";
    }

    document.getElementById("publicProfileJoinDate").textContent = `Joined ${new Date(currentPublicUser.joinDate).toLocaleDateString()}`;

    const followBtn = document.getElementById("followUserBtn");

    if (currentPublicUser.isFriend) {
        // if users are already friends - it shows unfriend option
        followBtn.innerHTML = `
            <span style="margin-right: 0.5rem;">Friends ✓</span>
            <button onclick="confirmUnfriend('${currentPublicUser.username}', '${currentPublicUser._id || currentPublicUser.id || ''}')" 
                    style="background: #ff4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin-left: 0.5rem;"
                    title="Unfriend ${currentPublicUser.username}">
                Unfriend
            </button>
        `;
        followBtn.style.background = "#4CAF50";
        followBtn.style.cursor = "default";
        followBtn.onclick = null; // disable the main button click
    } else if (currentPublicUser.isFollowing) {
        // following but not friends yet
        followBtn.textContent = "Pending...";
        followBtn.style.background = "#orange";
        followBtn.style.cursor = "default";
        followBtn.onclick = null;
    } else {
        // if Not friends - they can send friend request
        followBtn.textContent = "Add Friend";
        followBtn.style.background = "#ff6b6b";
        followBtn.style.cursor = "pointer";
        followBtn.onclick = () => toggleFollowUser();
    }

    // update stats
    const stats = currentPublicUser.stats;
    document.getElementById("publicProfileStats").innerHTML = `
        <div class="stat">
            <div class="stat-number">${stats.moviesWatched || 0}</div>
            <div class="stat-label">FILMS</div>
        </div>
        <div class="stat">
            <div class="stat-number">${stats.moviesThisYear || 0}</div>
            <div class="stat-label">THIS YEAR</div>
        </div>
        <div class="stat">
            <div class="stat-number">${stats.following || stats.friends || 0}</div>
            <div class="stat-label">FRIENDS</div>
        </div>
    `;

    // loading Top 5 Films
    await loadPublicUserTop5();

    // loads Recent Reviews
    loadPublicUserReviews();

    // loads Watchlist Preview which is the first 4 movies
    await loadPublicUserWatchlist();
}

// helper functions for user feedback
function showLoadingMessage(message) {
    // Remove existing message
    hideLoadingMessage();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingMessage';
    loadingDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 1rem;
        border-radius: 5px;
        z-index: 4000;
        border-left: 4px solid #ff6b6b;
    `;
    loadingDiv.textContent = message;
    
    document.body.appendChild(loadingDiv);
}

function hideLoadingMessage() {
    const existing = document.getElementById('loadingMessage');
    if (existing) existing.remove();
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem;
        border-radius: 5px;
        z-index: 4000;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // it auto removes after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 1rem;
        border-radius: 5px;
        z-index: 4000;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // auto removes after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// add keyboard support for unfriend modal
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('unfriendModal');
    if (modal && e.key === 'Escape') {
        closeUnfriendModal();
    }
});

// calculateFriendCount function to be more robust
function calculateFriendCount() {
    if (!currentUser) return 0;
    
    let count = 0;
    
    console.log('Calculating friend count for user:', currentUser.username);
    console.log('Available data:', {
        friends: currentUser.friends,
        following: currentUser.following,
        stats: currentUser.stats
    });
    
    // checks the friends array first
    if (currentUser.friends && Array.isArray(currentUser.friends)) {
        count = currentUser.friends.length;
        console.log('Using friends array, count:', count);
    }
    // Checks the following array
    else if (currentUser.following && Array.isArray(currentUser.following)) {
        count = currentUser.following.length;
        console.log('Using following array as fallback, count:', count);
    }
    // Checks the stats as last resort
    else if (currentUser.stats) {
        count = currentUser.stats.friends || currentUser.stats.following || 0;
        console.log('Using stats as last resort, count:', count);
    }
    
    console.log('Final calculated friend count:', count);
    return count;
}

async function loadRecommendations() {
    try {
        // array of different movie discovery endpoints for variety
        const endpoints = [
            '/discover/movie?with_genres=28,35&sort_by=popularity.desc',
            '/discover/movie?with_genres=18,10749&sort_by=vote_average.desc&vote_count.gte=100',
            '/discover/movie?with_genres=878,27&sort_by=popularity.desc',
            '/discover/movie?with_genres=16,12&sort_by=popularity.desc',
            '/discover/movie?sort_by=popularity.desc&primary_release_year=2024',
            '/discover/movie?sort_by=popularity.desc&primary_release_year=2023',
            '/movie/top_rated',
            '/movie/popular',
        ];
        
        // pick a random endpoint
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        // pick a random page (1-5 to avoid too obscure movies)
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const endpointWithPage = randomEndpoint.includes('?') 
            ? `${randomEndpoint}&page=${randomPage}`
            : `${randomEndpoint}?page=${randomPage}`;
        
        console.log('Loading recommendations from:', endpointWithPage);
        
        const data = await fetchFromTMDB(endpointWithPage);
        
        // filtering movies with posters and shuffle the results
        const moviesWithPosters = data.results.filter(movie => movie.poster_path);
        
        // shuffles the array to get random movies from the page
        const shuffledMovies = moviesWithPosters.sort(() => Math.random() - 0.5);
        
        const movies = shuffledMovies.slice(0, 8).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450/333/white?text=No+Image',
            rating: movie.vote_average
        }));
        
        displayMovies(movies, 'recommendations');
    } catch (error) {
        console.error('Error loading recommendations:', error);
        document.getElementById('recommendations').innerHTML = '<p>Error loading recommendations.</p>';
    }
}

// watchlist Functions
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

async function loadProfilePage() {
    if (!currentUser) {
        showPage('auth');
        return;
    }

    try {
        // loads fresh profile data from server
        await loadUserProfile();
        
        // displays profile picture in avatar
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            if (currentUser.profilePicture) {
                profileAvatar.innerHTML = `<img src="${currentUser.profilePicture}" alt="${currentUser.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                profileAvatar.textContent = currentUser.username ? currentUser.username.charAt(0).toUpperCase() : '?';
            }
        }

        document.getElementById('profileUsername').textContent = currentUser.username;
        
        // displays the pronouns if available
        const pronounsElement = document.getElementById('profilePronouns');
        if (pronounsElement) {
            if (currentUser.pronouns) {
                pronounsElement.textContent = currentUser.pronouns;
                pronounsElement.style.display = 'block';
            } else {
                pronounsElement.style.display = 'none';
            }
        }
        
        // displays the bio if available
        const bioElement = document.getElementById('profileBio');
        if (bioElement) {
            if (currentUser.bio) {
                bioElement.textContent = currentUser.bio;
                bioElement.style.display = 'block';
            } else {
                bioElement.style.display = 'none';
            }
        }
        
        // displays the location if available
        const locationElement = document.getElementById('profileLocation');
        if (locationElement) {
            if (currentUser.location) {
                locationElement.textContent = `📍 ${currentUser.location}`;
                locationElement.style.display = 'block';
            } else {
                locationElement.style.display = 'none';
            }
        }
        
        document.getElementById('profileJoinDate').textContent = `Joined ${new Date(currentUser.joinDate).toLocaleDateString()}`;
        
        // Update profile stats with correct 3-stat layout which are FILMS, THIS YEAR, FRIENDS
        const friendCount = calculateFriendCount();
        document.getElementById('profileStats').innerHTML = `
            <div class="stat"><div class="stat-number">${currentUser.stats?.moviesWatched || 0}</div><div class="stat-label">FILMS</div></div>
            <div class="stat"><div class="stat-number">${currentUser.stats?.moviesThisYear || 0}</div><div class="stat-label">THIS YEAR</div></div>
            <div class="stat"><div class="stat-number">${friendCount}</div><div class="stat-label">FRIENDS</div></div>
        `;
        
        // loads other profile sections
        loadProfileTop5();
        await displayFriendRequests();
        displayFriendsList();
        
        // loads the watchlist preview
        if (currentUser.watchlist && currentUser.watchlist.length > 0) {
            try {
                const moviePromises = currentUser.watchlist.slice(0, 4).map(movieId => fetchFromTMDB(`/movie/${movieId}`));
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
        } else {
            document.getElementById('profileWatchlist').innerHTML = '<p>Your watchlist is empty.</p>';
        }
        
    } catch (error) {
        console.error('Error loading profile page:', error);
        // fallsback to cached data if server fails
        document.getElementById('profileUsername').textContent = currentUser.username;
        
        // this still calculates friend count from cached data
        const friendCount = calculateFriendCount();
        
        document.getElementById('profileStats').innerHTML = `
            <div class="stat"><div class="stat-number">${currentUser.stats?.moviesWatched || 0}</div><div class="stat-label">FILMS</div></div>
            <div class="stat"><div class="stat-number">${currentUser.stats?.moviesThisYear || 0}</div><div class="stat-label">THIS YEAR</div></div>
            <div class="stat"><div class="stat-number">${friendCount}</div><div class="stat-label">FRIENDS</div></div>
        `;
    }
}

async function loadProfileTop5() {
    const container = document.getElementById('profileTop5');
    
    if (!userTop5Films || userTop5Films.length === 0) {
        // shows the empty slots
        container.innerHTML = Array.from({length: 5}, (_, i) => `
            <div class="top-5-slot" onclick="editTop5Films()">
                <div class="top-5-rank">${i + 1}</div>
                <span>Click to add<br>your #${i + 1} film</span>
            </div>
        `).join('');
        return;
    }

    try {
        // loads the movie details for top 5 films
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

// the function to show helpful tips when opening Top 5 modal
function editTop5Films() {
    tempTop5Films = [...userTop5Films];
    document.getElementById('editTop5Modal').style.display = 'flex';
    loadEditableTop5();
    
    // sets up search
    const searchInput = document.getElementById('top5SearchInput');
    searchInput.addEventListener('input', debounce(searchForTop5Movies, 300));
    
    // shows some helpful tip notifs
    setTimeout(() => {
        showTop5Notification('info', 
            'Click on a #1-5 position first, then search for movies to add. Don\'t forget to save when you\'re done!'
        );
    }, 500);
}

function removeFromTop5(index, event) {
    event.stopPropagation();
    if (confirm('Remove this movie from your top 5?')) {
        userTop5Films[index] = null;
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        loadProfileTop5();
    }
}

// enhanced the error handling for when movies can't be loaded
function handleTop5LoadError() {
    showTop5Notification('error', 
        'Unable to load some movies in your top 5. They may have been removed from the database.'
    );
}

function closeEditTop5Modal() {
    document.getElementById('editTop5Modal').style.display = 'none';
    document.getElementById('top5SearchInput').value = '';
    document.getElementById('top5SearchResults').innerHTML = '';
}

async function loadEditableTop5() {
    const container = document.getElementById('editableTop5');
    
    if (!tempTop5Films || tempTop5Films.length === 0) {
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

// selectTop5Slot function with helpful notifs
function selectTop5Slot(index) {
    selectedTop5Slot = index;
    
    // highlighting the selected slot
    document.querySelectorAll('.editable-top5-slot').forEach((slot, i) => {
        slot.style.border = i === index ? '2px solid #00ff00' : (tempTop5Films[i] ? '2px solid #ff6b6b' : '2px dashed #555');
    });
    
    // shows helpful info notification
    showTop5Notification('info', 
        `Position #${index + 1} selected! Now search for a movie to add to this spot.`, 
        {
            position: index + 1
        }
    );
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
        
        // filters again to make sure we only show movies with posters
        const moviesWithPosters = results.filter(movie => movie.poster && movie.poster.includes('image.tmdb.org'));
        
        resultsContainer.innerHTML = moviesWithPosters.slice(0, 12).map(movie => `
            <div class="search-result-item" onclick="addToTop5(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
                <img src="${movie.poster}" alt="${movie.title}" class="search-result-poster">
                <div class="search-result-title">${movie.title} (${movie.year})</div>
            </div>
        `).join('');
        
        // shows message if no movies with posters found
        if (moviesWithPosters.length === 0) {
            resultsContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No movies with images found for this search.</p>';
        }
    } catch (error) {
        console.error('Error searching movies for top 5:', error);
        resultsContainer.innerHTML = '<p>Error searching movies.</p>';
    }
}

// addToTop5 function with aesthetic notifications
function addToTop5(movieId, movieTitle) {
    if (selectedTop5Slot === null) {
        showTop5Notification('warning', 'Click on one of the #1-5 positions first, then search and select a movie to add to that spot.');
        return;
    }

    // checking if the movie is already in top 5
    if (tempTop5Films.includes(movieId)) {
        showTop5Notification('warning', 'This movie is already in your top 5! Choose a different film or remove it first.');
        return;
    }

    // add to selected slot
    tempTop5Films[selectedTop5Slot] = movieId;
    loadEditableTop5();
    
    // Clears search
    document.getElementById('top5SearchInput').value = '';
    document.getElementById('top5SearchResults').innerHTML = '';
    
    // shows aesthetic success notification
    showTop5Notification('added', 
        `Added to position #${selectedTop5Slot + 1}. Don't forget to save your changes!`, 
        {
            title: movieTitle,
            position: selectedTop5Slot + 1
        }
    );
    
    selectedTop5Slot = null;
}

// removeFromTempTop5 function with notifications
function removeFromTempTop5(index, event) {
    event.stopPropagation();
    
    // gets the movie title before removing
    const movieTitle = 'Movie';
    
    tempTop5Films[index] = null;
    loadEditableTop5();
    
    showTop5Notification('removed', 
        `Removed from position #${index + 1}. Remember to save your changes.`, 
        {
            position: index + 1
        }
    );
}

// saveTop5Films function with aesthetic notifications
function saveTop5Films() {
    // checks if user has any films selected
    const hasFilms = tempTop5Films.some(film => film !== null && film !== undefined);
    
    if (!hasFilms) {
        showTop5Notification('warning', 'Add at least one movie to your top 5 before saving!');
        return;
    }
    
    if (typeof saveTop5FilmsAPI === 'function') {
        saveTop5FilmsAPI();
    } else {
        // fallsback for local storage
        userTop5Films = [...tempTop5Films];
        localStorage.setItem('userTop5Films', JSON.stringify(userTop5Films));
        loadProfileTop5();
        closeEditTop5Modal();
        
        // shows aesthetic success notification
        const filledSlots = tempTop5Films.filter(film => film !== null).length;
        showTop5Notification('success', 
            `Your top ${filledSlots} film${filledSlots !== 1 ? 's' : ''} ${filledSlots !== 1 ? 'have' : 'has'} been saved! They'll appear on your profile for everyone to see.`
        );
    }
}

// the utility function for debouncing search
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

// activity Feed Functions
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

// performGlobalSearch function to seach on any page
async function performGlobalSearch(query) {
    console.log('Performing global search for:', query);
    
    // checks if it's a user search which starts with @
    if (query.startsWith('@')) {
        try {
            const username = query.substring(1);
            if (username) {
                console.log('Searching for user:', username);
                // tries to show user profile directly
                await showUserProfile(username);
                return;
            }
        } catch (error) {
            console.error('User search failed:', error);
            alert('User not found');
            return;
        }
    }
    
    // Movie search to always go to films page
    console.log('Performing movie search, current page:', currentPage);
    
    if (currentPage !== 'films') {
        console.log('Switching to films page...');
        showPage('films');
        
        // Waits for page to load, then search
        setTimeout(() => {
            executeMovieSearch(query);
        }, 500); // increased timeout to ensure page loads
    } else {
        console.log('Already on films page, searching...');
        executeMovieSearch(query);
    }
}

async function executeMovieSearch(query) {
    console.log('Executing movie search for:', query);
    
    const container = document.getElementById('allMovies');
    const titleElement = document.getElementById('filmsPageTitle');
    
    if (!container || !titleElement) {
        setTimeout(() => executeMovieSearch(query), 200);
        return;
    }
    
    // updates the search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value !== query) {
        searchInput.value = query;
    }
    
    // shows the loading state
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ccc;">
            <div style="font-size: 1.2rem; margin-bottom: 1rem;">Searching for movies with images...</div>
            <div style="border: 3px solid #f3f3f3; border-top: 3px solid #ff6b6b; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
    `;
    
    titleElement.textContent = `Search Results for "${query}"`;
    
    try {
        const searchResults = await searchMovies(query);
        
        if (searchResults && searchResults.length > 0) {
            displayMovies(searchResults, 'allMovies');
            addClearSearchButton();
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #888;">
                    <p>No movies with images found for "${query}"</p>
                    <p>Try a different search term or check your spelling.</p>
                </div>
            `;
            addClearSearchButton();
        }
    } catch (error) {
        console.error('Search error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #ff6b6b;">
                <p>Error searching for movies.</p>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

// simplifies the clear search button
function addClearSearchButton() {
    const container = document.getElementById('allMovies');
    const titleElement = document.getElementById('filmsPageTitle');
    
    // Removes existing button
    const existingBtn = document.getElementById('clearSearch');
    if (existingBtn) existingBtn.remove();
    
    // creates new button
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearSearch';
    clearBtn.textContent = 'Clear Search';
    clearBtn.style.cssText = 'margin: 20px auto; display: block; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;';
    
    clearBtn.onclick = () => {
        document.getElementById('searchInput').value = '';
        titleElement.textContent = 'Browse Movies';
        loadAllMovies();
        clearBtn.remove();
    };
    
    // Insert after the container
    container.parentNode.insertBefore(clearBtn, container.nextSibling);
}

//edit comment
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up app...');
    
    // Prevent multiple initializations
    if (window.movielizedAppInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    window.movielizedAppInitialized = true;
    
    // Initialize watchlist and userTop5Films from localStorage
    watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
    userTop5Films = JSON.parse(localStorage.getItem('userTop5Films')) || [];
    
    console.log('Script.js initialized with data:', {
        watchlist: watchlist.length,
        userTop5Films: userTop5Films.length
    });
    
    // Set up main event listeners (forms, search, etc.)
    setupEventListeners();
    
    // Set up profile-specific event listeners (pronouns, profile picture, etc.)
    setupProfileEventListeners();
    
    // Initialize other components
    checkAuthStatus();
    loadTrendingMovies();
});

function setupProfileEventListeners() {
    // Handle pronouns select changes
    const pronounsSelect = document.getElementById('editPronouns');
    const customPronounsInput = document.getElementById('editCustomPronouns');
    
    if (pronounsSelect && !pronounsSelect.dataset.listenerAdded) {
        pronounsSelect.dataset.listenerAdded = 'true';
        pronounsSelect.addEventListener('change', function() {
            const customInput = document.getElementById('editCustomPronouns');
            if (this.value === 'custom') {
                customInput.style.display = 'block';
                customInput.required = true;
            } else {
                customInput.style.display = 'none';
                customInput.required = false;
            }
        });
    }
    
    // Handle profile picture upload
    const profilePictureInput = document.getElementById('profilePictureInput');
    if (profilePictureInput && !profilePictureInput.dataset.listenerAdded) {
        profilePictureInput.dataset.listenerAdded = 'true';
        profilePictureInput.addEventListener('change', handleProfilePictureUpload);
    }
    
    // Handle edit profile form submission
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm && !editProfileForm.dataset.listenerAdded) {
        editProfileForm.dataset.listenerAdded = 'true';
        editProfileForm.addEventListener('submit', handleEditProfileSubmit);
    }
}


// added CSS for the loading animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// the addClearSearchButton function
function addClearSearchButton() {
    const container = document.getElementById('allMovies');
    const titleElement = document.getElementById('filmsPageTitle');
    
    if (!container || !titleElement) return;
    
    // removes existing button
    const existingBtn = document.getElementById('clearSearchBtn');
    if (existingBtn) existingBtn.remove();
    
    // Creates new button
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clearSearchBtn';
    clearBtn.textContent = 'Clear Search';
    clearBtn.style.cssText = `
        margin: 20px auto; 
        display: block; 
        padding: 10px 20px; 
        background: #ff6b6b; 
        color: white; 
        border: none; 
        border-radius: 5px; 
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s;
    `;
    
    clearBtn.onmouseover = () => clearBtn.style.backgroundColor = '#ff5252';
    clearBtn.onmouseout = () => clearBtn.style.backgroundColor = '#ff6b6b';
    
    clearBtn.onclick = () => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        titleElement.textContent = 'Browse Movies';
        loadAllMovies();
        clearBtn.remove();
    };
    
    // Inserts button before the container
    container.parentNode.insertBefore(clearBtn, container);
}

// shows the add friend modal
function showAddFriendModal() {
    // removes existing modal if theres any
    const existingModal = document.getElementById('addFriendModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'addFriendModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: #2a2a2a; border-radius: 10px; width: 90%; max-width: 500px; max-height: 80vh; overflow: hidden;">
            <!-- Header -->
            <div style="padding: 1.5rem; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; color: #ff6b6b;">Add Friend</h2>
                <button onclick="closeAddFriendModal()" style="background: none; border: none; color: #ccc; font-size: 1.5rem; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            
            <!-- Search Section -->
            <div style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem;">
                    <input type="text" id="friendSearchInput" placeholder="Search by username..." 
                           style="width: 100%; padding: 0.75rem; background: #333; border: 1px solid #555; border-radius: 5px; color: white; font-size: 1rem;"
                           onkeyup="handleFriendSearch(event)">
                </div>
                
                <!-- Search Results -->
                <div id="friendSearchResults" style="max-height: 300px; overflow-y: auto;">
                    <div style="text-align: center; color: #888; padding: 2rem;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                        <p>Start typing to search for friends...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // closes modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) closeAddFriendModal();
    };
    
    document.body.appendChild(modal);
    
    // focuses on search input
    setTimeout(() => {
        document.getElementById('friendSearchInput').focus();
    }, 100);
}

// closes the add friend modal
function closeAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (modal) {
        modal.remove();
    }
}

// Handles friend search with debouncing
let searchTimeout;
async function handleFriendSearch(event) {
    const query = event.target.value.trim();
    const resultsContainer = document.getElementById('friendSearchResults');
    
    // Clearing previous timeout
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 2rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                <p>Start typing to search for friends...</p>
            </div>
        `;
        return;
    }
    
    // shows loading
    resultsContainer.innerHTML = `
        <div style="text-align: center; color: #888; padding: 2rem;">
            <div style="border: 3px solid #333; border-top: 3px solid #ff6b6b; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
            <p>Searching for "${query}"...</p>
        </div>
    `;
    
    // debouncing the search
    searchTimeout = setTimeout(async () => {
        try {
            const users = await userAPI.searchUsers(query);
            displayFriendSearchResults(users.users || [], query);
        } catch (error) {
            console.error('Friend search error:', error);
            resultsContainer.innerHTML = `
                <div style="text-align: center; color: #ff6b6b; padding: 2rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">❌</div>
                    <p>Error searching for users. Please try again.</p>
                </div>
            `;
        }
    }, 500); // the delay
}

// displays friend search results
function displayFriendSearchResults(users, query) {
    const resultsContainer = document.getElementById('friendSearchResults');
    
    if (!users || users.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; color: #888; padding: 2rem;">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">😔</div>
                <p>No users found for "${query}"</p>
                <p style="font-size: 0.9rem; color: #666;">Try a different username</p>
            </div>
        `;
        return;
    }
    
    const resultsHTML = users.map(user => `
        <div class="friend-search-result" style="display: flex; align-items: center; padding: 1rem; background: #333; margin-bottom: 0.5rem; border-radius: 8px; cursor: pointer; transition: background 0.2s;" 
             onmouseover="this.style.background='#3a3a3a'" 
             onmouseout="this.style.background='#333'">
            <div style="width: 50px; height: 50px; background: #ff6b6b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 1rem; font-weight: bold; color: white; font-size: 1.2rem;">
                ${user.username.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
                <div style="font-weight: bold; color: white; margin-bottom: 0.25rem;">${user.username}</div>
                <div style="color: #888; font-size: 0.9rem;">${user.email}</div>
            </div>
            <button onclick="sendFriendRequestToUser('${user.username}')" 
                    style="background: #ff6b6b; color: white; border: none; padding: 0.5rem 1rem; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background 0.2s;"
                    onmouseover="this.style.background='#ff5252'"
                    onmouseout="this.style.background='#ff6b6b'">
                Add Friend
            </button>
        </div>
    `).join('');
    
    resultsContainer.innerHTML = resultsHTML;
}

// sendFriendRequestToUser function with aesthetic notifs
async function sendFriendRequestToUser(username) {
    try {
        // shows the loading state on the button
        const buttons = document.querySelectorAll(`button[onclick="sendFriendRequestToUser('${username}')"]`);
        buttons.forEach(btn => {
            btn.textContent = 'Sending...';
            btn.disabled = true;
            btn.style.background = '#666';
        });
        
        await friendsAPI.sendFriendRequest(username);
        
        // Show success notif on button
        buttons.forEach(btn => {
            btn.textContent = 'Sent ✓';
            btn.style.background = '#4CAF50';
        });
        
        // Show notifs
        showFriendNotification('sent', `Your friend request has been sent to ${username}. They'll receive a notification to accept or decline.`);
        
        // Closes the modal after a short delay
        setTimeout(() => {
            closeAddFriendModal();
        }, 1500);
        
    } catch (error) {
        console.error('Error sending friend request:', error);
        
        // Show the error state on button
        const buttons = document.querySelectorAll(`button[onclick="sendFriendRequestToUser('${username}')"]`);
        buttons.forEach(btn => {
            btn.textContent = 'Error';
            btn.style.background = '#f44336';
        });
        
        // Resets the button after delay
        setTimeout(() => {
            buttons.forEach(btn => {
                btn.textContent = 'Add Friend';
                btn.disabled = false;
                btn.style.background = '#ff6b6b';
            });
        }, 2000);
        
        // Show notifs
        showFriendNotification('error', error.message || 'Failed to send friend request. Please try again.');
    }
}

// Adda skeyboard support for the modal
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('addFriendModal');
    if (modal && e.key === 'Escape') {
        closeAddFriendModal();
    }
});

// Add a CSS for the spinning animation
const addFriendModalStyle = document.createElement('style');
addFriendModalStyle.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(addFriendModalStyle);

// notifs system for friend requests
function showFriendNotification(type, message, username = '') {
    // Removes any existing notifs fot the same type
    const existingNotifications = document.querySelectorAll('.friend-notification');
    existingNotifications.forEach(notification => {
        if (notification.classList.contains(`notification-${type}`)) {
            notification.remove();
        }
    });
    
    // Creates a notifs container
    const notification = document.createElement('div');
    notification.className = `friend-notification notification-${type}`;
    
    // Different colors and icons based on notfis type
    let backgroundColor, borderColor, icon, textColor;
    
    switch (type) {
        case 'accepted':
            backgroundColor = '#4CAF50';
            borderColor = '#45a049';
            icon = '🎉';
            textColor = 'white';
            break;
        case 'sent':
            backgroundColor = '#2196F3';
            borderColor = '#1976D2';
            icon = '📤';
            textColor = 'white';
            break;
        case 'declined':
            backgroundColor = '#ff9800';
            borderColor = '#f57c00';
            icon = '📝';
            textColor = 'white';
            break;
        case 'error':
            backgroundColor = '#f44336';
            borderColor = '#d32f2f';
            icon = '❌';
            textColor = 'white';
            break;
        default:
            backgroundColor = '#333';
            borderColor = '#555';
            icon = '👤';
            textColor = 'white';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: ${textColor};
        padding: 1rem 1.5rem;
        border-radius: 10px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 5000;
        max-width: 350px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        opacity: 0;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;
    
    // Creates a notifs content
    notification.innerHTML = `
        <div style="font-size: 1.5rem;">${icon}</div>
        <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 0.25rem;">${getFriendNotificationTitle(type)}</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">${message}</div>
        </div>
        <button onclick="closeFriendNotification(this)" style="background: rgba(255,255,255,0.2); border: none; color: ${textColor}; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Animates in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Auto removes after delay
    const autoRemoveDelay = type === 'accepted' ? 5000 : 4000;
    setTimeout(() => {
        if (notification.parentNode) {
            animateOutNotification(notification);
        }
    }, autoRemoveDelay);
    
    // Adds a hover effect to pause auto removal
    let autoRemoveTimer;
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoRemoveTimer);
    });
    
    notification.addEventListener('mouseleave', () => {
        autoRemoveTimer = setTimeout(() => {
            if (notification.parentNode) {
                animateOutNotification(notification);
            }
        }, 2000);
    });
}

// Gets the appropriate title for notifs type
function getFriendNotificationTitle(type) {
    switch (type) {
        case 'accepted':
            return 'Friend Request Accepted!';
        case 'sent':
            return 'Friend Request Sent!';
        case 'declined':
            return 'Friend Request Declined';
        case 'error':
            return 'Request Failed';
        default:
            return 'Friend Update';
    }
}

// Animate notifs out
function animateOutNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// Closews notifs manually
function closeFriendNotification(button) {
    const notification = button.closest('.friend-notification');
    if (notification) {
        animateOutNotification(notification);
    }
}

// notifs system for the reviews
function showReviewNotification(type, message, movieData = {}) {
    // Removes any existing review notifs
    const existingNotifications = document.querySelectorAll('.review-notification');
    existingNotifications.forEach(notification => {
        if (notification.classList.contains(`notification-${type}`)) {
            notification.remove();
        }
    });
    
    // Creates a notif container
    const notification = document.createElement('div');
    notification.className = `review-notification notification-${type}`;
    
    // Different colors and icons based on the notifs type
    let backgroundColor, borderColor, icon, textColor;
    
    switch (type) {
        case 'success':
            backgroundColor = '#4CAF50';
            borderColor = '#45a049';
            icon = '🎬';
            textColor = 'white';
            break;
        case 'updated':
            backgroundColor = '#2196F3';
            borderColor = '#1976D2';
            icon = '✏️';
            textColor = 'white';
            break;
        case 'liked':
            backgroundColor = '#E91E63';
            borderColor = '#C2185B';
            icon = '❤️';
            textColor = 'white';
            break;
        case 'error':
            backgroundColor = '#f44336';
            borderColor = '#d32f2f';
            icon = '❌';
            textColor = 'white';
            break;
        default:
            backgroundColor = '#333';
            borderColor = '#555';
            icon = '📝';
            textColor = 'white';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: ${textColor};
        padding: 1rem 1.5rem;
        border-radius: 10px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 5000;
        max-width: 400px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        opacity: 0;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    `;
    
    // Creates a star rating display if rating is provided
    let starsHTML = '';
    if (movieData.rating) {
        const fullStars = '★'.repeat(movieData.rating);
        const emptyStars = '☆'.repeat(5 - movieData.rating);
        starsHTML = `<div style="color: #ffd700; font-size: 1.1rem; margin: 0.25rem 0;">${fullStars}${emptyStars}</div>`;
    }
    
    // Creates a film poster if available
    let posterHTML = '';
    if (movieData.poster) {
        posterHTML = `
            <div style="width: 50px; height: 75px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #555;">
                <img src="${movieData.poster}" alt="${movieData.title}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `;
    }
    
    // Creates the notifs content
    notification.innerHTML = `
        <div style="font-size: 1.8rem; flex-shrink: 0;">${icon}</div>
        ${posterHTML}
        <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 0.25rem;">${getReviewNotificationTitle(type)}</div>
            ${movieData.title ? `<div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.25rem;">${movieData.title} ${movieData.year ? `(${movieData.year})` : ''}</div>` : ''}
            ${starsHTML}
            <div style="font-size: 0.85rem; opacity: 0.8;">${message}</div>
        </div>
        <button onclick="closeReviewNotification(this)" style="background: rgba(255,255,255,0.2); border: none; color: ${textColor}; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Animates in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Auto removes after delay
    const autoRemoveDelay = type === 'success' ? 5000 : 4000;
    let autoRemoveTimer = setTimeout(() => {
        if (notification.parentNode) {
            animateOutReviewNotification(notification);
        }
    }, autoRemoveDelay);
    
    // Adds a hover effect to pause auto-removal
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoRemoveTimer);
    });
    
    notification.addEventListener('mouseleave', () => {
        autoRemoveTimer = setTimeout(() => {
            if (notification.parentNode) {
                animateOutReviewNotification(notification);
            }
        }, 2000);
    });
}

// Gets the appropriate title for review notifs
function getReviewNotificationTitle(type) {
    switch (type) {
        case 'success':
            return 'Review Submitted!';
        case 'updated':
            return 'Review Updated!';
        case 'liked':
            return 'Review Liked!';
        case 'error':
            return 'Review Failed';
        default:
            return 'Review Update';
    }
}

// Animates the review notifs out
function animateOutReviewNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// Closes the review notifs manually
function closeReviewNotification(button) {
    const notification = button.closest('.review-notification');
    if (notification) {
        animateOutReviewNotification(notification);
    }
}

// Enhancing the notifs system for Top 5 films
function showTop5Notification(type, message, movieData = {}) {
    // Removes any existing top5 notifs
    const existingNotifications = document.querySelectorAll('.top5-notification');
    existingNotifications.forEach(notification => {
        if (notification.classList.contains(`notification-${type}`)) {
            notification.remove();
        }
    });
    
    // Creates the notifs container
    const notification = document.createElement('div');
    notification.className = `top5-notification notification-${type}`;
    
    // Different colors and icons based on notifsn type
    let backgroundColor, borderColor, icon, textColor;
    
    switch (type) {
        case 'success':
            backgroundColor = '#4CAF50';
            borderColor = '#45a049';
            icon = '🏆';
            textColor = 'white';
            break;
        case 'updated':
            backgroundColor = '#2196F3';
            borderColor = '#1976D2';
            icon = '✨';
            textColor = 'white';
            break;
        case 'added':
            backgroundColor = '#9C27B0';
            borderColor = '#7B1FA2';
            icon = '🎭';
            textColor = 'white';
            break;
        case 'removed':
            backgroundColor = '#FF9800';
            borderColor = '#F57C00';
            icon = '📝';
            textColor = 'white';
            break;
        case 'warning':
            backgroundColor = '#FF9800';
            borderColor = '#F57C00';
            icon = '⚠️';
            textColor = 'white';
            break;
        case 'error':
            backgroundColor = '#f44336';
            borderColor = '#d32f2f';
            icon = '❌';
            textColor = 'white';
            break;
        case 'info':
            backgroundColor = '#2196F3';
            borderColor = '#1976D2';
            icon = '💡';
            textColor = 'white';
            break;
        default:
            backgroundColor = '#333';
            borderColor = '#555';
            icon = '🎬';
            textColor = 'white';
    }
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: ${textColor};
        padding: 1rem 1.5rem;
        border-radius: 10px;
        border-left: 4px solid ${borderColor};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 5000;
        max-width: 380px;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        opacity: 0;
        display: flex;
        align-items: flex-start;
        gap: 1rem;
    `;
    
    // creates the position indicator if available
    let positionHTML = '';
    if (movieData.position) {
        positionHTML = `
            <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">
                #${movieData.position}
            </div>
        `;
    }
    
    // creates a films poster if available
    let posterHTML = '';
    if (movieData.poster) {
        posterHTML = `
            <div style="width: 45px; height: 68px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #555; position: relative;">
                <img src="${movieData.poster}" alt="${movieData.title}" style="width: 100%; height: 100%; object-fit: cover;">
                ${positionHTML ? `<div style="position: absolute; top: -8px; right: -8px;">${positionHTML}</div>` : ''}
            </div>
        `;
    } else if (movieData.position) {
        posterHTML = positionHTML;
    }
    
    // creates a notifs content
    notification.innerHTML = `
        <div style="font-size: 1.8rem; flex-shrink: 0;">${icon}</div>
        ${posterHTML}
        <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 0.25rem;">${getTop5NotificationTitle(type)}</div>
            ${movieData.title ? `<div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.25rem;">${movieData.title} ${movieData.year ? `(${movieData.year})` : ''}</div>` : ''}
            <div style="font-size: 0.85rem; opacity: 0.8; line-height: 1.3;">${message}</div>
        </div>
        <button onclick="closeTop5Notification(this)" style="background: rgba(255,255,255,0.2); border: none; color: ${textColor}; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; flex-shrink: 0;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // animates in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Automatically removes after delay
    const autoRemoveDelay = type === 'success' ? 5000 : 4000;
    let autoRemoveTimer = setTimeout(() => {
        if (notification.parentNode) {
            animateOutTop5Notification(notification);
        }
    }, autoRemoveDelay);
    
    // adding a hover effect to pause auto removal
    notification.addEventListener('mouseenter', () => {
        clearTimeout(autoRemoveTimer);
    });
    
    notification.addEventListener('mouseleave', () => {
        autoRemoveTimer = setTimeout(() => {
            if (notification.parentNode) {
                animateOutTop5Notification(notification);
            }
        }, 2000);
    });
}

// gets the appropriate title for the Top 5 notifs
function getTop5NotificationTitle(type) {
    switch (type) {
        case 'success':
            return 'Top 5 Films Updated!';
        case 'updated':
            return 'Top 5 Films Saved!';
        case 'added':
            return 'Film Added to Top 5!';
        case 'removed':
            return 'Film Removed from Top 5';
        case 'warning':
            return 'Please Select a Position';
        case 'error':
            return 'Top 5 Update Failed';
        case 'info':
            return 'Top 5 Info';
        default:
            return 'Top 5 Update';
    }
}

// animate the Top 5 notifs out
function animateOutTop5Notification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300);
}

// closees the Top 5 notifs manually
function closeTop5Notification(button) {
    const notification = button.closest('.top5-notification');
    if (notification) {
        animateOutTop5Notification(notification);
    }
}

// handleSearchButtonClick function
function handleSearchButtonClick() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (query) {
        console.log('Search button clicked with query:', query);
        performGlobalSearch(query);
    } else {
        searchInput.style.animation = 'shake 0.5s';
        searchInput.focus();
        setTimeout(() => {
            searchInput.style.animation = '';
        }, 500);
        
        // shows a hint notif
        if (typeof showReviewNotification === 'function') {
            showReviewNotification('warning', 'Please enter a search term first!');
        } else {
            alert('Please enter a search term!');
        }
    }
}

// adds a  shake animation for when the useres enters an empty search
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);

console.log('Movielized app loaded successfully!');