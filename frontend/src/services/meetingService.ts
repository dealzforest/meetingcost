interface MeetingParticipant {
  id: string;
  name: string;
  hourlyRate: number;
}

interface MeetingData {
  meetingId: string;
  participants: MeetingParticipant[];
}

class MeetingService {
  private baseUrl: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private onMeetingDataUpdate?: (data: MeetingData) => void;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';
  }

  async joinMeeting(meetingId: string, userId: string, userName: string): Promise<MeetingData> {
    const response = await fetch(`${this.baseUrl}/meeting/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meetingId, userId, userName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to join meeting: ${response.statusText}`);
    }

    const result = await response.json();
    return result.meetingData;
  }

  async updateHourlyRate(
    meetingId: string,
    userId: string,
    userName: string,
    hourlyRate: number
  ): Promise<MeetingData> {
    const response = await fetch(`${this.baseUrl}/meeting/update-rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ meetingId, userId, userName, hourlyRate }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update hourly rate: ${response.statusText}`);
    }

    const result = await response.json();
    return result.meetingData;
  }

  async getMeetingData(meetingId: string): Promise<MeetingData> {
    const response = await fetch(`${this.baseUrl}/meeting/${meetingId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get meeting data: ${response.statusText}`);
    }

    const result = await response.json();
    return result.meetingData;
  }

  // Start polling for meeting updates (replaces WebSocket real-time updates)
  startPolling(meetingId: string, onUpdate: (data: MeetingData) => void, intervalMs: number = 5000) {
    this.onMeetingDataUpdate = onUpdate;
    
    this.pollingInterval = setInterval(async () => {
      try {
        const meetingData = await this.getMeetingData(meetingId);
        onUpdate(meetingData);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export default new MeetingService();