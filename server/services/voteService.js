// Vote Service - Voting Logic

/**
 * Process vote for a restaurant
 * @param {Object} restaurant - Restaurant object from roomData
 * @param {string} userId 
 * @param {string} type - 'up' or 'down'
 * @param {string} reason - optional reason for downvote
 * @param {string} nickname 
 */
export const processVote = (restaurant, userId, type, reason, nickname) => {
    // Initialize vote tracking structures
    if (!restaurant.userVotes) restaurant.userVotes = {};
    if (!restaurant.dislikeReasons) restaurant.dislikeReasons = [];

    const existingVote = restaurant.userVotes[userId];

    // Toggle logic
    if (existingVote === type) {
        // User is toggling off their vote
        delete restaurant.userVotes[userId];

        // Decrement count
        if (type === 'up') {
            restaurant.likes = Math.max(0, (restaurant.likes || 0) - 1);
        } else if (type === 'down') {
            restaurant.dislikes = Math.max(0, (restaurant.dislikes || 0) - 1);
            // Remove their reason if exists
            restaurant.dislikeReasons = restaurant.dislikeReasons.filter(r => r.userId !== userId);
        }
    } else {
        // User is voting (new vote or changing vote)

        // If changing vote, decrement old count
        if (existingVote) {
            if (existingVote === 'up') {
                restaurant.likes = Math.max(0, (restaurant.likes || 0) - 1);
            } else if (existingVote === 'down') {
                restaurant.dislikes = Math.max(0, (restaurant.dislikes || 0) - 1);
                restaurant.dislikeReasons = restaurant.dislikeReasons.filter(r => r.userId !== userId);
            }
        }

        // Set new vote
        restaurant.userVotes[userId] = type;

        // Increment new count
        if (type === 'up') {
            restaurant.likes = (restaurant.likes || 0) + 1;
        } else if (type === 'down') {
            restaurant.dislikes = (restaurant.dislikes || 0) + 1;
            // Store reason if provided
            if (reason) {
                restaurant.dislikeReasons.push({
                    userId,
                    nickname: nickname || '익명',
                    reason,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
};

export default { processVote };
