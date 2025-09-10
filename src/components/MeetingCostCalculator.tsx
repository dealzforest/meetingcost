import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardPreview,
  Text,
  makeStyles,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    padding: "20px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  card: {
    marginBottom: "20px",
  },
  inputGroup: {
    marginBottom: "15px",
  },
  result: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#0078d4",
  },
});

interface Participant {
  name: string;
  hourlyRate: number;
}

export default function MeetingCostCalculator() {
  const styles = useStyles();
  const [participants, setParticipants] = useState<Participant[]>([
    { name: "", hourlyRate: 0 },
  ]);
  const [meetingDuration, setMeetingDuration] = useState<number>(60);

  const addParticipant = () => {
    setParticipants([...participants, { name: "", hourlyRate: 0 }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 1) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string | number) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const calculateTotalCost = (): number => {
    return participants.reduce((total, participant) => {
      return total + (participant.hourlyRate * (meetingDuration / 60));
    }, 0);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold" size={500}>Meeting Cost Calculator</Text>}
        />
        <CardPreview>
          <div className={styles.inputGroup}>
            <Label htmlFor="duration">Meeting Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={meetingDuration.toString()}
              onChange={(_, data) => setMeetingDuration(Number(data.value) || 0)}
              placeholder="60"
            />
          </div>

          <div>
            <Label>Participants</Label>
            {participants.map((participant, index) => (
              <div key={index} style={{ marginBottom: "10px", display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    placeholder="Participant name"
                    value={participant.name}
                    onChange={(_, data) => updateParticipant(index, "name", data.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Input
                    type="number"
                    placeholder="Hourly rate ($)"
                    value={participant.hourlyRate.toString()}
                    onChange={(_, data) => updateParticipant(index, "hourlyRate", Number(data.value) || 0)}
                  />
                </div>
                {participants.length > 1 && (
                  <Button
                    appearance="secondary"
                    onClick={() => removeParticipant(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              appearance="primary"
              onClick={addParticipant}
              style={{ marginTop: "10px" }}
            >
              Add Participant
            </Button>
          </div>

          <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f3f2f1", borderRadius: "4px" }}>
            <Text className={styles.result}>
              Total Meeting Cost: ${calculateTotalCost().toFixed(2)}
            </Text>
          </div>
        </CardPreview>
      </Card>
    </div>
  );
}