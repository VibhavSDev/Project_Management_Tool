export const setupSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    socket.on('join', (userId) => socket.join(userId)); 
    socket.on('joinProject', (projectId) => socket.join(projectId));
    socket.on('leaveProject', (projectId) => socket.leave(projectId));
    socket.on('joinTask', (taskId) => socket.join(taskId));
    socket.on('leaveTask', (taskId) => socket.leave(taskId));

    socket.on('typing', ({ taskId, user }) => {
      socket.to(taskId).emit('typing', user);
    });

    socket.on('stopTyping', ({ taskId, user }) => {
      socket.to(taskId).emit('stopTyping', user);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

