import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Text,
  makeStyles,
  Badge,
  Spinner,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { UserDataManager, type UserProfile, type MeetingSession } from "../utils/userDataManager";

const useStyles = makeStyles({
  container: {
    padding: "16px",
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "100vh",
    backgroundColor: "white",
  },
  card: {
    marginBottom: "16px",
    padding: "20px",
    border: "1px solid #e1dfdd",
    borderRadius: "8px",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  timer: {
    textAlign: "center",
    marginBottom: "20px",
  },
  timerDisplay: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0078d4",
    margin: "8px 0",
  },
  controls: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  participant: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#f8f9fa",
    borderRadius: "6px",
    border: "1px solid #e1dfdd",
  },
  currentUser: {
    backgroundColor: "#e6f3ff",
    border: "1px solid #0078d4",
  },
  summary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#f3f2f1",
    borderRadius: "6px",
    marginTop: "16px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
    gap: "12px",
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
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <Text>Loading...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={600} weight="bold">Meeting Cost Tracker</Text>
      </div>

      {!currentUser ? (
        <div className={styles.card}>
          <Text size={500} weight="semibold" style={{ marginBottom: "32px" }}>
            Welcome, {userProfile?.name}!
          </Text>
          
          <div className={styles.inputGroup} style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "24px" }}>
            <Label htmlFor="userRate" style={{ fontWeight: "600", minWidth: "120px" }}>
              Hourly Rate ($)
            </Label>
            <Input
              id="userRate"
              type="number"
              size="large"
              value={currentUserRate.toString()}
              onChange={(_, data) => setCurrentUserRate(Number(data.value) || 0)}
              placeholder="Enter your hourly rate"
              style={{ flex: "1" }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Button
              appearance="primary"
              onClick={joinMeeting}
              disabled={currentUserRate <= 0}
            >
              Join Meeting
            </Button>
            <Button
              appearance="subtle"
              onClick={exportUserData}
            >
              Export Data
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.timer}>
              <Badge
                appearance="filled"
                color={isTimerRunning ? "success" : "subtle"}
              >
                {isTimerRunning ? "LIVE" : "PAUSED"}
              </Badge>
              <div className={styles.timerDisplay}>
                {meetingDuration} min
              </div>
            </div>
            
            <div className={styles.controls}>
              {!isTimerRunning ? (
                <Button appearance="primary" onClick={startMeeting}>
                  Start
                </Button>
              ) : (
                <Button appearance="secondary" onClick={stopMeeting}>
                  Stop
                </Button>
              )}
              <Button appearance="outline" onClick={resetMeeting}>
                Reset
              </Button>
            </div>
          </div>

          <div className={styles.card}>
            <Text size={500} weight="semibold" style={{ marginBottom: "16px" }}>
              Participants ({participants.length})
            </Text>
            
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`${styles.participant} ${
                  participant.isCurrentUser ? styles.currentUser : ""
                }`}
              >
                <div>
                  <Text weight="semibold">{participant.name}</Text>
                  {participant.isCurrentUser && (
                    <Badge appearance="filled" color="success" size="small" style={{ marginLeft: "8px" }}>YOU</Badge>
                  )}
                  <div>
                    <Text size={300} style={{ color: "#605e5c" }}>
                      ${participant.hourlyRate}/hour
                    </Text>
                  </div>
                </div>
                <Text weight="bold" style={{ color: "#107c10" }}>
                  ${calculateIndividualCost(participant).toFixed(2)}
                </Text>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.summary}>
              <div>
                <Text size={300} style={{ color: "#605e5c" }}>Total Cost</Text>
                <Text size={500} weight="bold" style={{ color: "#0078d4" }}>
                  ${calculateTotalCost().toFixed(2)}
                </Text>
              </div>
              {currentUser && (
                <div style={{ textAlign: "right" }}>
                  <Text size={300} style={{ color: "#605e5c" }}>Your Share</Text>
                  <Text size={500} weight="bold" style={{ color: "#107c10" }}>
                    ${calculateIndividualCost(currentUser).toFixed(2)}
                  </Text>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}