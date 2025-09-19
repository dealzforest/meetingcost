import { useState, useEffect } from "react";
import {
  Input,
  Label,
  Text,
  makeStyles,
  Spinner,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import meetingService from '../services/meetingService';

const useStyles = makeStyles({
  container: {
    padding: "16px",
    maxWidth: "600px",
    margin: "0 auto",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  card: {
    marginBottom: "16px",
    padding: "20px",
    border: "1px solid #e1dfdd",
    borderRadius: "8px",
    backgroundColor: "white",
  },
  blueCard: {
    marginBottom: "16px",
    padding: "20px",
    border: "3px solid #0078d4",
    borderRadius: "12px",
    backgroundColor: "white",
  },
  header: {
    marginBottom: "24px",
    color: "#323130",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: "8px",
  },
  headerTitle: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#323130",
    lineHeight: "1.2",
  },
  headerSubtitle: {
    fontSize: "16px",
    color: "#605e5c",
    fontWeight: "400",
    lineHeight: "1.2",
  },
  inputGroup: {
    marginBottom: "20px",
  },
  inputLabel: {
    fontWeight: "600",
    marginBottom: "8px",
    display: "block",
    color: "#323130",
  },
  fullWidthInput: {
    width: "100%",
  },
  nameInput: {
    width: "100%",
    "& input": {
      color: "#323130 !important",
      fontWeight: "500",
    },
  },
  costItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f3f2f1",
  },
  costItemLast: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
  },
  button: {
    width: "100%",
    backgroundColor: "#6264a7",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "16px",
  },
  participant: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    marginBottom: "12px",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e1dfdd",
  },
  participantAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#0078d4",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "600",
    marginRight: "12px",
  },
  participantInfo: {
    flex: 1,
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
}

const MeetingCostCalculator = () => {
  const styles = useStyles();
  const [meetingId, setMeetingId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [currentUserRate, setCurrentUserRate] = useState<number>(0);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const context = await microsoftTeams.app.getContext();
        const userId = context.user?.id || 'default-user';
        const userName = context.user?.displayName || context.user?.userPrincipalName || 'Unknown User';
        const meetingId = context.meeting?.id || context.chat?.id || 'demo-meeting';
        
        setUserId(userId);
        setUserName(userName);
        setMeetingId(meetingId);
        
      } catch (error) {
        setUserId('fallback-user');
        setUserName('Demo User');
        setMeetingId('demo-meeting');
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserProfile();
  }, []);

  useEffect(() => {
    if (meetingId && userId && !isLoadingUser) {
      const initializeMeeting = async () => {
        try {
          const data = await meetingService.joinMeeting(meetingId, userId, userName);
          setMeetingData(data);
          
          // Start polling for real-time updates
          meetingService.startPolling(meetingId, (updatedData) => {
            setMeetingData(updatedData);
          });
        } catch (error) {
          console.error('Failed to join meeting:', error);
        }
      };
      
      initializeMeeting();
    }

    return () => {
      meetingService.stopPolling();
    };
  }, [meetingId, userId, userName, isLoadingUser]);

  // Sync local rate with backend data when meeting data updates
  useEffect(() => {
    if (meetingData && userId) {
      const backendRate = meetingData.participants.find(p => p.id === userId)?.hourlyRate;
      if (backendRate && backendRate > 0 && currentUserRate === 0) {
        setCurrentUserRate(backendRate);
      }
    }
  }, [meetingData, userId, currentUserRate]);

  const updateHourlyRate = async () => {
    if (currentUserRate > 0) {
      setIsConnecting(true);
      
      try {
        const data = await meetingService.updateHourlyRate(
          meetingId,
          userId,
          userName,
          currentUserRate
        );
        setMeetingData(data);
      } catch (error) {
        console.error('Failed to update hourly rate:', error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const calculateCost = (minutes: number): number => {
    const rate = meetingData?.participants.find(p => p.id === userId)?.hourlyRate || currentUserRate;
    return rate * (minutes / 60);
  };


  const getTotalCost = (minutes: number): number => {
    if (!meetingData || meetingData.participants.length === 0) return 0;
    const totalRate = meetingData.participants.reduce((sum, p) => sum + p.hourlyRate, 0);
    return totalRate * (minutes / 60);
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
        <span className={styles.headerTitle}>Meeting Cost Tracker</span>
        <span className={styles.headerSubtitle}>Track the cost of your meeting in real-time</span>
      </div>

      <div className={styles.card}>
        <div className={styles.inputGroup}>
          <Label htmlFor="userName" className={styles.inputLabel}>
            Your Name
          </Label>
          <Input
            id="userName"
            value={userName}
            disabled
            className={styles.nameInput}
          />
        </div>
        
        <div className={styles.inputGroup}>
          <Label htmlFor="userRate" className={styles.inputLabel}>
            Your Hourly Rate ($)
          </Label>
          <Input
            id="hourly-rate"
            type="number"
            value={currentUserRate.toString()}
            onChange={(_, data) => setCurrentUserRate(Number(data.value) || 0)}
            placeholder="Enter your hourly rate"
            className={styles.fullWidthInput}
          />
        </div>

        <button
          className={styles.button}
          onClick={updateHourlyRate}
          disabled={currentUserRate <= 0 || isConnecting}
        >
          {isConnecting ? "Updating..." : "Update Rate & Start Tracking"}
        </button>
      </div>


      {meetingData && meetingData.participants.length > 0 && (
        <div className={styles.card}>
          <Text size={600} weight="bold" style={{ marginBottom: "20px", color: "#323130" }}>
            Meeting Participants
          </Text>
          
          {meetingData.participants.map((participant) => (
            <div key={participant.id} className={styles.participant}>
              <div className={styles.participantAvatar}>
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.participantInfo}>
                <Text size={400} weight="semibold" style={{ color: "#323130" }}>
                  {participant.name}
                </Text>
              </div>
              <Text size={300} style={{ color: "#605e5c" }}>
                Joined
              </Text>
            </div>
          ))}
        </div>
      )}

      {meetingData && meetingData.participants.length > 0 && (
        <div className={styles.card}>
          <Text size={600} weight="bold" style={{ marginBottom: "20px", color: "#323130" }}>
            Your Cost Summary
          </Text>
          
          <div className={styles.summaryRow}>
            <Text size={400} style={{ color: "#323130" }}>30 Minutes:</Text>
            <Text size={400} weight="bold" style={{ color: "#323130" }}>
              ${calculateCost(30).toFixed(2)}
            </Text>
          </div>
          
          <div className={styles.summaryRow}>
            <Text size={400} style={{ color: "#323130" }}>1 Hour:</Text>
            <Text size={400} weight="bold" style={{ color: "#323130" }}>
              ${calculateCost(60).toFixed(2)}
            </Text>
          </div>
          
          <div className={styles.summaryRow}>
            <Text size={400} style={{ color: "#323130" }}>Total Meeting Cost (30 min):</Text>
            <Text size={400} weight="bold" style={{ color: "#323130" }}>
              ${getTotalCost(30).toFixed(2)}
            </Text>
          </div>
          
          <div className={styles.summaryRow}>
            <Text size={400} style={{ color: "#323130" }}>Total Meeting Cost (1 hour):</Text>
            <Text size={400} weight="bold" style={{ color: "#323130" }}>
              ${getTotalCost(60).toFixed(2)}
            </Text>
          </div>
          
          <div className={styles.summaryRow}>
            <Text size={400} style={{ color: "#323130" }}>Total Participants:</Text>
            <Text size={400} weight="bold" style={{ color: "#323130" }}>
              {meetingData.participants.length}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingCostCalculator;