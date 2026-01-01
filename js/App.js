import { html, useState, useEffect } from "./preact-htm.js";
import { parseCSV } from "./helper.js";

export const App = ({ dataURL }) => {
  const levels = [
    { label: "HG -1", building: "Hauptgebäude", level: "Untergeschoss" },
    { label: "HG 0", building: "Hauptgebäude", level: "Erdgeschoss" },
    { label: "HG 1", building: "Hauptgebäude", level: "1. Obergeschoss" },
    { label: "HG 2", building: "Hauptgebäude", level: "2. Obergeschoss" },
    { label: "HG 3", building: "Hauptgebäude", level: "3. Obergeschoss" },
    { label: "NB 0", building: "Neubau", level: "Erdgeschoss" },
    { label: "NB 1", building: "Neubau", level: "1. Obergeschoss" },
  ];
  const [selectedLevel, setSelectedLevel] = useState(levels[0].label);

  const [data, setData] = useState(null);

  useEffect(() => {
    // read data from dataURL (CSV file)
    if (dataURL) {
      fetch(dataURL)
        .then((response) => response.text())
        .then((dataText) => {
          const parsed = parseCSV(dataText);
          if (!parsed || parsed.length === 0) {
            setData([]);
            return;
          }
          const headers = parsed[0];
          const rows = parsed.slice(1).map((values) => {
            const obj = {};
            for (let i = 0; i < headers.length; i++) {
              obj[headers[i]] = values[i] !== undefined ? values[i] : "";
            }
            return obj;
          });
          const mappedRows = rows.map((row) => {
            let el = {
              id: row["ID"] ? row["ID"].trim() : null,
              number: row["Nummer"] ? row["Nummer"].trim() : null,
              level: row["Etage"] ? row["Etage"].trim() : null,
              building: row["Gebaeude"] ? row["Gebaeude"].trim() : null,
              name1: row["Name_1"] ? row["Name_1"].trim() : null,
              name2: row["Name_2"] ? row["Name_2"].trim() : null,
              klickbar: row["klickbar"]
                ? row["klickbar"].trim().toLowerCase() === "y"
                : false,
              sichtbar: row["sichtbar"]
                ? row["sichtbar"].trim().toLowerCase() === "y"
                : false,
            };
            // match level labels
            const levelObj = levels.find(
              (lvl) => lvl.building === el.building && lvl.level === el.level
            );
            el.levelLabel = levelObj ? levelObj.label : null;
            return el;
          });

          const filteredRows = mappedRows.filter((row) => row.id);
          setData(filteredRows);
        })
        .catch((error) => {
          console.error("Error loading CSV data:", error);
        });
    }
  }, [dataURL]);
  console.log("Data updated:", data);

  const sortedDataByLevelLabel = {};
  if (data) {
    const dataByLevelLabel = {};
    data.forEach((el) => {
      if (!dataByLevelLabel[el.levelLabel]) {
        dataByLevelLabel[el.levelLabel] = [];
      }
      dataByLevelLabel[el.levelLabel].push(el);
    });
    // sort dataByLevelLabel in order of levels array
    levels.forEach((lvl) => {
      if (dataByLevelLabel[lvl.label]) {
        sortedDataByLevelLabel[lvl.label] = dataByLevelLabel[lvl.label];
      }
    });
  }
  console.log("Data by level label:", sortedDataByLevelLabel);

  return html`
    <div
      style="border: 1px solid red; padding: 6px; display: grid; grid-template-columns: 60% 40%; gap: 10px;"
    >
      <div style="background-color: #ffc0cb82;">
        <div style="display: flex; flex-wrap: wrap; gap: 20px;">
          ${levels.map(
            (level) => html` <${Button}
              isSelected=${selectedLevel === level.label}
              onClick=${() => setSelectedLevel(level.label)}
              >${level.label}<//
            >`
          )}
        </div>
        <div>
          ${Object.entries(sortedDataByLevelLabel).map(
            ([levelLabel, events]) => {
              const levelObject = levels.find(
                (lvl) => lvl.label === levelLabel
              );
              if (!levelObject) {
                return null;
              }

              return html`
                <div style="margin-top: 10px;">
                  <h3><b>${levelObject.building}</b>${levelObject.level}</h3>
                  <div
                    style="display: flex; flex-direction: column; gap: 10px;"
                  >
                    ${events.map((event) => html`<${Event} event=${event} />`)}
                  </div>
                </div>
              `;
            }
          )}
        </div>
      </div>

      <div style="background-color: #d9e1ff82;">
        Grundriss für aktuell ausgewählte Ebene: ${selectedLevel}
      </div>
    </div>
  `;
};

const Event = ({ event }) => {
  if (!event.sichtbar && !event.klickbar) {
    return null;
  }
  return html`<div style="border: 1px solid black; padding: 4px;">
    ${event.number ? html`<p>Raum: ${event.number}</p>` : ""}
    ${event.name1 ? html`<p style="font-weight: bold;">${event.name1}</p>` : ""}
    ${event.name2 ? html`<p>${event.name2}</p>` : ""}
  </div>`;
};

const Button = ({ onClick, children, isSelected }) => {
  return html`
    <div
      class="elementor-element elementor-align-center elementor-widget elementor-widget-button"
    >
      <button
        class="elementor-button elementor-button-link elementor-size-sm"
        onClick=${onClick}
        style=${`border-color: black; background: ${
          isSelected ? "var(--e-global-color-accent)" : "transparent"
        };`}
      >
        <span class="elementor-button-content-wrapper">
          <span class="elementor-button-text">${children}</span>
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
        </span>
      </button>
    </div>
  `;
};
