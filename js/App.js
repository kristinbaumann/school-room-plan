import { html, useState, useEffect, useRef } from "./preact-htm.js";
import { parseCSV } from "./helper.js";

const mapsBasePath = "https://kristinbaumann.github.io/school-room-plan/maps/";
// const mapsBasePath = "../maps/";

const levels = [
  { label: "HG 0", building: "Hauptgebäude", level: "Erdgeschoss" },
  { label: "HG 1", building: "Hauptgebäude", level: "1. Obergeschoss" },
  { label: "HG 2", building: "Hauptgebäude", level: "2. Obergeschoss" },
  { label: "HG 3", building: "Hauptgebäude", level: "3. Obergeschoss" },
  { label: "HG -1", building: "Hauptgebäude", level: "Untergeschoss" },
  { label: "NB 0", building: "Neubau", level: "Erdgeschoss" },
  { label: "NB 1", building: "Neubau", level: "1. Obergeschoss" },
];

export const App = ({ dataURL }) => {
  const [selectedLevel, setSelectedLevel] = useState(levels[0].label);
  const sectionRefs = useRef({});
  const appContainerRef = useRef(null);

  const [data, setData] = useState(null);
  const [svgContents, setSvgContents] = useState({});

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
              roomId: row["Raum ID"] ? row["Raum ID"].trim() : null,
              level: row["Etage"] ? row["Etage"].trim() : null,
              building: row["Gebaeude"] ? row["Gebaeude"].trim() : null,
              name1: row["Name_1"] ? row["Name_1"].trim() : null,
              name2: row["Name_2"] ? row["Name_2"].trim() : null,
              listed_clickable: row["gelistet & in Karte klickbar"]
                ? row["gelistet & in Karte klickbar"].trim().toLowerCase() ===
                  "y"
                : false,
              labelled_in_map: row["in Karte zusätzlich beschriftet"]
                ? row["in Karte zusätzlich beschriftet"]
                    .trim()
                    .toLowerCase() === "y"
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

  // Load all SVGs at once and manipulate based on data
  useEffect(() => {
    if (!data) return;

    const loadAllSVGs = async () => {
      try {
        // Map level labels to SVG filenames
        const svgMap = {
          "HG 0": "Hauptgebaeude_Erdgeschoss_edited.svg",
          "HG -1": "Hauptgebaeude_Untergeschoss_edited.svg",
          "HG 1": "Hauptgebaeude_1_Obergeschoss_edited.svg",
          "HG 2": "Hauptgebaeude_2_Obergeschoss_edited.svg",
          "HG 3": "Hauptgebaeude_3_Obergeschoss_edited.svg",
          "NB 0": "Neubau_Erdgeschoss_edited.svg",
          "NB 1": "Neubau_Obergeschoss_edited.svg",
        };

        const loadedSVGs = {};

        // Load all SVGs in parallel
        await Promise.all(
          Object.entries(svgMap).map(async ([levelLabel, svgFileName]) => {
            try {
              const response = await fetch(`${mapsBasePath}${svgFileName}`);
              if (response.ok) {
                const svgText = await response.text();

                // Parse SVG and manipulate based on data
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

                // Get rooms for this level
                const roomsForLevel =
                  data?.filter((room) => room.levelLabel === levelLabel) || [];

                // Hide text elements for rooms where labelled_in_map is false
                roomsForLevel.forEach((room) => {
                  if (room.roomId) {
                    // Find group with id like "room_005" for room number "005"
                    const roomGroup = svgDoc.getElementById(
                      `room_${room.roomId}`
                    );
                    if (roomGroup) {
                      // Find the .text group within this room group
                      if (!room.labelled_in_map) {
                        const textElements =
                          roomGroup.querySelectorAll(".text");
                        textElements.forEach((textEl) => {
                          textEl.style.display = "none";
                        });
                      }
                      if (!room.listed_clickable) {
                        const areaElements =
                          roomGroup.querySelectorAll(".area");
                        areaElements.forEach((areaEl) => {
                          areaEl.style.display = "none";
                        });
                      }
                      if (room.listed_clickable) {
                        const areaElements =
                          roomGroup.querySelectorAll(".area");
                        areaElements.forEach((areaEl) => {
                          areaEl.style.cursor = "pointer";
                          areaEl.setAttribute("data-area-roomid", room.roomId);
                        });
                      }
                    }
                  }
                });

                // Serialize back to string
                const serializer = new XMLSerializer();
                const manipulatedSVG = serializer.serializeToString(svgDoc);
                loadedSVGs[levelLabel] = manipulatedSVG;
              } else {
                console.error(`SVG file not found: ${svgFileName}`);
              }
            } catch (error) {
              console.error(`Error loading SVG ${svgFileName}:`, error);
            }
          })
        );

        setSvgContents(loadedSVGs);
      } catch (error) {
        console.error("Error loading SVGs:", error);
      }
    };

    loadAllSVGs();
  }, [data]);

  // Attach click listeners after SVG is rendered in the DOM
  useEffect(() => {
    if (
      !appContainerRef.current ||
      !data ||
      Object.keys(svgContents).length === 0
    )
      return;

    const handleRoomClick = (event) => {
      const roomId = event.target.getAttribute("data-area-roomid");
      console.log(`Clicked on room ${roomId}`);
      if (roomId) {
        const roomData = data.find((room) => room.roomId === roomId);
        if (roomData) {
          console.log("Room data:", roomData);
        }
      }
    };

    const appContainer = appContainerRef.current;
    appContainer.addEventListener("click", handleRoomClick);

    return () => {
      appContainer.removeEventListener("click", handleRoomClick);
    };
  }, [svgContents, data]);

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

  // Intersection Observer to update selectedLevel based on scroll position
  useEffect(() => {
    if (!data || Object.keys(sortedDataByLevelLabel).length === 0) return;

    const eventListElement = document.querySelector(".event-list");
    if (!eventListElement) return;

    const observerOptions = {
      root: eventListElement,
      rootMargin: "-10% 0px -80% 0px",
      threshold: 0,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const levelLabel = entry.target.dataset.levelLabel;
          if (levelLabel) {
            setSelectedLevel(levelLabel);
          }
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe all sections
    Object.keys(sectionRefs.current).forEach((key) => {
      if (sectionRefs.current[key]) {
        observer.observe(sectionRefs.current[key]);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [data, sortedDataByLevelLabel]);

  const scrollToLevel = (levelLabel) => {
    setSelectedLevel(levelLabel);
    const eventListElement = document.querySelector(".event-list");
    const sectionElement = sectionRefs.current[levelLabel];
    if (sectionElement && eventListElement) {
      const offsetTop = sectionElement.offsetTop - eventListElement.offsetTop;
      eventListElement.scrollTo({ top: offsetTop, behavior: "smooth" });
    }
  };

  if (!data) {
    return html`<p style="text-align: center;">Lade Daten...</p>`;
  }
  if (Object.keys(svgContents).length === 0) {
    return html`<p style="text-align: center;">Lade Grundrisse...</p>`;
  }

  return html`
    <div class="container" ref=${appContainerRef}>
      <style>
        .app.desktop {
          display: grid;
          grid-template-columns: 60% 40%;
          gap: 10px;
        }
        .app.mobile {
          display: none;
        }
        @media (max-width: 800px) {
          .app.desktop {
            display: none;
          }
          .app.mobile {
            display: block;
          }
        }
        .event {
          transition: background-color 0.3s;
        }
        .event:hover {
          background-color: #e2b2a4;
        }
        .area {
          fill: #dfdfdf;
          transition: fill 0.3s;
        }
        .area:hover {
          fill: #e2b2a4;
        }
      </style>

      <div class="app desktop">
        <div>
          <${LevelSelector}
            selectedLevel=${selectedLevel}
            scrollToLevel=${scrollToLevel}
          />
          <div
            class="event-list"
            style="overflow-y: auto; height: calc(100vh - 150px); margin-top: 20px;"
          >
            ${Object.entries(sortedDataByLevelLabel).map(
              ([levelLabel, events]) => {
                const listedEvents = events.filter((ev) => ev.listed_clickable);
                if (listedEvents.length === 0) {
                  return null;
                }
                return html`<${EventsPerLevel}
                  levelLabel=${levelLabel}
                  listedEvents=${listedEvents}
                  sectionRefs=${sectionRefs}
                />`;
              }
            )}
          </div>
        </div>
        <div style="overflow: auto;">
          <${FloorPlan} svgContent=${svgContents[selectedLevel]} />
        </div>
      </div>

      <div class="app mobile">
        <${LevelSelector}
          selectedLevel=${selectedLevel}
          scrollToLevel=${scrollToLevel}
        />
        <div class="event-list">
          ${Object.entries(sortedDataByLevelLabel).map(
            ([levelLabel, events]) => {
              const listedEvents = events.filter((ev) => ev.listed_clickable);
              if (listedEvents.length === 0) {
                return null;
              }
              return html`<div>
                <${EventsPerLevel}
                  levelLabel=${levelLabel}
                  listedEvents=${listedEvents}
                  sectionRefs=${sectionRefs}
                />
                <${FloorPlan} svgContent=${svgContents[levelLabel]} />
              </div>`;
            }
          )}
        </div>
      </div>
    </div>
  `;
};

const LevelSelector = ({ selectedLevel, scrollToLevel }) => {
  // group levels by building
  const groupedLevels = levels.reduce((acc, level) => {
    if (!acc[level.building]) {
      acc[level.building] = [];
    }
    acc[level.building].push(level);
    return acc;
  }, {});
  console.log("Grouped levels:", groupedLevels);

  return html`<div>
    ${Object.entries(groupedLevels).map(
      ([building, buildingLevels]) => html`<div style="margin-bottom: 10px;">
        <p style="margin: 0;">${building}</p>
        <div
          style="display: flex; flex-wrap: wrap; row-gap: 10px; column-gap: 18px;"
        >
          ${buildingLevels.map(
            (level) => html` <${Button}
              isSelected=${selectedLevel === level.label}
              onClick=${() => scrollToLevel(level.label)}
              >${level.label}<//
            >`
          )}
        </div>
      </div>`
    )}
  </div>`;
};

const FloorPlan = ({ svgContent }) => {
  if (!svgContent) {
    return html`<p>Kein Grundriss für diese Ebene verfügbar.</p>`;
  }
  return html`<div dangerouslySetInnerHTML=${{ __html: svgContent }} />`;
};

const EventsPerLevel = ({ levelLabel, listedEvents, sectionRefs }) => {
  console.log("Rendering EventsPerLevel for", levelLabel, listedEvents);
  const levelObject = levels.find((lvl) => lvl.label === levelLabel);
  if (!levelObject || !listedEvents) {
    return null;
  }
  return html`<div
    style="margin-top: 10px; margin-bottom: 30px;"
    data-level-label=${levelLabel}
    ref=${(el) => (sectionRefs.current[levelLabel] = el)}
  >
    <h3
      style="position: sticky; top: 0; background-color: white; z-index: 10; padding: 10px 0; margin: 0;"
    >
      <b>${levelObject.building}</b>${" "}<span style="font-weight: normal;"
        >${levelObject.level}</span
      >
    </h3>
    <div
      style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"
    >
      ${listedEvents.map((event) => html`<${Event} event=${event} />`)}
    </div>
  </div>`;
};

const Event = ({ event }) => {
  if (!event.listed_clickable) {
    return null;
  }
  return html`<div
    class="event"
    style="border: 1px solid black; padding: 4px; cursor: pointer;"
    onclick=${() => {
      console.log("Clicked on event:", event);
    }}
  >
    ${event.number ? html`<p style="margin: 0;">Raum: ${event.number}</p>` : ""}
    ${event.name1
      ? html`<p style="font-weight: bold; margin: 0;">${event.name1}</p>`
      : ""}
    ${event.name2 ? html`<p style="margin: 0;">${event.name2}</p>` : ""}
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
