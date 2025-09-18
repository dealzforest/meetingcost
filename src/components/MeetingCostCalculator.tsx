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
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  participantItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px",
    border: "1px solid #e1dfdd",
    borderRadius: "4px",
    marginBottom: "8px",
  },
  participant: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#0078d4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
  },
  name: {
    fontWeight: "500",
  },
  rate: {
    color: "#666",
    fontSize: "14px",
  },
  costInfo: {
    textAlign: "right",
  },
  total: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#0078d4",
  },
  totalCost: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#0078d4",
    textAlign: "center",
    marginTop: "16px",
  },
  status: {
    textAlign: "center",
    marginTop: "16px",
    color: "#666",
  },
});

interface Participant {
  id: string;
  name: string;
  hourlyRate: number;
  isConnected: boolean;
}

interface MeetingData {
  participants: Participant[];
  totalCost: number;
  duration: number;
}

const MeetingCostCalculator = () => {
  const styles = useStyles();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [meetingId, setMeetingId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [currentUserRate, setCurrentUserRate] = useState<number>(20);
  const [meetingData, setMeetingData] = useState<MeetingData>({ participants: [], totalCost: 0, duration: 0 });
  const [scheduledDuration, setScheduledDuration] = useState<number>(60);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Load user profile and meeting details from Teams context
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        await microsoftTeams.app.initialize();
        
        const context = await microsoftTeams.app.getContext();
        const userId = context.user?.id || 'default-user';
        const userName = context.user?.displayName || context.user?.userPrincipalName || 'Unknown User';
        const meetingId = context.meeting?.id || context.chat?.id || 'demo-meeting';
        console.log('[MeetingCostCalculator] Full app object:', context.app);
        console.log('[MeetingCostCalculator] Installation context:', {
          meetingId: context.meeting?.id,
          chatId: context.chat?.id,
          teamId: context.team?.internalId,
          frameContext: context.page?.frameContext,
          isInMeeting: context.meeting ? true : false,
          appId: context.app?.host?.name
        });

        // Try to get meeting duration from Teams API
        try {
          // Try getMeetingDetails API for automatic duration detection
          microsoftTeams.meeting.getMeetingDetails((error, meetingDetailsResponse) => {
            if (error) {
              console.log('[MeetingCostCalculator] getMeetingDetails failed:', error);
              if (error.errorCode === 1000) {
                console.log('[MeetingCostCalculator] Permission denied - using manual duration input');
              }
            } else if (meetingDetailsResponse?.details && 'scheduledEndTime' in meetingDetailsResponse.details) {
              const startTime = new Date(meetingDetailsResponse.details.scheduledStartTime);
              const endTime = new Date(meetingDetailsResponse.details.scheduledEndTime);
              const calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
              console.log(`[MeetingCostCalculator] Auto-detected duration: ${calculatedDuration} minutes`);
              setScheduledDuration(Math.max(calculatedDuration, 1));
            }
          });
        } catch (error) {
          console.log('[MeetingCostCalculator] Exception calling getMeetingDetails:', error);
        }
        
        setUserId(userId);
        setUserName(userName);
        setMeetingId(meetingId);
        setScheduledDuration(Math.max(scheduledDuration, 1)); // Ensure minimum 1 minute
        
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

      setSocket(newSocket);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [meetingId, userId, userName, isLoadingUser]);

  const updateHourlyRate = () => {
    if (socket && socket.connected) {
      socket.emit('update-hourly-rate', currentUserRate);
      setIsConnecting(false);
      
      socket.emit('join-meeting', {
        meetingId,
        userId,
        userName,
        hourlyRate: currentUserRate
      });
    } else {
      setIsConnecting(true);
    }
  };

  const calculateTotalCost = () => {
    return meetingData.participants
      ? meetingData.participants.reduce((total, participant) => total + (participant.hourlyRate / 60) * scheduledDuration, 0)
      : 0;
  };

  const calculateAverageCost = () => {
    if (!meetingData.participants || meetingData.participants.length === 0) return 0;
    return meetingData.participants.reduce((total, participant) => total + participant.hourlyRate, 0) / meetingData.participants.length;
  };

  const getCurrentUserCost = () => {
    if (!meetingData.participants) return currentUserRate * scheduledDuration / 60;
    const currentUser = meetingData.participants.find(p => p.id === userId);
    return currentUser ? currentUser.hourlyRate * scheduledDuration / 60 : 0;
  };

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spinner size="large" />
            <Text style={{ display: 'block', marginTop: '16px' }}>
              Loading meeting details...
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text size={900} weight="bold">Meeting Cost Tracker</Text>
        <Text style={{ display: 'block', marginTop: '8px', color: '#666' }}>
          Track the cost of your meeting in real-time
        </Text>
      </div>

      <div className={styles.card}>
        <div className={styles.inputGroup}>
          <Label htmlFor="user-name">Your Name</Label>
          <Input
            id="user-name"
            value={userName}
            readOnly
            style={{ backgroundColor: '#f5f5f5' }}
          />
        </div>

        <div className={styles.inputGroup}>
          <Label htmlFor="hourly-rate">Your Hourly Rate ($)</Label>
          <Input
            id="hourly-rate"
            type="number"
            value={currentUserRate.toString()}
            onChange={(e) => setCurrentUserRate(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className={styles.inputGroup}>
          <Label htmlFor="meeting-duration">Meeting Duration (minutes)</Label>
          <Input
            id="meeting-duration"
            type="number"
            value={scheduledDuration.toString()}
            onChange={(e) => setScheduledDuration(Math.max(parseInt(e.target.value) || 1, 1))}
          />
        </div>

        <Button
          appearance="primary"
          onClick={updateHourlyRate}
          disabled={isConnecting}
          style={{ width: '100%', marginTop: '16px' }}
        >
          {isConnecting ? 'Connecting...' : 'Update Rate & Join Meeting'}
        </Button>
      </div>

      <div className={styles.card}>
        <Text size={600} weight="semibold" style={{ marginBottom: '16px' }}>
          Meeting Participants
        </Text>
        
        {meetingData.participants && meetingData.participants.length > 0 ? (
          meetingData.participants.map((participant) => (
            <div key={participant.id} className={styles.participantItem}>
              <div className={styles.participant}>
                <div className={styles.avatar}>
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className={styles.name}>{participant.name}</div>
                  <div className={styles.rate}>
                    ${participant.hourlyRate}/hour
                    {participant.isConnected && (
                      <span style={{ color: '#10b26c', marginLeft: '8px' }}>● Online</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.costInfo}>
                <div className={styles.total}>
                  ${((participant.hourlyRate / 60) * scheduledDuration).toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {scheduledDuration} min
                </div>
              </div>
            </div>
          ))
        ) : (
          <Text style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            No participants yet. Click "Update Rate & Join Meeting" to join.
          </Text>
        )}
      </div>

      <div className={styles.card}>
        <Text size={600} weight="semibold" style={{ marginBottom: '16px' }}>
          Cost Summary
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text>Your Cost:</Text>
          <Text weight="semibold">${getCurrentUserCost().toFixed(2)}</Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <Text>Average Rate:</Text>
          <Text weight="semibold">${calculateAverageCost().toFixed(2)}/hour</Text>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <Text>Total Participants:</Text>
          <Text weight="semibold">{meetingData.participants?.length || 0}</Text>
        </div>
        
        <div className={styles.totalCost}>
          Total Meeting Cost: ${calculateTotalCost().toFixed(2)}
        </div>
      </div>

      <div className={styles.status}>
        <Text size={200} style={{ color: '#666' }}>
          {socket?.connected 
            ? `Connected to meeting` 
            : 'Disconnected - Click "Update Rate & Join Meeting" to reconnect'
          }
        </Text>
      </div>
    </div>
  );
};

export default MeetingCostCalculator;