import { html, renderComponent } from "./js/preact-htm.js";
import { App } from "./js/App.js";

export function roomPlaner(containerId, dataURL) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`roomPlaner: container with id "${containerId}" not found`);
    return;
  }
  renderComponent(html`<${App} dataURL=${dataURL} />`, container);
}
