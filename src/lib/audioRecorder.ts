// ==============================================================================
// ЗАПИСЬ ГОЛОСОВЫХ СООБЩЕНИЙ И ГЕНЕРАТОР ВОЛНЫ (WEB AUDIO API) ДЛЯ tobo
// Лицензия: Apache License 2.0
// ==============================================================================

export interface VoiceRecordingResult {
  blob: Blob;
  audioUrl: string;
  duration: number; // в секундах
  waveform: number[]; // массив высот от 0.1 до 1.0 (например, 24 бара)
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private liveWaveformSamples: number[] = [];

  /**
   * Начать запись голосового сообщения
   */
  async start(onWaveUpdate?: (level: number) => void): Promise<void> {
    this.audioChunks = [];
    this.liveWaveformSamples = [];

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream);

    // Инициализация Web Audio API для измерения амплитуды в реальном времени
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.analyser) return;
      this.analyser.getByteFrequencyData(dataArray);

      // Считаем среднюю громкость
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(Math.max(avg / 128, 0.1), 1.0);

      this.liveWaveformSamples.push(normalized);
      if (onWaveUpdate) {
        onWaveUpdate(normalized);
      }

      this.animationFrameId = requestAnimationFrame(checkLevel);
    };

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100);
    checkLevel();
  }

  /**
   * Завершить запись и получить аудиоданные со сжатой волной
   */
  async stop(): Promise<VoiceRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder не запущен'));
        return;
      }

      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = () => {
        const duration = Math.max(Math.round((Date.now() - this.startTime) / 1000), 1);
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(blob);

        // Формируем аккуратную волну из 24-28 столбцов для компактного отображения
        const targetBars = 26;
        const waveform: number[] = [];
        const totalSamples = this.liveWaveformSamples.length;

        if (totalSamples > 0) {
          const step = Math.max(Math.floor(totalSamples / targetBars), 1);
          for (let i = 0; i < targetBars; i++) {
            const idx = Math.min(i * step, totalSamples - 1);
            waveform.push(Math.round(this.liveWaveformSamples[idx] * 100) / 100);
          }
        } else {
          // Дефолтная приятная волна если запись была мгновенной
          for (let i = 0; i < targetBars; i++) {
            waveform.push(0.3 + Math.sin(i * 0.4) * 0.2);
          }
        }

        // Очищаем треки микрофона
        this.cleanup();

        resolve({
          blob,
          audioUrl,
          duration,
          waveform
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Отменить запись без сохранения
   */
  cancel(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
