import { Server } from 'socket.io';
import { createServer } from 'http';

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const meetings = {};

io.on('connection', (socket) => {
  socket.on('join-meeting', (data) => {
    const { meetingId, userId, userName } = data;
    
    socket.join(meetingId);
    
    if (!meetings[meetingId]) {
      meetings[meetingId] = {
        meetingId,
        participants: [],
        scheduledDuration: 60,
        hostId: userId
      };
    }
    
    const isHost = meetings[meetingId].hostId === userId;
    
    const existingParticipant = meetings[meetingId].participants.find(p => p.id === userId);
    if (!existingParticipant) {
      meetings[meetingId].participants.push({
        id: userId,
        name: userName,
        hourlyRate: 0
      });
    }
    
    socket.emit('meeting-data', {
      ...meetings[meetingId],
      userIsHost: isHost
    });
    
    socket.to(meetingId).emit('user-joined', { userId, userName });
  });

  socket.on('update-hourly-rate', (data) => {
    const { meetingId, userId, userName, hourlyRate } = data;

    if (meetings[meetingId]) {
      const participant = meetings[meetingId].participants.find(p => p.id === userId);
      if (participant) {
        participant.hourlyRate = hourlyRate;
      } else {
        meetings[meetingId].participants.push({
          id: userId,
          name: userName,
          hourlyRate
        });
      }

      io.to(meetingId).emit('participant-rate-updated', meetings[meetingId]);
    }
  });

  socket.on('disconnect', () => {
    // Meetings persist after disconnect to allow rejoining
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});