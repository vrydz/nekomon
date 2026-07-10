const noteFrequency = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
};

const melody = [
  ["C5", 0, 0.18],
  ["E5", 0.22, 0.18],
  ["G5", 0.44, 0.2],
  ["E5", 0.72, 0.16],
  ["A5", 1, 0.18],
  ["G5", 1.24, 0.22],
  ["E5", 1.56, 0.16],
  ["C6", 1.82, 0.22],
  ["A5", 2.14, 0.18],
  ["G5", 2.4, 0.18],
  ["D5", 2.68, 0.18],
  ["E5", 3, 0.28],
];

function createGain(audio, value) {
  const gain = audio.createGain();
  gain.gain.value = value;
  return gain;
}

function scheduleTone(audio, destination, frequency, start, duration, options = {}) {
  const osc = audio.createOscillator();
  const gain = createGain(audio, 0.0001);
  const now = audio.currentTime;
  const startsAt = now + start;
  const endsAt = startsAt + duration;
  const volume = options.volume ?? 0.18;

  osc.type = options.type ?? "triangle";
  osc.frequency.setValueAtTime(frequency, startsAt);
  if (options.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(options.slideTo, endsAt);
  }

  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);

  osc.connect(gain);
  gain.connect(destination);
  osc.start(startsAt);
  osc.stop(endsAt + 0.04);
}

export function createCatAudio({ muted = false } = {}) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return {
      startMusic() {},
      stopMusic() {},
      play() {},
      setMuted() {},
      destroy() {},
    };
  }

  const audio = new AudioContext();
  const masterGain = createGain(audio, muted ? 0 : 0.8);
  const musicGain = createGain(audio, 0.2);
  const sfxGain = createGain(audio, 0.42);
  let musicTimer = null;
  let isMuted = muted;

  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audio.destination);

  const scheduleMelody = () => {
    melody.forEach(([note, offset, duration]) => {
      scheduleTone(audio, musicGain, noteFrequency[note], offset, duration, {
        type: "triangle",
        volume: 0.11,
      });
    });
  };

  const startMusic = async () => {
    if (isMuted) return;
    if (audio.state === "suspended") await audio.resume();
    if (musicTimer) return;
    scheduleMelody();
    musicTimer = window.setInterval(scheduleMelody, 3600);
  };

  const stopMusic = () => {
    if (!musicTimer) return;
    window.clearInterval(musicTimer);
    musicTimer = null;
  };

  const play = async (effect) => {
    if (isMuted) return;
    if (audio.state === "suspended") await audio.resume();

    if (effect === "start") {
      scheduleTone(audio, sfxGain, noteFrequency.E5, 0, 0.08, { volume: 0.22 });
      scheduleTone(audio, sfxGain, noteFrequency.G5, 0.08, 0.1, { volume: 0.24 });
      return;
    }

    if (effect === "shutter") {
      scheduleTone(audio, sfxGain, 260, 0, 0.035, { type: "square", volume: 0.2, slideTo: 130 });
      scheduleTone(audio, sfxGain, 900, 0.035, 0.055, { type: "triangle", volume: 0.2, slideTo: 520 });
      return;
    }

    if (effect === "success") {
      scheduleTone(audio, sfxGain, noteFrequency.C5, 0, 0.12, { volume: 0.22 });
      scheduleTone(audio, sfxGain, noteFrequency.E5, 0.11, 0.12, { volume: 0.24 });
      scheduleTone(audio, sfxGain, noteFrequency.G5, 0.22, 0.14, { volume: 0.25 });
      scheduleTone(audio, sfxGain, noteFrequency.C6, 0.38, 0.18, { volume: 0.23 });
      return;
    }

    if (effect === "fail") {
      scheduleTone(audio, sfxGain, 392, 0, 0.14, { type: "sine", volume: 0.2, slideTo: 330 });
      scheduleTone(audio, sfxGain, 294, 0.18, 0.18, { type: "sine", volume: 0.18, slideTo: 247 });
      return;
    }

    scheduleTone(audio, sfxGain, noteFrequency.C5, 0, 0.06, { volume: 0.12 });
  };

  const setMuted = (nextMuted) => {
    isMuted = nextMuted;
    masterGain.gain.setTargetAtTime(nextMuted ? 0 : 0.8, audio.currentTime, 0.03);
    if (nextMuted) stopMusic();
    else startMusic();
  };

  return {
    startMusic,
    stopMusic,
    play,
    setMuted,
    destroy() {
      stopMusic();
      audio.close();
    },
  };
}
