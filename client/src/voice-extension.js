// Voice Extension for LibreChat - Mobile Optimized
(function() {
  'use strict';

  // Configuration
  const config = {
    sampleRate: 16000,
    channels: 1,
    pushToTalkKey: ' ', // Spacebar
    continuousListeningToggleKey: 'v',
    vadThreshold: -40,
    vadDebounceMs: 1500
  };

  // Voice Manager Class
  class VoiceManager {
    constructor() {
      this.isRecording = false;
      this.isContinuousMode = false;
      this.audioContext = null;
      this.mediaStream = null;
      this.processor = null;
      this.audioChunks = [];
      
      this.initializeAudio();
      this.setupKeyboardShortcuts();
      this.injectUI();
    }

    async initializeAudio() {
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: config.channels,
            sampleRate: config.sampleRate,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext({ sampleRate: config.sampleRate });

        // iOS specific: Resume audio context
        if (this.audioContext.state === 'suspended') {
          document.addEventListener('touchstart', async () => {
            await this.audioContext.resume();
            console.log('Audio context resumed');
          }, { once: true });
        }

        console.log('Voice system initialized');
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        this.showNotification('Microphone access denied', 'error');
      }
    }

    setupKeyboardShortcuts() {
      // Push-to-talk
      document.addEventListener('keydown', (e) => {
        if (e.key === config.pushToTalkKey && !this.isRecording && !this.isContinuousMode) {
          e.preventDefault();
          this.startRecording();
        }
      });

      document.addEventListener('keyup', (e) => {
        if (e.key === config.pushToTalkKey && this.isRecording && !this.isContinuousMode) {
          e.preventDefault();
          this.stopRecording();
        }
      });

      // Toggle continuous listening
      document.addEventListener('keypress', (e) => {
        if (e.key === config.continuousListeningToggleKey) {
          e.preventDefault();
          this.toggleContinuousListening();
        }
      });
    }

    injectUI() {
      // Create voice button for mobile
      const voiceButton = document.createElement('div');
      voiceButton.id = 'voice-button';
      voiceButton.innerHTML = `
        <button class="voice-btn" id="voice-ptt">
          <span class="voice-icon">🎤</span>
        </button>
        <div class="voice-status" id="voice-status">Ready</div>
      `;
      
      // Add styles
      const styles = document.createElement('style');
      styles.textContent = `
        #voice-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .voice-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(145deg, #f3f4f6, #e5e7eb);
          border: 3px solid #e5e7eb;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .voice-btn:active,
        .voice-btn.recording {
          transform: scale(0.95);
          background: #ef4444;
          border-color: #dc2626;
        }

        .voice-btn.recording {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); 
          }
          50% { 
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); 
          }
        }

        .voice-icon {
          font-size: 24px;
        }

        .voice-status {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          backdrop-filter: blur(10px);
        }

        @media (max-width: 768px) {
          #voice-button {
            bottom: 70px;
            right: 10px;
          }
        }
      `;

      document.head.appendChild(styles);
      document.body.appendChild(voiceButton);

      // Attach event listeners
      const pttButton = document.getElementById('voice-ptt');
      
      // Mouse events
      pttButton.addEventListener('mousedown', () => {
        if (!this.isContinuousMode) this.startRecording();
      });

      pttButton.addEventListener('mouseup', () => {
        if (!this.isContinuousMode) this.stopRecording();
      });

      // Touch events for mobile
      pttButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!this.isContinuousMode) this.startRecording();
      });

      pttButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!this.isContinuousMode) this.stopRecording();
      });
    }

    async startRecording() {
      if (this.isRecording) return;

      this.isRecording = true;
      this.audioChunks = [];
      document.getElementById('voice-ptt').classList.add('recording');
      document.getElementById('voice-status').textContent = 'Recording...';

      try {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
          if (!this.isRecording) return;

          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32Array to Int16Array
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          this.audioChunks.push(int16Data);
        };

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);

      } catch (error) {
        console.error('Failed to start recording:', error);
        this.stopRecording();
      }
    }

    async stopRecording() {
      if (!this.isRecording) return;

      this.isRecording = false;
      document.getElementById('voice-ptt').classList.remove('recording');
      document.getElementById('voice-status').textContent = 'Processing...';

      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      // Combine audio chunks
      const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedAudio = new Int16Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      await this.processTranscription(combinedAudio);
    }

    async processTranscription(audioData) {
      try {
        const response = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: Array.from(audioData),
            sampleRate: config.sampleRate,
            channels: config.channels
          })
        });

        const result = await response.json();
        
        if (result.text) {
          // Find LibreChat's input field
          const chatInput = document.querySelector('textarea[placeholder*="Message"]') ||
                           document.querySelector('textarea[id*="message"]') ||
                           document.querySelector('textarea');
          
          if (chatInput) {
            chatInput.value = result.text;
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Auto-send if confidence is high
            if (result.confidence > 0.8) {
              const sendButton = document.querySelector('button[type="submit"]') ||
                               document.querySelector('button[aria-label*="Send"]');
              if (sendButton) {
                sendButton.click();
              }
            }
          }
        }
        
        document.getElementById('voice-status').textContent = 'Ready';
      } catch (error) {
        console.error('Transcription failed:', error);
        this.showNotification('Failed to transcribe audio', 'error');
        document.getElementById('voice-status').textContent = 'Error';
      }
    }

    toggleContinuousListening() {
      this.isContinuousMode = !this.isContinuousMode;
      
      if (this.isContinuousMode) {
        document.getElementById('voice-status').textContent = 'Listening...';
        this.startVAD();
      } else {
        document.getElementById('voice-status').textContent = 'Ready';
        this.stopVAD();
        if (this.isRecording) {
          this.stopRecording();
        }
      }
    }

    startVAD() {
      // Voice Activity Detection implementation
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 512;
      
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceTimer = null;
      
      const checkVoiceActivity = () => {
        if (!this.isContinuousMode) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        const db = 20 * Math.log10(average / 255);
        
        if (db > config.vadThreshold) {
          if (!this.isRecording) {
            this.startRecording();
          }
          
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        } else if (this.isRecording && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            this.stopRecording();
            silenceTimer = null;
          }, config.vadDebounceMs);
        }
        
        requestAnimationFrame(checkVoiceActivity);
      };
      
      checkVoiceActivity();
    }

    stopVAD() {
      // VAD cleanup handled by toggle
    }

    showNotification(message, type = 'info') {
      const status = document.getElementById('voice-status');
      status.textContent = message;
      setTimeout(() => {
        status.textContent = this.isContinuousMode ? 'Listening...' : 'Ready';
      }, 3000);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.voiceManager = new VoiceManager();
    });
  } else {
    window.voiceManager = new VoiceManager();
  }

  // Inject script loading into LibreChat
  const script = document.createElement('script');
  script.src = '/js/voice-extension.js';
  document.head.appendChild(script);

})();