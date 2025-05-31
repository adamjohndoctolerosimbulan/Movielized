// Add this at the very top of your server.js file (first line):
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movielized';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ MongoDB connected successfully!');
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Please check your MONGODB_URI in the .env file');
});

// Add connection event listeners
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    joinDate: { type: Date, default: Date.now },
    top5Films: [{ type: Number }], // TMDB movie IDs
    watchlist: [{ type: Number }], // TMDB movie IDs
    watchedMovies: [{
        movieId: Number,
        watchedDate: { type: Date, default: Date.now },
        rating: { type: Number, min: 1, max: 5 }
    }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Review Schema
const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    movieId: { type: Number, required: true }, // TMDB movie ID
    movieTitle: { type: String, required: true },
    moviePoster: { type: String },
    movieYear: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Friendship Schema
const friendshipSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'declined', 'blocked'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Activity Schema
const activitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { 
        type: String, 
        enum: ['watched_movie', 'rated_movie', 'reviewed_movie', 'liked_review', 'added_to_watchlist', 'added_friend', 'updated_top5'],
        required: true 
    },
    movieId: { type: Number }, // TMDB movie ID (if applicable)
    movieTitle: { type: String },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For friend activities
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' }, // For review activities
    rating: { type: Number }, // For rating activities
    createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Review = mongoose.model('Review', reviewSchema);
const Friendship = mongoose.model('Friendship', friendshipSchema);
const Activity = mongoose.model('Activity', activitySchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Helper function to create activity
const createActivity = async (userId, activityType, data = {}) => {
    try {
        const activity = new Activity({
            userId,
            activityType,
            ...data
        });
        await activity.save();
    } catch (error) {
        console.error('Error creating activity:', error);
    }
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                joinDate: user.joinDate
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// User Routes
app.get('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password')
            .populate('following', 'username')
            .populate('followers', 'username');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                location: user.location,
                joinDate: user.joinDate,
                top5Films: user.top5Films,
                watchlist: user.watchlist,
                watchedMovies: user.watchedMovies,
                following: user.following,
                followers: user.followers,
                stats: {
                    moviesWatched: user.watchedMovies.length,
                    moviesThisYear: user.watchedMovies.filter(movie => 
                        new Date(movie.watchedDate).getFullYear() === new Date().getFullYear()
                    ).length,
                    following: user.following.length,
                    followers: user.followers.length
                }
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { username, email, bio, location } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if username/email is already taken by another user
        if (username !== user.username || email !== user.email) {
            const existingUser = await User.findOne({
                _id: { $ne: req.user.userId },
                $or: [{ username }, { email }]
            });

            if (existingUser) {
                return res.status(400).json({ 
                    error: existingUser.username === username ? 'Username already taken' : 'Email already registered'
                });
            }
        }

        // Update user
        user.username = username || user.username;
        user.email = email || user.email;
        user.bio = bio || user.bio;
        user.location = location || user.location;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                bio: user.bio,
                location: user.location
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Top 5 Films Routes
app.put('/api/users/top5', authenticateToken, async (req, res) => {
    try {
        const { top5Films } = req.body;
        
        if (!Array.isArray(top5Films) || top5Films.length > 5) {
            return res.status(400).json({ error: 'Invalid top 5 films data' });
        }

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.top5Films = top5Films.filter(id => id !== null && id !== undefined);
        await user.save();

        // Create activity
        await createActivity(req.user.userId, 'updated_top5');

        res.json({
            message: 'Top 5 films updated successfully',
            top5Films: user.top5Films
        });
    } catch (error) {
        console.error('Top 5 update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Watchlist Routes
app.post('/api/users/watchlist', authenticateToken, async (req, res) => {
    try {
        const { movieId, movieTitle } = req.body;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.watchlist.includes(movieId)) {
            return res.status(400).json({ error: 'Movie already in watchlist' });
        }

        user.watchlist.push(movieId);
        await user.save();

        // Create activity
        await createActivity(req.user.userId, 'added_to_watchlist', {
            movieId,
            movieTitle
        });

        res.json({
            message: 'Movie added to watchlist',
            watchlist: user.watchlist
        });
    } catch (error) {
        console.error('Watchlist add error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/watchlist/:movieId', authenticateToken, async (req, res) => {
    try {
        const { movieId } = req.params;
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.watchlist = user.watchlist.filter(id => id !== parseInt(movieId));
        await user.save();

        res.json({
            message: 'Movie removed from watchlist',
            watchlist: user.watchlist
        });
    } catch (error) {
        console.error('Watchlist remove error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Review Routes
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { movieId, movieTitle, moviePoster, movieYear, rating, reviewText } = req.body;
        
        // Check if user already reviewed this movie
        const existingReview = await Review.findOne({
            userId: req.user.userId,
            movieId
        });

        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this movie' });
        }

        const review = new Review({
            userId: req.user.userId,
            movieId,
            movieTitle,
            moviePoster,
            movieYear,
            rating,
            reviewText
        });

        await review.save();

        // Add to user's watched movies
        const user = await User.findById(req.user.userId);
        const existingWatched = user.watchedMovies.find(movie => movie.movieId === movieId);
        
        if (!existingWatched) {
            user.watchedMovies.push({
                movieId,
                rating,
                watchedDate: new Date()
            });
        } else {
            existingWatched.rating = rating;
        }
        
        await user.save();

        // Create activities
        await createActivity(req.user.userId, 'watched_movie', { movieId, movieTitle });
        await createActivity(req.user.userId, 'rated_movie', { movieId, movieTitle, rating });
        await createActivity(req.user.userId, 'reviewed_movie', { movieId, movieTitle, reviewId: review._id });

        // Populate user info for response
        await review.populate('userId', 'username');

        res.status(201).json({
            message: 'Review created successfully',
            review
        });
    } catch (error) {
        console.error('Review creation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const { movieId, userId, limit = 10, page = 1 } = req.query;
        
        let query = {};
        if (movieId) query.movieId = parseInt(movieId);
        if (userId) query.userId = userId;

        const reviews = await Review.find(query)
            .populate('userId', 'username')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        res.json({ reviews });
    } catch (error) {
        console.error('Reviews fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/reviews/:reviewId/like', authenticateToken, async (req, res) => {
    try {
        const { reviewId } = req.params;
        
        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const hasLiked = review.likes.includes(req.user.userId);
        
        if (hasLiked) {
            review.likes = review.likes.filter(id => !id.equals(req.user.userId));
        } else {
            review.likes.push(req.user.userId);
            
            // Create activity
            await createActivity(req.user.userId, 'liked_review', {
                reviewId,
                targetUserId: review.userId
            });
        }

        await review.save();

        res.json({
            message: hasLiked ? 'Review unliked' : 'Review liked',
            likes: review.likes.length,
            hasLiked: !hasLiked
        });
    } catch (error) {
        console.error('Review like error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Friendship Routes
app.post('/api/friends/request', authenticateToken, async (req, res) => {
    try {
        const { username } = req.body;
        
        // Find recipient user
        const recipient = await User.findOne({ username });
        if (!recipient) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (recipient._id.equals(req.user.userId)) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        // Check if friendship already exists
        const existingFriendship = await Friendship.findOne({
            $or: [
                { requester: req.user.userId, recipient: recipient._id },
                { requester: recipient._id, recipient: req.user.userId }
            ]
        });

        if (existingFriendship) {
            return res.status(400).json({ error: 'Friend request already exists or you are already friends' });
        }

        const friendship = new Friendship({
            requester: req.user.userId,
            recipient: recipient._id
        });

        await friendship.save();

        res.json({
            message: 'Friend request sent successfully',
            friendship
        });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/friends/request/:friendshipId', authenticateToken, async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const { action } = req.body; // 'accept' or 'decline'
        
        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        if (!friendship.recipient.equals(req.user.userId)) {
            return res.status(403).json({ error: 'Not authorized to respond to this request' });
        }

        if (action === 'accept') {
            friendship.status = 'accepted';
            await friendship.save();

            // Add to both users' friend lists
            await User.findByIdAndUpdate(friendship.requester, {
                $addToSet: { following: friendship.recipient }
            });
            await User.findByIdAndUpdate(friendship.recipient, {
                $addToSet: { following: friendship.requester }
            });

            // Create activity
            await createActivity(req.user.userId, 'added_friend', {
                targetUserId: friendship.requester
            });

            res.json({ message: 'Friend request accepted' });
        } else if (action === 'decline') {
            friendship.status = 'declined';
            await friendship.save();
            
            res.json({ message: 'Friend request declined' });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Friend request response error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/friends/requests', authenticateToken, async (req, res) => {
    try {
        const pendingRequests = await Friendship.find({
            recipient: req.user.userId,
            status: 'pending'
        }).populate('requester', 'username');

        res.json({ requests: pendingRequests });
    } catch (error) {
        console.error('Friend requests fetch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Activity Routes
app.get('/api/activities/feed', authenticateToken, async (req, res) => {
    try {
        const { type = 'friends', limit = 20, page = 1 } = req.query;
        
        let query = {};
        
        if (type === 'friends') {
            const user = await User.findById(req.user.userId);
            const friendIds = user.following;
            query.userId = { $in: friendIds };
        } else if (type === 'user') {
            query.userId = req.user.userId;
        }

        const activities = await Activity.find(query)
            .populate('userId', 'username')
            .populate('targetUserId', 'username')
            .populate('reviewId')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        res.json({ activities });
    } catch (error) {
        console.error('Activity feed error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Search Users
app.get('/api/users/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Search query too short' });
        }

        const users = await User.find({
            $and: [
                { _id: { $ne: req.user.userId } },
                {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { email: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        }).select('username email').limit(10);

        res.json({ users });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`MongoDB connected: ${mongoose.connection.readyState === 1 ? 'Yes' : 'No'}`);
});