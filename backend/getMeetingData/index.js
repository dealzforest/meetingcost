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
        const meetingId = req.params.meetingId;
        
        context.log(`Getting data for meeting ${meetingId}`);
        
        // Run cleanup before processing
        cleanupOldMeetings();
        
        const meetingData = global.meetings[meetingId];
        
        if (!meetingData) {
            context.res = {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Meeting not found' }
            };
            return;
        }
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                meetingData: meetingData
            }
        };
    } catch (error) {
        context.log.error('Error in getMeetingData:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error' }
        };
    }
};