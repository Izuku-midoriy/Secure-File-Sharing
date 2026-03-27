const cron = require('node-cron');
const File = require('../models/File');

// Schedule a job to run every hour at minute 0
cron.schedule('0 * * * *', async () => {
    try {
        console.log('[Cron] Running cleanup for expired tokens and links...');
        const now = new Date();

        // Remove expired download tokens, temporary links, and sharedWith permissions. 
        // Using $pull to remove elements from the array without dropping the document itself.
        const result = await File.updateMany(
            {}, 
            {
                $pull: {
                    downloadTokens: { expiresAt: { $lt: now } },
                    temporaryLinks: { expiresAt: { $lt: now } },
                    sharedWith:     { expiresAt: { $lt: now } }
                }
            }
        );
        
        console.log(`[Cron] Cleanup process complete. Modified ${result.modifiedCount} files.`);
    } catch (error) {
        console.error('[Cron] Error running token cleanup:', error);
    }
});

console.log('[Cron] Token cleanup job registered to run hourly.');
