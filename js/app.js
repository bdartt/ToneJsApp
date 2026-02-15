import { Tuning } from "./lib/tuning";
import { Root, highlightCells } from "./lib/models";
import { Player } from "./lib/player";
import { importantFrequencies } from "./lib/constants";

// bind tools to window for later use
window.Tuning = Tuning;
window.Player = Player;
window.highlightCells = highlightCells;
window.renderPlayer = renderPlayer;

const toggleButton = document.getElementById("toggleButton");
const exportButton = document.getElementById("exportButton");
const harmonicTableBody = document.getElementById("harmonicTableBody");
const playerTableBody = document.getElementById("playerTableBody");
const tunerSettingsDiv = document.getElementById("tunerSettings");

// bindings

toggleButton.addEventListener("click", toggleSound);
exportButton.addEventListener("click", e => {
  const duration = Number(document.getElementById("exportDuration").value);
  Player.exportToWav(window, duration);
});
document.querySelectorAll("input[type='radio']").forEach(button => button.addEventListener("change", renderPlayer));
document.getElementById("customInput").addEventListener("change", e => {
  document.getElementById("custom").checked = true;
  renderPlayer();
});
document.getElementById("sensitivity").addEventListener("change", e => {
  Player.root.meaningSensitivity = e.target.value;
  renderPlayer();
});
Tuning.writeSelectorHtml(tunerSettingsDiv, renderPlayer);

// initial render

renderPlayer();

// functions

function toggleSound() {
  if (Player.playing) {
    Player.stop();
    toggleButton.textContent = '▶️ PLAY';
  } else {
    Player.start();
    toggleButton.textContent = '⏸️ PAUSE';
  }
}

function renderPlayer() {
  const selectedRoot = getSelectedRoot();
  const newRoot = new Root(selectedRoot.value, 128, selectedRoot.add);
  if (Player.root.rootHertzValue !== newRoot.rootHertzValue) {
    Player.root = newRoot;
  }
  harmonicTableBody.innerHTML = Player.root.renderHarmonicTableBodyInnerHtml();
  playerTableBody.innerHTML = Player.renderPlayerTableBodyInnerHtml();
}

function getSelectedRoot() {
  const selected = document.querySelector("input[name='rootFrequencyOption']:checked");
  if (selected.value === "custom") {
    const customInput = document.getElementById("customInput");
    return { value: parseFloat(customInput.value), add: 0.0 };
  } else if (selected.value === "schumann") {
    return { value: 6.5, add: 1.333333333 };
  } else if (selected.value === "c0") {
    return { value: 16.0543, add: 0.0 };
  } else if (selected.value === "d0") {
    return { value: 18.0203, add: 0.0 };
  } else if (selected.value === "e0") {
    return { value: 20.2271, add: 0.0 };
  } else if (selected.value === "f0") {
    return { value: 21.4299, add: 0.0 };
  } else if (selected.value === "g0") {
    return { value: 24.0542, add: 0.0 };
  } else if (selected.value === "a0") {
    return { value: 27, add: 0.0 };
  } else if (selected.value === "b0") {
    return { value: 30.3065, add: 0.0 };
  } else {
    for (let i = 0; i < importantFrequencies.length; i++) {
      let frequency = importantFrequencies[i];
      if (frequency.id === selected.value) {
        return { value: frequency.value, add: 0.0 };
      }
    }
  }
}
