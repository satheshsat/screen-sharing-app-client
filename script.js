$(document).ready(function () {
  const socket = io('ws://localhost:3000');
  const startBtn = $('#startBtn');
  const screenVideo = $('#screenVideo')[0];
  const shareVideo = $('#shareVideo')[0];
  let mediaRecorder = null;
  let stream = null;

  startBtn.click(function () {
    // Start or restart screen sharing
    startScreenSharing();
  });

  async function startScreenSharing() {
    try {
      // Stop the previous stream and mediaRecorder if they exist
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }

      if (stream) {
        // Stop previous stream tracks
        stream.getTracks().forEach(track => track.stop());
      }

      // Request screen sharing stream
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Display the screen on the video element
      screenVideo.srcObject = stream;

      // Handle stream ending
      stream.getVideoTracks()[0].onended = function () {
        alert('Screen sharing stopped');
      };

      // Create a new media recorder for this stream
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

      mediaRecorder.ondataavailable = function (event) {
        if (event.data && event.data instanceof Blob && event.data.size > 0) {
          console.log('Blob is valid');
          // Emit the screen data (Blob) to the server via socket
          socket.emit('share-screen', event.data);
        } else {
          console.warn('No valid data available or incorrect format.');
        }
      };

      // Start recording
      mediaRecorder.start(1000); // Send video data every 1000 ms

    } catch (err) {
      console.error('Error sharing screen: ', err);
      alert('Failed to start screen sharing. Please check your browser permissions.');
    }
  }

  // Listen for the screen stream from other users
  socket.on('screen-stream', (data) => {
    console.log('Received screen stream data:', data);

    // If the data is an ArrayBuffer, convert it to a Blob
    if (data instanceof ArrayBuffer) {
      console.log('Converting ArrayBuffer to Blob');
      const blob = new Blob([data], { type: 'video/webm' });
      console.log('Blob MIME type:', blob.type);

      if (shareVideo) {
        shareVideo.src = URL.createObjectURL(blob);  // Create an object URL for the Blob
        shareVideo.play()
          .then(() => {
            console.log('Video is now playing');
          })
          .catch((error) => {
            console.error('Error playing video:', error);
          });
      } else {
        console.error('Video element is not available.');
      }
    } else {
      console.error('Received data is not an ArrayBuffer:', data);
    }
  });

  // Handle socket error events
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  socket.on('connect_timeout', () => {
    console.warn('Socket connection timed out');
  });
});
