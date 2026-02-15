import * as Tone from "tone";
import toWav from "audiobuffer-to-wav";
import { importantFrequencyObjects, Root, highlightCells } from "./models";

// util function to calculate the initial GAIN level for a tone based on its frequency (kind of low-pass)
// uses a formula: gain = 1/(2^x)
// where x is adjusted from frequency such that 40 to 800 has a range of 0 to 7.6
function calculateGain(frequency) {
  let exponent = (frequency - 40) / 100;
  if (exponent < 0) {
    exponent = 0;
  }
  let multiplier = 1 / Math.pow(2, exponent);
  return multiplier * 0.7;
}

/**
 * The main Frequency player to which playable octaves of harmonics can be added (see models.js).
 * This player contains all the Tone.js utilities needed to play the tones, or to export the
 * tones as an audio WAV file.
 */
export class FrequencyPlayer {
  _root;
  _playing;
  _exporting;
  _tones;
  _gainValue;
  _initialized;

  // Tone.js control to be created and disposed of while playing
  _destinationGain;

  constructor() {
    this._root = new Root(importantFrequencyObjects[0].hertzValue);
    this._playing = false;
    this._exporting = false;
    this._initialized = false;
    this._gainValue = 1.0;
    this._tones = [];
  }

  get root() {
    return this._root;
  }

  get tones() {
    return this._tones;
  }

  get playing() {
    return this._playing;
  }

  get exporting() {
    return this._exporting;
  }

  get overallGain() {
    return this._gainValue;
  }

  set root(root) {
    if (this._playing) {
      this.stop();
    }
    this._root = root;
    this._tones = [];
  }

  set overallGain(overallGain) {
    this._gainValue = overallGain;
    if (this._destinationGain) {
      this._destinationGain.gain.rampTo(overallGain, 1);
    }
  }

  addHarmonicOctave(harmonicNumber, octaveNumber) {
    const harmonic = this._root.findHarmonic(harmonicNumber);
    const octave = harmonic.findPlayableOctave(octaveNumber);
    const playerTone = new PlayerTone(harmonic, octave);
    this._tones.push(playerTone);
    this._tones.sort((l, r) => l.frequency - r.frequency);
    if (this._playing) {
      playerTone.start(this._destinationGain);
    }
  }

  findHarmonicOctave(harmonicNumber, octaveNumber) {
    for (let i = 0; i < this._tones.length; i++) {
      const playerTone = this._tones[i];
      if (playerTone.harmonic.harmonicNumber === harmonicNumber && playerTone.playableOctave.octaveNumber === octaveNumber) {
        return playerTone;
      }
    }
    return undefined;
  }

  removeHarmonicOctave(harmonicNumber, octaveNumber) {
    let foundIndex = -1;
    for (let i = 0; i < this._tones.length && foundIndex < 0; i++) {
      const playerTone = this._tones[i];
      if (playerTone.harmonic.harmonicNumber === harmonicNumber && playerTone.playableOctave.octaveNumber === octaveNumber) {
        foundIndex = i;
        if (this._playing) {
          playerTone.stop();
        }
      }
    }
    this._tones.splice(foundIndex, 1);
  }

  hasFrequencyValue(frequencyValue) {
    for (let i = 0; i < this._tones.length; i++) {
      if (this._tones[i].frequency === frequencyValue) {
        return true;
      }
    }
    return false;
  }

  start(startTime = Tone.now()) {
    this.initToneJs();
    if (!this._playing) {
      if (this._tones.length > 0) {
        // initial gain of zero
        this._destinationGain = new Tone.Gain(0).toDestination();
        for (let i = 0; i < this._tones.length; i++) {
          this._tones[i].init(this._destinationGain);
          this._tones[i].start(startTime);
        }
        // ramp up the gain
        this._destinationGain.gain.rampTo(this._gainValue, 1, startTime + 0.1);
        this._playing = true;
      }
    }
  }

  stop(stopTime = Tone.now()) {
    if (this._playing) {
      // ramp down gain and stop
      this._destinationGain.gain.rampTo(0, 1, stopTime);
      for (let i = 0; i < this._tones.length; i++) {
        this._tones[i].stop(stopTime + 1);
      }

      // dispose in 1 second (after fade out)
      setTimeout(() => {
        for (let i = 0; i < this._tones.length; i++) {
          this._tones[i].dispose();
        }
        this._destinationGain.dispose();
        this._destinationGain = undefined;
        this._playing = false;
      }, 1000);
    }
  }

  exportToWav(window, duration) {
    if (!this._playing && !this._exporting) {
      this.initToneJs();
      this._exporting = true;
      window.document.body.style.cursor = "wait";

      Tone.Offline(
        () => this.start(0),
        duration
      ).then(buffer => {
        const wavArrayBuffer = toWav(buffer);
        const blob = new Blob([wavArrayBuffer], {type: 'audio/wav'});
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.download = 'tone-export.wav';
        anchor.href = url;
        anchor.click();
        URL.revokeObjectURL(url);
      }).then(() => {
        this.stop(duration);
        this._exporting = false;
        window.document.body.style.cursor = "auto";
      });
    } else {
      window.alert("Can't export while currently playing or exporting. Press stop first, or wait for the last export to finish.");
    }
  }

  initToneJs() {
    if (!this._initialized) {
      Tone.start()
        .then(_ => {
          console.log("Tone.js has started");
          Tone.getTransport().start();
        })
        .catch(e => console.error("Tone.js failed to start", e));
    }
  }

  renderPlayerTableBodyInnerHtml() {
    if (this._tones.length > 0) {
      let html = "";
      for (let i = 0; i < this._tones.length; i++) {
        highlightCells(this._tones[i].harmonic.harmonicNumber, this._tones[i].playableOctave.octaveNumber, "#a3e8a2");
        html += `<tr>${this._tones[i].renderRowInnerHtml()}</tr>`;
      }
      return html;
    } else {
      return `<tr><td colspan="9"><br/>No tones selected. Please add one or more from the table below.<br/><br/></td></tr>`;
    }
  }
}

/**
 * This is one particular tone contained within the Player above, and it contains the
 * Tone.js nodes (oscillator, pan, gain) for this tone.
 */
export class PlayerTone {
  _harmonic;
  _playableOctave;
  _gainValue;
  _panValue;

  // Tone.js controls, created on demand when started, and disposed when stopped
  _gain;
  _panner;
  _oscillator;

  constructor(harmonic, playableOctave) {
    this._harmonic = harmonic;
    this._playableOctave = playableOctave;
    this._gainValue = calculateGain(playableOctave.octaveHertzValue);
    this._panValue = 0.0;
  }

  get harmonic() {
    return this._harmonic;
  }

  get playableOctave() {
    return this._playableOctave;
  }

  get gain() {
    return this._gainValue;
  }

  get pan() {
    return this._panValue;
  }

  get frequency() {
    return this._playableOctave.octaveHertzValue;
  }

  set gain(gain) {
    this._gainValue = gain;
    if (this._gain) {
      this._gain.gain.rampTo(gain, 1);
    }
  }

  set pan(pan) {
    this._panValue = pan;
    if (this._panner) {
      this._panner.pan.rampTo(pan, 1);
    }
  }

  start(startTime = Tone.now()) {
    if (!this._oscillator) {
      throw new Error('Tone not properly initialized');
    }
    this._oscillator.start(startTime);
  }

  stop(stopTime = Tone.now()) {
    if (!this._oscillator) {
      throw new Error('Tone not properly initialized');
    }
    this._oscillator.stop(stopTime);
  }

  init(destinationGain) {
    if (!this._oscillator) {
      this._gain = new Tone.Gain(this._gainValue).connect(destinationGain);
      this._panner = new Tone.Panner(this._panValue).connect(this._gain);
      this._oscillator = new Tone.Oscillator().connect(this._panner);
      this._oscillator.frequency.value = this._playableOctave.octaveHertzValue;
    }
  }

  dispose() {
    if (this._oscillator) {
      this._oscillator.dispose();
      this._oscillator = undefined;
      this._panner.dispose();
      this._panner = undefined;
      this._gain.dispose();
      this._gain = undefined;
    }
  }

  renderRowInnerHtml() {
    let html = "";

    html += `<td>${this.harmonic.harmonicNumber}</td>`;
    html += `<td>${this.playableOctave.octaveNumber}</td>`;

    // frequency column
    html += `<td>${Number(this.frequency.toFixed(9))} Hz</td>`;

    // meaning column
    let meanings = this._harmonic.findMatchingImportantFrequencies();
    if (meanings && meanings.length > 0) {
      html += '<td>';
      for (let i = 0; i < meanings.length; i++) {
        if (i > 0) {
          html += '<br/>';
        }
        html += meanings[i].renderSpanHtml();
      }
      html += '</td>';
    } else {
      html += '<td></td>';
    }

    // note and color columns
    html += `<td>${this._harmonic.asFrequency().renderNoteHtml()}</td>`;
    html += `<td style="background-color:${this._harmonic.asFrequency().hexColor}">&nbsp;</td>`;

    // pan column
    html += `<td><div style="text-wrap:nowrap;font-size:smaller;">`;
    html += `L <input type="range" `;
    html += `min="-1.0" max="1.0" step="0.25" value="${this.pan}" `;
    html += `onchange="Player.findHarmonicOctave(${this._harmonic.harmonicNumber}, ${this._playableOctave.octaveNumber}).pan = this.value" `;
    html += `/> R</div></td>`;

    // gain column
    html += `<td><div style="text-wrap:nowrap;">`;
    html += `- <input type="range" `;
    html += `min="0.0" max="1.0" step="0.01" value="${this.gain}" `;
    html += `onchange="Player.findHarmonicOctave(${this._harmonic.harmonicNumber}, ${this._playableOctave.octaveNumber}).gain = this.value" `;
    html += `/> +</div></td>`;

    // remove column
    html += `<td><a href="javascript:void(0)" `
    html += `onclick="Player.removeHarmonicOctave(${this._harmonic.harmonicNumber}, ${this._playableOctave.octaveNumber});renderPlayer()">❌</a></td>`;

    return html;
  }
}

export const Player = new FrequencyPlayer();
