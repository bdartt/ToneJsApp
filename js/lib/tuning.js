/**
 * Class for the basis note for tuning, capturing the base C4 frequency needed.
 */
export class BasisNote {
  name;
  baseC4;
  justA4;
  equalA4;
  bestTuning;

  constructor(props) {
    if (props.baseC4) {
      this.baseC4 = props.baseC4;
      this.justA4 = this.baseC4 * 5 / 3;
      this.equalA4 = this.baseC4 * Math.pow(2, 9/12);
      this.bestTuning = "just7";
    } else if (props.justA4) {
      this.justA4 = props.justA4;
      this.baseC4 = this.justA4 * 3 / 5;
      this.equalA4 = this.baseC4 * Math.pow(2, 9/12);
      this.bestTuning = "just7";
    } else if (props.equalA4) {
      this.equalA4 = props.equalA4;
      this.baseC4 = this.equalA4 / Math.pow(2, 9/12);
      this.justA4 = this.baseC4 * 5 / 3;
      this.bestTuning = "equal";
    } else {
      throw new Error("Frequency not provided in baseC4, justA4, or equalA4")
    }
    this.name = props.name;
  }
}

/**
 * Tuner utility that can be configured with different a basis note and/or tuning.
 * Then frequencies can be provided to determine the musical note that the frequency
 * represents in the configured tuning.
 */
export class Tuner {
  basisNote;
  ratios;
  tuningKey;

  constructor(basisKey = 'c256') {
    this.changeBasis(basisKey);
  }

  changeBasis(basisKey) {
    if (!BASIS_OPTIONS[basisKey]) {
      throw new Error("Basis key is invalid");
    }
    this.basisNote = BASIS_OPTIONS[basisKey];
    this.changeTuning(this.basisNote.bestTuning);
  }

  changeTuning(tuningKey) {
    if (!TUNING_RATIOS[tuningKey]) {
      throw new Error("Tuning key is invalid");
    }
    this.ratios = TUNING_RATIOS[tuningKey];
    this.tuningKey = tuningKey;
  }

  determineNote(frequency) {
    let bestMatch = { note: 'unknown', octave: 0, targetFreq: 0, cents: Infinity, interval: "" };

    // Iterate through several octaves to find the closest match
    for (let octave = 0; octave <= 8; octave++) {
      const octaveMultiplier = Math.pow(2, octave - 4); // Relative to C4

      for (const noteName in this.ratios) {
        if (Object.hasOwnProperty.call(this.ratios, noteName)) {
          const targetFreq = this.basisNote.baseC4 * this.ratios[noteName] * octaveMultiplier;

          const cents = 1200 * Math.log2(targetFreq / frequency);
          // Cents deviation is typically within -50 to +50, but using 100 to be sure
          if (Math.abs(cents) < Math.abs(bestMatch.cents) && Math.abs(cents) < 100) {
            bestMatch = {
              note: noteName,
              octave: octave,
              targetFreq: targetFreq,
              cents: parseFloat(cents.toFixed(2)), // Rounding cents for cleaner output,
              interval: INTERVAL_NAMES_IN_C[noteName],
            };
          }
        }
      }
    }

    return bestMatch;
  }

  writeSelectorHtml(container, onChangeFunction = function(){}) {
    // basis
    let html = '<label for="tunerBasis">basis note</label><br/><select id="tunerBasis">';
    for (const key in BASIS_OPTIONS) {
      const basis = BASIS_OPTIONS[key];
      const selected = this.basisNote === basis ? 'selected="selected"' : '';
      html += `<option value="${key}" ${selected}>${basis.name}</option>`;
    }
    html += '</select><br/>';
    html += `<span style="font-size: smaller">(C4 = <span id="basisC4">${this.basisNote.baseC4.toFixed(6)}</span> Hz)<br/><br/></span>`;
    // tuning
    html += '<label for="tunerTuning">12-tone tuning (in key of C)</label><br/><select id="tunerTuning">';
    for (const key in JUST_NAMES) {
      const tuningName = JUST_NAMES[key];
      const selected = this.tuningKey === key ? 'selected="selected"' : '';
      html += `<option value="${key}" ${selected}>${tuningName}</option>`;
    }
    html += '</select>';

    container.innerHTML = html;
    // bind functions
    const tuner = this;
    const tunerBasis = document.getElementById('tunerBasis');
    const tunerTuning = document.getElementById('tunerTuning');

    tunerBasis.addEventListener('change', function(event) {
      tuner.changeBasis(event.target.value);
      tunerTuning.value = tuner.tuningKey;
      document.getElementById('basisC4').innerHTML = tuner.basisNote.baseC4.toFixed(6);
      onChangeFunction();
    });
    tunerTuning.addEventListener('change', function(event) {
      tuner.changeTuning(event.target.value);
      onChangeFunction();
    });
  }
}


// reference: https://en.wikipedia.org/wiki/Five-limit_tuning#Twelve-tone_scale
const TUNING_RATIOS = {
  'equal': {
    'C': 1,
    'C♯': Math.pow(2, 1/12),
    'D': Math.pow(2, 2/12),
    'D♯': Math.pow(2, 3/12),  //1.18920712
    'E': Math.pow(2, 4/12),
    'F': Math.pow(2, 5/12),
    'F♯': Math.pow(2, 6/12),  // augmented 4th AND diminished 5th
    'G': Math.pow(2, 7/12),
    'G♯': Math.pow(2, 8/12),
    'A': Math.pow(2, 9/12),
    'A♯': Math.pow(2, 10/12),
    'B': Math.pow(2, 11/12),
  },
  'just5-asym': {
    'C': 1/1,
    'D♭♭': 16/15,
    'D': 9/8,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 45/32,
    'G♭♭': 64/45,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 9/5,
    'B': 15/8,
  },
  'just5-asymx': {
    'C': 1/1,
    'D♭♭': 16/15,
    'D': 9/8,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 25/18,
    'G♭♭': 36/25,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 9/5,
    'B': 15/8,
  },
  'just5-sym1': {
    'C': 1/1,
    'D♭♭': 16/15,
    'D': 9/8,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 45/32,
    'G♭♭': 64/45,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 16/9,
    'B': 15/8,
  },
  'just5-sym2': {
    'C': 1/1,
    'D♭♭': 16/15,
    'D': 10/9,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 45/32,
    'G♭♭': 64/45,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 9/5,
    'B': 15/8,
  },
  'just7': {
    'C': 1/1,
    'D♭♭': 15/14,
    'D': 8/7,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 7/5,
    'G♭♭': 10/7,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 7/4,
    'B': 15/8,
  },
  'just17': {
    'C': 1/1,
    'D♭♭': 14/13,
    'D': 8/7,
    'E♭': 6/5,
    'E': 5/4,
    'F': 4/3,
    'F♯♯': 17/12,
    'G♭♭': 24/17,
    'G': 3/2,
    'A♭': 8/5,
    'A': 5/3,
    'B♭': 7/4,
    'B': 13/7,
  },
};

const JUST_NAMES = {
  'equal': 'equal temperament (standard)',
  'just5-asym': '5-limit just, standard asymmetric',
  'just5-asymx': '5-limit just, extended asymmetric',
  'just5-sym1': '5-limit just, symmetric #1',
  'just5-sym2': '5-limit just, symmetric #2',
  'just7': '7-limit just intonation',
  'just17': '17-limit just intonation',
};

const INTERVAL_NAMES_IN_C = {
  'C': 'octave of C',
  'C♯': 'minor 2nd of C',
  'D♭♭': 'minor 2nd of C',
  'D': 'major 2nd of C',
  'D♯': 'minor 3rd of C',
  'E♭': 'minor 3rd of C',
  'E': 'major 3rd of C',
  'F': 'perfect 4th of C',
  'F♯♯': 'augmented 4th of C',
  'F♯': 'tritone of C',
  'G♭♭': 'diminished 5th of C',
  'G': 'perfect 5th of C',
  'G♯': 'minor 6th of C',
  'A♭': 'minor 6th of C',
  'A': 'major 6th of C',
  'A♯': 'minor 7th of C',
  'B♭': 'minor 7th of C',
  'B': 'major 7th of C',
};

const BASIS_OPTIONS = {
  'c256': new BasisNote({name: "C4 256 (scientific)", baseC4: 256.0}),
  'a432j': new BasisNote({name: "A4 432 (natural just)", justA4: 432.0}),
  'a432e': new BasisNote({name: "A4 432 (natural equal)", equalA4: 432.0}),
  'a440j': new BasisNote({name: "A4 440 (standard just)", justA4: 440.0}),
  'a440e': new BasisNote({name: "A4 440 (standard equal)", equalA4: 440.0}),
};

export const Tuning = new Tuner();
