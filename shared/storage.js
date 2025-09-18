// Shared storage for Azure Functions
// In production, replace with Azure Table Storage or Cosmos DB

class InMemoryStorage {
  constructor() {
    this.meetings = {};
  }

  getMeeting(meetingId) {
    return this.meetings[meetingId] || null;
  }

  createMeeting(meetingId) {
    if (!this.meetings[meetingId]) {
      this.meetings[meetingId] = {
        meetingId,
        participants: []
      };
    }
    return this.meetings[meetingId];
  }

  addParticipant(meetingId, participant) {
    const meeting = this.createMeeting(meetingId);
    const existingParticipant = meeting.participants.find(p => p.id === participant.id);
    
    if (!existingParticipant) {
      meeting.participants.push({
        id: participant.id,
        name: participant.name,
        hourlyRate: participant.hourlyRate || 0
      });
    }
    
    return meeting;
  }

  updateParticipantRate(meetingId, userId, hourlyRate) {
    const meeting = this.getMeeting(meetingId);
    if (!meeting) return null;

    const participant = meeting.participants.find(p => p.id === userId);
    if (participant) {
      participant.hourlyRate = hourlyRate;
    }

    return meeting;
  }

  getAllMeetings() {
    return this.meetings;
  }
}

// Export singleton instance
const storage = new InMemoryStorage();
module.exports = storage;