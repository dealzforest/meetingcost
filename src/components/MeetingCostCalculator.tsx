import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardPreview,
  Text,
  makeStyles,
  Divider,
  Badge,
  Spinner,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { UserDataManager, type UserProfile, type MeetingSession } from "../utils/userDataManager";

const useStyles = makeStyles({
  container: {
    padding: "24px",
    maxWidth: "900px",
    margin: "0 auto",
    minHeight: "100vh",
    backgroundColor: "#faf9f8",
  },
  mainCard: {
    marginBottom: "24px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  headerCard: {
    background: "linear-gradient(135deg, #0078d4 0%, #106ebe 100%)",
    color: "white",
    padding: "24px",
    textAlign: "center",
  },
  welcomeSection: {
    padding: "32px",
    textAlign: "center",
    backgroundColor: "white",
  },
  statsSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    margin: "24px 0",
  },
  statCard: {
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "center",
    border: "1px solid #e1dfdd",
  },
  inputGroup: {
    marginBottom: "20px",
    maxWidth: "300px",
    margin: "20px auto",
  },
  meetingSection: {
    padding: "32px",
    backgroundColor: "white",
  },
  timeTracking: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "#f8f9fa",
    borderRadius: "12px",
    marginBottom: "24px",
  },
  timerDisplay: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#0078d4",
    minWidth: "200px",
    textAlign: "center",
  },
  participantCard: {
    marginBottom: "12px",
    padding: "20px",
    border: "1px solid #e1dfdd",
    borderRadius: "12px",
    backgroundColor: "white",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
    transition: "all 0.2s ease",
    ":hover": {
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      transform: "translateY(-1px)",
    },
  },
  currentUser: {
    backgroundColor: "#e6f3ff",
    border: "2px solid #0078d4",
    ":hover": {
      backgroundColor: "#e6f3ff",
    },
  },
  resultSection: {
    marginTop: "32px",
    padding: "24px",
    backgroundColor: "#f3f2f1",
    borderRadius: "12px",
    border: "2px solid #0078d4",
  },
  totalCost: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0078d4",
  },
  yourShare: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#107c10",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
    gap: "16px",
  },
});

interface Participant {
  id: string;
  name: string;
  hourlyRate: number;
  isCurrentUser?: boolean;
}

export default function MeetingCostCalculator() {
  const styles = useStyles();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserRate, setCurrentUserRate] = useState<number>(0);
  const [meetingDuration, setMeetingDuration] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  // Load user profile from Teams context and localStorage
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const context = await microsoftTeams.app.getContext();
        console.log('Teams context:', context);
        const userId = context.user?.id || 'default-user';
        const userEmail = context.user?.userPrincipalName || '';
        const userName = context.user?.displayName || userEmail || 'Unknown User';

        // Load profile using data manager
        let profile = UserDataManager.getUserProfile(userId);
        
        if (!profile) {
          // Create new profile for first-time user
          profile = {
            id: userId,
            name: userName,
            email: userEmail,
            hourlyRate: 0,
            totalMeetings: 0,
            totalCost: 0,
          };
          console.log('Created new user profile:', profile);
        } else {
          // Update name/email in case they changed in Teams
          profile.name = userName;
          profile.email = userEmail;
          console.log('Loaded existing user profile:', profile);
        }

        setUserProfile(profile);
        setCurrentUserRate(profile.hourlyRate);
      } catch (error) {
        console.error('Failed to get Teams context, using fallback:', error);
        // Fallback for standalone mode
        const savedProfiles = JSON.parse(localStorage.getItem('meetingUserProfiles') || '{}');
        const fallbackProfile = savedProfiles['fallback-user'] || {
          id: 'fallback-user',
          name: 'User',
          email: 'user@example.com',
          hourlyRate: 0,
          totalMeetings: 0,
          totalCost: 0,
        };
        setUserProfile(fallbackProfile);
        setCurrentUserRate(fallbackProfile.hourlyRate);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserProfile();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
        setMeetingDuration(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, startTime]);

  const saveUserProfile = (profile: UserProfile) => {
    UserDataManager.saveUserProfile(profile);
  };

  const joinMeeting = () => {
    if (userProfile && currentUserRate > 0) {
      const updatedProfile = {
        ...userProfile,
        hourlyRate: currentUserRate,
      };
      setUserProfile(updatedProfile);
      saveUserProfile(updatedProfile);

      const newParticipant: Participant = {
        id: userProfile.id,
        name: userProfile.name,
        hourlyRate: currentUserRate,
        isCurrentUser: true,
      };
      setParticipants([...participants, newParticipant]);
    }
  };

  const startMeeting = () => {
    setIsTimerRunning(true);
    setStartTime(new Date());
    setMeetingDuration(0);
  };

  const stopMeeting = () => {
    setIsTimerRunning(false);
    
    // Update user's meeting statistics and save session
    if (userProfile && meetingDuration > 0) {
      const currentUserParticipant = participants.find(p => p.isCurrentUser);
      if (currentUserParticipant) {
        const meetingCost = calculateIndividualCost(currentUserParticipant);
        
        // Save this meeting session
        const meetingSession: MeetingSession = {
          id: Date.now().toString(),
          userId: userProfile.id,
          userName: userProfile.name,
          date: new Date().toISOString(),
          duration: meetingDuration,
          hourlyRate: currentUserParticipant.hourlyRate,
          cost: meetingCost,
          participants: participants.length
        };
        UserDataManager.saveMeetingSession(meetingSession);
        
        // Update user profile totals
        const updatedProfile = {
          ...userProfile,
          totalMeetings: userProfile.totalMeetings + 1,
          totalCost: userProfile.totalCost + meetingCost,
        };
        setUserProfile(updatedProfile);
        saveUserProfile(updatedProfile);
      }
    }
  };

  const resetMeeting = () => {
    setIsTimerRunning(false);
    setStartTime(null);
    setMeetingDuration(0);
    setParticipants([]);
  };

  const calculateIndividualCost = (participant: Participant): number => {
    return participant.hourlyRate * (meetingDuration / 60);
  };

  const calculateTotalCost = (): number => {
    return participants.reduce((total, participant) => {
      return total + calculateIndividualCost(participant);
    }, 0);
  };

  const getCurrentUserParticipant = () => {
    return participants.find(p => p.isCurrentUser);
  };

  const exportUserData = () => {
    if (userProfile) {
      UserDataManager.downloadUserData(userProfile.id, userProfile.name);
    }
  };

  const currentUser = getCurrentUserParticipant();

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <Card className={styles.mainCard}>
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <Text size={500} weight="semibold">Loading your profile...</Text>
            <Text size={300} style={{ color: "#605e5c" }}>Setting up your meeting cost tracker</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <Card className={styles.mainCard}>
        <div className={styles.headerCard}>
          <Text size={600} weight="bold">💰 Meeting Cost Tracker</Text>
          <Text size={400} style={{ marginTop: "8px", opacity: 0.9 }}>
            Track your time, know your worth
          </Text>
        </div>
      </Card>

      {!currentUser ? (
        /* Welcome Screen */
        <Card className={styles.mainCard}>
          <div className={styles.welcomeSection}>
            <Text size={600} weight="bold" style={{ marginBottom: "16px", display: "block" }}>
              👋 Welcome, {userProfile?.name}!
            </Text>

            {/* Stats Section */}
            <div className={styles.statsSection}>
              <div className={styles.statCard}>
                <Text size={500} weight="bold" style={{ color: "#0078d4", display: "block" }}>
                  {userProfile?.totalMeetings || 0}
                </Text>
                <Text size={300} style={{ color: "#605e5c" }}>Total Meetings</Text>
              </div>
              <div className={styles.statCard}>
                <Text size={500} weight="bold" style={{ color: "#107c10", display: "block" }}>
                  ${userProfile?.totalCost.toFixed(2) || '0.00'}
                </Text>
                <Text size={300} style={{ color: "#605e5c" }}>Total Cost</Text>
              </div>
              <div className={styles.statCard}>
                <Text size={500} weight="bold" style={{ color: "#d83b01", display: "block" }}>
                  ${userProfile?.hourlyRate || 0}
                </Text>
                <Text size={300} style={{ color: "#605e5c" }}>Last Rate</Text>
              </div>
            </div>

            <Divider style={{ margin: "32px 0" }} />

            <Text size={500} weight="semibold" style={{ marginBottom: "24px", display: "block" }}>
              🚀 Ready to track this meeting?
            </Text>

            <div className={styles.inputGroup}>
              <Label htmlFor="userRate" style={{ fontSize: "16px", fontWeight: "600" }}>
                Your Hourly Rate ($)
              </Label>
              <Input
                id="userRate"
                type="number"
                size="large"
                value={currentUserRate.toString()}
                onChange={(_, data) => setCurrentUserRate(Number(data.value) || 0)}
                placeholder={userProfile?.hourlyRate ? `Previous rate: $${userProfile.hourlyRate}` : "Enter your hourly rate"}
                style={{ fontSize: "18px", padding: "12px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "16px", justifyContent: "center", alignItems: "center" }}>
              <Button
                appearance="primary"
                size="large"
                onClick={joinMeeting}
                disabled={currentUserRate <= 0}
                style={{ minWidth: "160px" }}
              >
                🎯 Join Meeting
              </Button>
              <Button
                appearance="subtle"
                size="medium"
                onClick={exportUserData}
              >
                📊 Export Data
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Meeting In Progress */
        <>
          {/* Timer Section */}
          <Card className={styles.mainCard}>
            <div className={styles.timeTracking}>
              <div style={{ textAlign: "center" }}>
                <Badge
                  appearance="filled"
                  color={isTimerRunning ? "success" : "subtle"}
                  size="large"
                  style={{ marginBottom: "16px" }}
                >
                  {isTimerRunning ? "🔴 LIVE" : "⏸️ PAUSED"}
                </Badge>
                <div className={styles.timerDisplay}>
                  ⏱️ {meetingDuration} min
                </div>
                <Text size={300} style={{ color: "#605e5c" }}>
                  Meeting Duration
                </Text>
              </div>
              
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {!isTimerRunning ? (
                  <Button 
                    appearance="primary" 
                    size="large" 
                    onClick={startMeeting}
                    style={{ minWidth: "120px" }}
                  >
                    ▶️ Start
                  </Button>
                ) : (
                  <Button 
                    appearance="secondary" 
                    size="large" 
                    onClick={stopMeeting}
                    style={{ minWidth: "120px" }}
                  >
                    ⏹️ Stop
                  </Button>
                )}
                <Button 
                  appearance="outline" 
                  size="large" 
                  onClick={resetMeeting}
                  style={{ minWidth: "120px" }}
                >
                  🔄 Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Participants Section */}
          <Card className={styles.mainCard}>
            <div className={styles.meetingSection}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <Text size={600} weight="bold">
                  👥 Meeting Participants
                </Text>
                <Badge appearance="filled" color="brand" size="large">
                  {participants.length} {participants.length === 1 ? 'person' : 'people'}
                </Badge>
              </div>
              
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`${styles.participantCard} ${
                    participant.isCurrentUser ? styles.currentUser : ""
                  }`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <Text weight="bold" size={500} style={{ wordBreak: "break-word" }}>
                          {participant.name}
                        </Text>
                        {participant.isCurrentUser && (
                          <Badge appearance="filled" color="success" size="small">YOU</Badge>
                        )}
                      </div>
                      <Text size={300} style={{ color: "#605e5c" }}>
                        💰 ${participant.hourlyRate}/hour
                      </Text>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: "0" }}>
                      <Text size={600} weight="bold" style={{ color: "#107c10", display: "block" }}>
                        ${calculateIndividualCost(participant).toFixed(2)}
                      </Text>
                      <Text size={300} style={{ color: "#605e5c", whiteSpace: "nowrap" }}>
                        Cost so far
                      </Text>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Results Section */}
          <Card className={styles.mainCard}>
            <div className={styles.resultSection}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
                <div style={{ textAlign: "center", flex: "1", minWidth: "200px" }}>
                  <Text size={300} style={{ color: "#605e5c", marginBottom: "8px", display: "block" }}>
                    💸 Total Meeting Cost
                  </Text>
                  <Text className={styles.totalCost}>
                    ${calculateTotalCost().toFixed(2)}
                  </Text>
                  <Text size={300} style={{ color: "#605e5c", marginTop: "4px" }}>
                    All {participants.length} participants
                  </Text>
                </div>
                
                {currentUser && (
                  <div style={{ textAlign: "center", flex: "1", minWidth: "200px" }}>
                    <Text size={300} style={{ color: "#605e5c", marginBottom: "8px", display: "block" }}>
                      🎯 Your Share
                    </Text>
                    <Text className={styles.yourShare}>
                      ${calculateIndividualCost(currentUser).toFixed(2)}
                    </Text>
                    <Text size={300} style={{ color: "#605e5c", marginTop: "4px" }}>
                      {calculateTotalCost() > 0 ? (((calculateIndividualCost(currentUser) / calculateTotalCost()) * 100).toFixed(1)) : '0'}% of total
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}