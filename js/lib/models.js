import { Tuning } from "./tuning";
import { convertBaseFrequencyToColor } from "./colors";
import { importantFrequencies } from "./constants";

/**
 * Result of matching frequency evaluation, comparing two frequencies
 */
export class EvaluationResult {
  frequency;
  ratio;
  perfect;

  constructor(frequency, ratio = 0.0, perfect = false) {
    this.frequency = frequency;
    this.ratio = ratio;
    this.perfect = perfect;
  }

  get matchPercentage() {
    return (this.ratio - 1.0) * 100;
  }

  renderSpanHtml() {
    let color = "#a60f0f";
    let weight = "normal";
    let text = "";
    if (this.perfect) {
      text = 'perfect';
      color = "green";
      weight = "bold";
    } else {
      const num = Number(this.matchPercentage.toFixed(3));
      if (num < 0.1) {
        color = "green";
      } else if (num < 0.2) {
        color = "#83af2b";
      } else if (num < 0.5) {
        color = "#bfbf02";
      } else if (num < 1.0) {
        color = "#d67b04";
      }
      if (num === 0.0) {
        text = "~perfect";
        weight = "bold";
      } else {
        text = (num > 0.0 ? "+" : "") + num.toFixed(3) + "%";
      }
    }

    let spanHtml = `<span style="cursor:help" title="${this.frequency.category} - ${this.frequency.type}">`;
    spanHtml += this.frequency.emojis;
    spanHtml += ` <span style="font-size:smaller;font-weight:${weight};color:${color}">(${text})</span>`;
    spanHtml += '</span>';
    return spanHtml;
  }

  compareTo(other) {
    if (this.perfect && !other.perfect) {
      return -1;
    } else if (!this.perfect && other.perfect) {
      return 1;
    } else {
      const thisAbs = Math.abs(this.ratio - 1.0);
      const otherAbs = Math.abs(other.ratio - 1.0);
      return thisAbs - otherAbs;
    }
  }
}

/**
 * Base class for a frequency, including its octaves.
 */
export class Frequency {
  _hertzValue;

  constructor(hertzValue) {
    this._hertzValue = hertzValue;
  }

  get hertzValue() {
    return this._hertzValue;
  }

  set hertzValue(hertzValue) {
    this._hertzValue = hertzValue;
  }

  get hexColor() {
    return convertBaseFrequencyToColor(this._hertzValue);
  }

  get note() {
    return Tuning.determineNote(this._hertzValue);
  }

  renderNoteHtml() {
    const note = this.note;
    if (!note || !note.note || note.note === "unknown") {
      return '<span style="font-size: smaller">(out of range)</span>';
    }

    let noteText = note.note;
    let color = "auto";
    let weight = "normal"

    if (!noteText.includes('♯') && !noteText.includes('♭')) {
      noteText += ' ';
    }
    noteText += note.octave;

    if (note.cents !== Infinity) {
      let centsValue = "";

      if (note.cents === 0) {
        centsValue = "(perfect)";
        color = "green"
        weight = "bold";
      } else {
        centsValue = "(";
        if (note.cents > 0) {
          centsValue += "+";
        } else if (note.cents < 0) {
          centsValue += "-";
        }

        let absv = Math.abs(note.cents);
        if (absv < 1.5) {
          color = "green";
        } else if (absv < 5) {
          color = "#83af2b";
        } else if (absv < 10) {
          color = "#bfbf02";
        } else if (absv < 20) {
          color = "#d67b04";
        } else {
          color = "#a60f0f";
        }

        centsValue += absv + "¢)";
      }

      noteText += ` <span style="font-size:smaller">${centsValue}`;
      if (note.interval) {
        noteText += `<br/>(${note.interval})`;
      }
      noteText += '</span>';
    }

    return `<span style="color:${color};font-weight:${weight}">${noteText}</span>`;
  }

  octavesAboveInHertz(octaveCount = 8, inclusive = true) {
    let r = [];
    for (let i = inclusive ? 0 : 1; i < octaveCount; i++) {
      r.push(this._hertzValue * Math.pow(2, i));
    }
    return r;
  }

  octavesBelowInHertz(octaveCount = 8, inclusive = true) {
    let r = [];
    for (let i = inclusive ? 0 : 1; i < octaveCount; i++) {
      r.push(this._hertzValue * Math.pow(2, -i));
    }
    return r;
  }

  evaluateAgainst(otherFrequency, withinPercent) {
    let minRatio = 1 - (withinPercent / 100);
    let maxRatio = 1 + (withinPercent / 100);
    let checkOctaves = otherFrequency.hertzValue <= this.hertzValue
      ? otherFrequency.octavesAboveInHertz()
      : otherFrequency.octavesBelowInHertz();
    for (let i = 0; i < checkOctaves.length; i++) {
      let ratio = checkOctaves[i] / this.hertzValue;
      if (ratio >= minRatio && ratio <= maxRatio) {
        let perfect = (ratio >= 0.999999999 && ratio <= 1.000000001);
        return new EvaluationResult(otherFrequency, ratio, perfect);
      }
    }
    //otherwise
    return undefined;
  }
}

/**
 * A subclass for an "important frequency" based on a configured list of know important frequencies.
 * Includes informational fields for display.
 */
export class ImportantFrequency extends Frequency {
  id;
  source;
  category;
  type;
  emojis;

  constructor(data) {
    super(data.value);
    this.id = data.id;
    this.type = data.type;
    this.emojis = data.emojis;
    this.category = data.category;
    this.source = data.source;
  }
}

/**
 * A playable octave frequency for a particular harmonic frequency.
 */
export class PlayableOctave {
  _harmonicHertzValue;
  _additionalHertz;
  _harmonicNumber;
  _octaveNumber;

  constructor(harmonicHertzValue, harmonicNumber, octaveNumber, additionalHertz = 0.0) {
    this._harmonicHertzValue = harmonicHertzValue;
    this._additionalHertz = additionalHertz;
    this._harmonicNumber = harmonicNumber;
    this._octaveNumber = octaveNumber;
  }

  get octaveHertzValue() {
    return this._harmonicHertzValue * Math.pow(2, this._octaveNumber - 1) + this._additionalHertz;
  }

  get harmonicHertzValue() {
    return this._harmonicHertzValue;
  }

  get harmonicNumber() {
    return this._harmonicNumber;
  }

  get octaveNumber() {
    return this._octaveNumber;
  }

  set harmonicHertzValue(harmonicHertzValue) {
    this._harmonicHertzValue = harmonicHertzValue;
  }

  set additionalHertzValue(hertzValue) {
    this._additionalHertz = hertzValue;
  }

  asFrequency() {
    return new Frequency(this.octaveHertzValue);
  }

  renderTdInnerHtml() {
    const hertz = this.octaveHertzValue;
    let html = Number(hertz.toFixed(2)).toString();
    html += ` <button onclick="Player.addHarmonicOctave(${this._harmonicNumber}, ${this._octaveNumber});renderPlayer()">+</input>`;
    return html;
  }
}

/**
 * A subclass for a harmonic of some base frequency.
 */
export class Harmonic {
  _rootHertzValue;
  _harmonicNumber;
  _playableOctaves;
  _additionalHertz;
  _meaningSensitivity = 0.5;

  constructor(rootHertzValue, harmonicNumber, octaveCount = 8, additionalHertz = 0.0) {
    this._rootHertzValue = rootHertzValue;
    this._additionalHertz = additionalHertz;
    this._harmonicNumber = harmonicNumber;
    this._playableOctaves = [];
    for (let i = 1; i <= octaveCount; i++) {
      this._playableOctaves.push(new PlayableOctave(this._harmonicNumber * this._rootHertzValue, harmonicNumber, i, additionalHertz));
    }
  }

  get rootHertzValue() {
    return this._rootHertzValue;
  }

  get harmonicNumber() {
    return this._harmonicNumber;
  }

  get harmonicHertzValue() {
    return this._harmonicNumber * this._rootHertzValue + this._additionalHertz;
  }

  get playableOctaves() {
    return this._playableOctaves;
  }

  get meaningSensitivity() {
    return this._meaningSensitivity;
  }

  set rootHertzValue(rootHertzValue) {
    this._rootHertzValue = rootHertzValue;
    for (let i = 0; i < this._playableOctaves.length; i++) {
      this._playableOctaves[i].harmonicHertzValue = this._harmonicNumber * this._rootHertzValue;
    }
  }

  set additionalHertzValue(hertzValue) {
    this._additionalHertz = hertzValue;
    for (let i = 0; i < this._playableOctaves.length; i++) {
      this._playableOctaves[i].additionalHertzValue = hertzValue;
    }
  }

  set meaningSensitivity(meaningSensitivity) {
    this._meaningSensitivity = meaningSensitivity;
  }

  findPlayableOctave(octaveNumber) {
    if (octaveNumber <= this._playableOctaves.length) {
      return this._playableOctaves[octaveNumber - 1];
    }
    return undefined;
  }

  asFrequency() {
    return new Frequency(this.harmonicHertzValue);
  }

  findMatchingImportantFrequencies() {
    let matches = [];
    let thisFrequency = this.asFrequency();
    for (let i = 0; i < importantFrequencyObjects.length; i++) {
      let result = thisFrequency.evaluateAgainst(importantFrequencyObjects[i], this._meaningSensitivity);
      if (result) {
        matches.push(result);
      }
    }
    matches.sort((l, r) => l.compareTo(r));
    return matches;
  }

  renderRowInnerHtml() {
    let html = `<td>${this._harmonicNumber}</td>`;
    html += `<td><b>${Number(this.harmonicHertzValue.toFixed(9))} Hz</b></td>`;

    let meanings = this.findMatchingImportantFrequencies();
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

    html += `<td>${this.asFrequency().renderNoteHtml()}</td>`;
    html += `<td style="background-color:${this.asFrequency().hexColor}">&nbsp;</td>`;

    console.log("Rendering " + this._playableOctaves.length + " octaves");
    for (let i = 0; i < this._playableOctaves.length; i++) {
      html += `<td class="cell" id="cell_${this._harmonicNumber}_${this._playableOctaves[i].octaveNumber}">&nbsp;${this._playableOctaves[i].renderTdInnerHtml()}</td>`;
    }

    return html;
  }
}

/**
 * The root frequency to play and build all harmonics from.
 * This class allows you to set the root frequency, which will reset all harmonic frequencies as well, but keep their state.
 */
export class Root {
  _rootHertzValue;
  _harmonics;
  _additionalHertz;
  _meaningSensitivity = 0.5;

  constructor(rootHertzValue, numberOfHarmonics = 128, additionalHertz = 0.0) {
    this._rootHertzValue = rootHertzValue;
    this._additionalHertz = additionalHertz;
    this._harmonics = [];

    for (let i = 1; i <= numberOfHarmonics; i++) {
      this._harmonics.push(new Harmonic(rootHertzValue, i, 8, additionalHertz));
    }
  }

  get rootHertzValue() {
    return this._rootHertzValue + this._additionalHertz;
  }

  get harmonics() {
    return this._harmonics;
  }

  get meaningSensitivity() {
    return this._meaningSensitivity;
  }

  set meaningSensitivity(meaningSensitivity) {
    this._meaningSensitivity = meaningSensitivity;
    for (let i = 0; i < this._harmonics.length; i++) {
      this._harmonics[i].meaningSensitivity = meaningSensitivity;
    }
  }

  set rootHertzValue(hertzValue) {
    this._rootHertzValue = hertzValue;
    for (let i = 0; i < this._harmonics.length; i++) {
      this._harmonics[i].rootHertzValue = hertzValue;
    }
  }

  set additionalHertzValue(hertzValue) {
    this._additionalHertz = hertzValue;
    for (let i = 0; i < this._harmonics.length; i++) {
      this._harmonics[i].additionalHertzValue = hertzValue;
    }
  }

  findHarmonic(harmonicNumber) {
    if (harmonicNumber <= this._harmonics.length) {
      return this._harmonics[harmonicNumber - 1];
    }
    return undefined;
  }

  asFrequency() {
    return new Frequency(this._rootHertzValue);
  }

  renderHarmonicTableBodyInnerHtml() {
    let html = "";
    for (let i = 0; i < this._harmonics.length; i++) {
      html += `<tr>${this._harmonics[i].renderRowInnerHtml()}</tr>`;
    }
    return html;
  }
}

/**
 * Utility function that can be used to highlight cells of the harmonic table
 * when a playable octave is added to the player. All cells that match the frequency
 * for the given harmonic and octave will be highlighted (e.g. if 1:3 is given,
 * then 2:2 and 4:1 will also be highlighted).
 * @param harmonicNumber The harmonic number
 * @param octaveNumber The octave number
 * @param color The color to use (name or hex).
 */
export function highlightCells(harmonicNumber, octaveNumber, color) {
  // find higher harmonics in lower octaves
  for (let i = octaveNumber; i > 0; i--) {
    let nextHarmonic = harmonicNumber * Math.pow(2, octaveNumber - i);
    if (nextHarmonic >= 1 && nextHarmonic <= 128 && nextHarmonic % 1 === 0) {
      document.getElementById(`cell_${nextHarmonic}_${i}`).style.backgroundColor = color;
    }
  }
  // find lower harmonics in higher octaves
  for (let i = octaveNumber + 1; i <= 8; i++) {
    let nextHarmonic = harmonicNumber / Math.pow(2, i - octaveNumber);
    if (nextHarmonic >= 1 && nextHarmonic <= 128 && nextHarmonic % 1 === 0) {
      console.log(`o:${i} h:${nextHarmonic}`);
      document.getElementById(`cell_${nextHarmonic}_${i}`).style.backgroundColor = color;
    }
  }
}

export const importantFrequencyObjects = importantFrequencies.map(data => new ImportantFrequency(data));
