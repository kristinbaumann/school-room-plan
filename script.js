import { html, renderComponent, useState } from "./js/preact-htm.js";

const App = ({ containerId }) => {
  const [count, setCount] = useState(0);
  return html`
    <div>
      <h2>Room Planer</h2>
      <p>Rendered into #${containerId}</p>
      <button onClick=${() => setCount((c) => c + 1)}>Clicks: ${count}</button>
    </div>
  `;
};

export function roomPlaner(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`roomPlaner: container with id "${containerId}" not found`);
    return;
  }
  renderComponent(html`<${App} containerId=${containerId} />`, container);
}

// Also attach to window for non-module callers
window.roomPlaner = roomPlaner;
