import { html, useState } from "./preact-htm.js";

export const App = ({ containerId }) => {
  const [count, setCount] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
  };
  return html`
    <div>
      <h2>Room Planer</h2>
      <p>Rendered into #${containerId}</p>
      <button class="" onClick=${() => setCount((c) => c + 1)}>
        Clicks: ${count}
      </button>
      <div style="display: flex; gap: 20px;">
        <${Button}
          style="background-color: var(--e-global-color-accent)"
          onClick=${() => handleLevelClick("HG -1")}
          >HG -1<//
        >
        <${Button} onClick=${() => handleLevelClick("HG 0")}>HG 0<//>
        <${Button} onClick=${() => handleLevelClick("HG 1")}>HG 1<//>
        <${Button} onClick=${() => handleLevelClick("HG 2")}>HG 2<//>
        <${Button} onClick=${() => handleLevelClick("HG 3")}>HG 3<//>
        <${Button} onClick=${() => handleLevelClick("NB 0")}>NB 0<//>
        <${Button} onClick=${() => handleLevelClick("NB 1")}>NB 1<//>
      </div>
    </div>
  `;
};

const Button = ({ onClick, children }) => {
  return html`
    <div
      class="elementor-element elementor-element-e6cddec elementor-align-center elementor-widget elementor-widget-button"
      data-id="e6cddec"
      data-element_type="widget"
      data-widget_type="button.default"
    >
      <button
        class="elementor-button elementor-button-link elementor-size-sm"
        onClick=${onClick}
      >
        <span class="elementor-button-content-wrapper">
          <span class="elementor-button-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="35"
              height="26"
              viewBox="0 0 35 26"
              fill="none"
            >
              <path
                d="M13.3132 26C15.4772 22.9896 18.2056 20.2645 21.4987 17.8245C24.823 15.3845 28.1474 13.816 31.4718 13.1188V13.6417H0V12.3583H31.4718V12.8812C28.1474 12.184 24.823 10.6155 21.4987 8.1755C18.2056 5.73553 15.4772 3.01036 13.3132 0H15.5242C16.716 2.09141 18.2056 4.07191 19.9933 5.9415C21.8123 7.7794 23.9919 9.30043 26.5323 10.5046C29.1039 11.7087 31.9265 12.3108 35 12.3108V13.6892C31.9265 13.6892 29.1039 14.2913 26.5323 15.4954C23.9919 16.6996 21.8123 18.2364 19.9933 20.106C18.2056 21.9439 16.716 23.9086 15.5242 26H13.3132Z"
                fill="black"
              ></path>
            </svg>
          </span>
          <span class="elementor-button-text">${children}</span>
        </span>
      </button>
    </div>
  `;
};
