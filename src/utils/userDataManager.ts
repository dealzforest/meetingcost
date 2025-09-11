// Simple JSON-based user data management
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  hourlyRate: number;
  totalMeetings: number;
  totalCost: number;
  lastUpdated?: string;
}

export interface MeetingSession {
  id: string;
  userId: string;
  userName: string;
  date: string;
  duration: number; // in minutes
  hourlyRate: number;
  cost: number;
  participants: number;
}

const USER_PROFILES_KEY = 'meetingUserProfiles';
const MEETING_SESSIONS_KEY = 'meetingSessions';

export class UserDataManager {
  // User Profile Management
  static saveUserProfile(profile: UserProfile): void {
    const profiles = this.getAllUserProfiles();
    profiles[profile.id] = {
      ...profile,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));
  }

  static getUserProfile(userId: string): UserProfile | null {
    const profiles = this.getAllUserProfiles();
    return profiles[userId] || null;
  }

  static getAllUserProfiles(): Record<string, UserProfile> {
    return JSON.parse(localStorage.getItem(USER_PROFILES_KEY) || '{}');
  }

  // Meeting Session Management
  static saveMeetingSession(session: MeetingSession): void {
    const sessions = this.getAllMeetingSessions();
    sessions.push(session);
    localStorage.setItem(MEETING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  static getAllMeetingSessions(): MeetingSession[] {
    return JSON.parse(localStorage.getItem(MEETING_SESSIONS_KEY) || '[]');
  }

  static getUserMeetingSessions(userId: string): MeetingSession[] {
    return this.getAllMeetingSessions().filter(session => session.userId === userId);
  }

  // Export Data
  static exportUserData(userId: string): string {
    const profile = this.getUserProfile(userId);
    const sessions = this.getUserMeetingSessions(userId);
    
    const exportData = {
      profile,
      sessions,
      exportDate: new Date().toISOString(),
      totalCost: sessions.reduce((sum, session) => sum + session.cost, 0),
      totalMeetings: sessions.length,
      totalMinutes: sessions.reduce((sum, session) => sum + session.duration, 0)
    };

    return JSON.stringify(exportData, null, 2);
  }

  static downloadUserData(userId: string, userName: string): void {
    const data = this.exportUserData(userId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-costs-${userName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Clear Data
  static clearUserData(userId: string): void {
    const profiles = this.getAllUserProfiles();
    delete profiles[userId];
    localStorage.setItem(USER_PROFILES_KEY, JSON.stringify(profiles));

    const sessions = this.getAllMeetingSessions().filter(session => session.userId !== userId);
    localStorage.setItem(MEETING_SESSIONS_KEY, JSON.stringify(sessions));
  }

  static clearAllData(): void {
    localStorage.removeItem(USER_PROFILES_KEY);
    localStorage.removeItem(MEETING_SESSIONS_KEY);
  }
}