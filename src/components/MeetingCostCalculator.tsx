import { useState, useEffect } from "react";
import {
  Button,
  Input,
  Label,
  Text,
  makeStyles,
  Spinner,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { io, Socket } from "socket.io-client";

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

interface MeetingParticipant {
  id: string;
  name: string;
  hourlyRate: number;
}

interface MeetingData {
  meetingId: string;
  participants: MeetingParticipant[];
  scheduledDuration: number; // in minutes
}

export default function MeetingCostCalculator() {
  const styles = useStyles();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [meetingId, setMeetingId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [currentUserRate, setCurrentUserRate] = useState<number>(0);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [scheduledDuration, setScheduledDuration] = useState<number>(60);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Load user profile and meeting details from Teams context
  useEffect(() => {
    const loadUserProfile = async () => {
      console.log('[MeetingCostCalculator] Starting to load user profile and meeting details');
      try {
        await microsoftTeams.app.initialize();
        console.log('[MeetingCostCalculator] Teams SDK initialized successfully');
        
        const context = await microsoftTeams.app.getContext();
        console.log('[MeetingCostCalculator] Teams context:', context);
        const userId = context.user?.id || 'default-user';
        const userName = context.user?.displayName || context.user?.userPrincipalName || 'Unknown User';
        const meetingId = context.meeting?.id || context.chat?.id || 'demo-meeting';
        
        // Try to get meeting duration from Teams API
        let duration = 60; // Default to 1 hour
        
        try {
          microsoftTeams.meeting.getMeetingDetails((error, meetingDetails) => {
            if (error) {
              console.log('Could not fetch meeting details:', error);
              return;
            }
            
            console.log('Meeting details:', meetingDetails);
            
            if (meetingDetails?.details) {
              const details = meetingDetails.details;
              
              // Check if this is a scheduled meeting (IMeetingDetails) vs call (ICallDetails)
              if ('scheduledEndTime' in details && details.scheduledStartTime && details.scheduledEndTime) {
                const startTime = new Date(details.scheduledStartTime);
                const endTime = new Date(details.scheduledEndTime);
                const calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
                console.log(`Calculated duration: ${calculatedDuration} minutes`);
                setScheduledDuration(Math.max(calculatedDuration, 1));
              }
              else {
                console.log('This appears to be a call rather than a scheduled meeting - no duration available');
              }
            }
          });
        } catch (error) {
          console.log('Could not fetch meeting details:', error);
          // Fall back to default duration
        }
        
        setUserId(userId);
        setUserName(userName);
        setMeetingId(meetingId);
        setScheduledDuration(Math.max(duration, 1)); // Ensure minimum 1 minute
        
      } catch (error) {
        // Fallback for standalone mode
        setUserId('fallback-user');
        setUserName('Demo User');
        setMeetingId('demo-meeting');
        setScheduledDuration(60);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserProfile();
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (meetingId && userId && !socket && !isLoadingUser) {
      const socketUrl = 'http://localhost:3001';
      
      const newSocket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        timeout: 15000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        newSocket.emit('join-meeting', { 
          meetingId, 
          userId, 
          userName
        });
      });

      newSocket.on('meeting-data', (data: MeetingData) => {
        setMeetingData(data);
      });

      newSocket.on('participant-rate-updated', (data: MeetingData) => {
        setMeetingData(data);
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('WebSocket connection failed:', error.message);
      });

      setSocket(newSocket);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [meetingId, userId, userName, isLoadingUser]);

  const updateHourlyRate = () => {
    if (socket && socket.connected && currentUserRate > 0) {
      setIsConnecting(true);
      
      socket.emit('update-hourly-rate', {
        meetingId,
        userId,
        userName,
        hourlyRate: currentUserRate
      });
      
      setTimeout(() => {
        setIsConnecting(false);
      }, 1000);
    }
  };

  const calculateIndividualCost = (participant: MeetingParticipant): number => {
    return participant.hourlyRate * (scheduledDuration / 60);
  };

  const calculateTotalCost = (): number => {
    if (!meetingData) return 0;
    return meetingData.participants.reduce((total, participant) => {
      return total + calculateIndividualCost(participant);
    }, 0);
  };

  const calculateAverageCost = (): number => {
    if (!meetingData || meetingData.participants.length === 0) return 0;
    return calculateTotalCost() / meetingData.participants.length;
  };

  const getCurrentUserCost = (): number => {
    if (!meetingData) return currentUserRate * (scheduledDuration / 60);
    const currentUser = meetingData.participants.find(p => p.id === userId);
    return currentUser ? calculateIndividualCost(currentUser) : 0;
  };

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

      <div className={styles.card}>
        <Text size={500} weight="semibold" style={{ marginBottom: "16px" }}>
          Welcome, {userName}!
        </Text>
        
        <div className={styles.inputGroup} style={{ marginBottom: "16px" }}>
          <Text size={300} style={{ color: "#605e5c" }}>
            Duration: {scheduledDuration} minutes {scheduledDuration === 60 ? '(default)' : '(from Teams)'}
          </Text>
        </div>
        
        <div className={styles.inputGroup}>
          <Label htmlFor="userRate" style={{ fontWeight: "600" }}>
            Your Hourly Rate ($)
          </Label>
          <Input
            id="userRate"
            type="number"
            value={currentUserRate.toString()}
            onChange={(_, data) => setCurrentUserRate(Number(data.value) || 0)}
            placeholder="Enter your hourly rate"
          />
        </div>

        <Button
          appearance="primary"
          onClick={updateHourlyRate}
          disabled={currentUserRate <= 0 || isConnecting}
          style={{ width: "100%", marginTop: "16px" }}
        >
          {isConnecting ? "Updating..." : "Update Rate"}
        </Button>
      </div>

      <div className={styles.card}>
        <div className={styles.summary}>
          <div>
            <Text size={300} style={{ color: "#605e5c" }}>Your Meeting Cost</Text>
            <Text size={500} weight="bold" style={{ color: "#0078d4" }}>
              ${getCurrentUserCost().toFixed(2)}
            </Text>
            <Text size={200} style={{ color: "#605e5c" }}>
              ({scheduledDuration} min × ${currentUserRate || 0}/hour)
            </Text>
          </div>
        </div>
      </div>

      {meetingData && meetingData.participants.length > 0 && (
        <div className={styles.card}>
          <Text size={500} weight="semibold" style={{ marginBottom: "16px" }}>
            Meeting Participants ({meetingData.participants.length})
          </Text>
          
          {meetingData.participants.map((participant) => (
            <div key={participant.id} className={styles.participant}>
              <div>
                <Text weight="semibold">{participant.name}</Text>
                <div>
                  <Text size={300} style={{ color: "#605e5c" }}>
                    {participant.hourlyRate > 0 ? "Rate set" : "Rate pending"}
                  </Text>
                </div>
              </div>
              <Text size={300} style={{ color: "#605e5c" }}>
                {participant.hourlyRate > 0 ? "✓ Configured" : "⏳ Pending"}
              </Text>
            </div>
          ))}
          
          <div className={styles.summary} style={{ marginTop: "16px" }}>
            <div>
              <Text size={300} style={{ color: "#605e5c" }}>Total Meeting Cost</Text>
              <Text size={500} weight="bold" style={{ color: "#d13438" }}>
                ${calculateTotalCost().toFixed(2)}
              </Text>
              <Text size={200} style={{ color: "#605e5c" }}>
                ({meetingData.participants.length} participants × {scheduledDuration} min)
              </Text>
            </div>
          </div>
          
          <div className={styles.summary} style={{ marginTop: "8px" }}>
            <div>
              <Text size={300} style={{ color: "#605e5c" }}>Average Cost per Participant</Text>
              <Text size={500} weight="bold" style={{ color: "#0078d4" }}>
                ${calculateAverageCost().toFixed(2)}
              </Text>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}