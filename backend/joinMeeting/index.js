// Shared in-memory storage (replace with Azure Table Storage in production)
global.meetings = global.meetings || {};

// Clean up meetings older than 24 hours
const cleanupOldMeetings = () => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const meetingIds = Object.keys(global.meetings);
    
    meetingIds.forEach(meetingId => {
        const meeting = global.meetings[meetingId];
        if (meeting.createdAt && meeting.createdAt < oneDayAgo) {
            delete global.meetings[meetingId];
        }
    });
};

module.exports = async function (context, req) {
    try {
        const { meetingId, userId, userName } = req.body;
        
        context.log(`User ${userName} joining meeting ${meetingId}`);
        
        // Run cleanup before processing
        cleanupOldMeetings();
        
        // Initialize meeting if it doesn't exist
        if (!global.meetings[meetingId]) {
            global.meetings[meetingId] = {
                meetingId,
                participants: [],
                createdAt: Date.now()
            };
        }
        
        // Check if participant already exists
        const existingParticipant = global.meetings[meetingId].participants.find(p => p.id === userId);
        if (!existingParticipant) {
            global.meetings[meetingId].participants.push({
                id: userId,
                name: userName,
                hourlyRate: 0
            });
        }
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                meetingData: global.meetings[meetingId]
            }
        };
    } catch (error) {
        context.log.error('Error in joinMeeting:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error' }
        };
    }
};