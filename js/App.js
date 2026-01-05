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
  const appContainerRef = useRef(null);
  const stickyHeaderRef = useRef(null);
  const [isFixed, setIsFixed] = useState(false);
  const [headerTop, setHeaderTop] = useState(0);

  const [data, setData] = useState(null);
  const [svgContents, setSvgContents] = useState({});
  const [highlightedRoomId, setHighlightedRoomId] = useState(null);
  const isProgrammaticScrollRef = useRef(false);

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
              //   id: row["ID"] ? row["ID"].trim() : null,
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

          const filteredRows = mappedRows.filter((row) => row.roomId);
          setData(filteredRows);
        })
        .catch((error) => {
          console.error("Error loading CSV data:", error);
        });
    }
  }, [dataURL]);
  //   console.log("Data updated:", data);

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

                      const textElements = roomGroup.querySelectorAll(".text");
                      textElements.forEach((textEl) => {
                        textEl.style.pointerEvents = "none";
                      });
                      const numberElements =
                        roomGroup.querySelectorAll(".number");
                      numberElements.forEach((numberEl) => {
                        numberEl.style.pointerEvents = "none";
                      });
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
      //   console.log(`Clicked on room ${roomId}`);
      if (roomId) {
        const roomData = data.find((room) => room.roomId === roomId);
        if (roomData) {
          // Highlight the event
          setHighlightedRoomId(roomId);

          // Set the selected level to match the room's level
          if (roomData.levelLabel) {
            setSelectedLevel(roomData.levelLabel);
          }

          // Disable scroll detection temporarily
          isProgrammaticScrollRef.current = true;

          // Scroll to the event
          setTimeout(() => {
            const isMobile = window.innerWidth <= 800;

            if (isMobile) {
              // On mobile, scroll to the event in the event list
              const eventElement = document.querySelector(
                `.app.mobile [data-event-roomid="${roomId}"]`
              );

              if (eventElement) {
                // Get position relative to document
                const elementTop =
                  eventElement.getBoundingClientRect().top + window.pageYOffset;
                const offset = 150; // Account for sticky header

                // Scroll the window to the event
                window.scrollTo({
                  top: elementTop - offset,
                  behavior: "smooth",
                });
              } else {
                console.error("Event element not found for roomId:", roomId);
                // Try without mobile selector
                const fallbackElement = document.querySelector(
                  `[data-event-roomid="${roomId}"]`
                );
                console.log("Fallback element:", fallbackElement);
              }
            } else {
              // On desktop, scroll within the event-list container
              const eventElement = document.querySelector(
                `[data-event-roomid="${roomId}"]`
              );
              if (eventElement) {
                const eventListContainer = document.querySelector(
                  ".app.desktop .event-list"
                );
                if (eventListContainer) {
                  // Calculate scroll position relative to container
                  const containerRect =
                    eventListContainer.getBoundingClientRect();
                  const elementRect = eventElement.getBoundingClientRect();

                  // Calculate the target scroll position to center the element
                  const targetScroll =
                    eventListContainer.scrollTop +
                    (elementRect.top - containerRect.top) -
                    containerRect.height / 2 +
                    elementRect.height / 2;

                  // Scroll the container only
                  eventListContainer.scrollTo({
                    top: targetScroll,
                    behavior: "smooth",
                  });
                }
              }
            }

            // Re-enable scroll detection after scrolling completes
            setTimeout(() => {
              isProgrammaticScrollRef.current = false;
            }, 1000);
          }, 100);
        }
      }
    };

    const appContainer = appContainerRef.current;
    appContainer.addEventListener("click", handleRoomClick);

    return () => {
      appContainer.removeEventListener("click", handleRoomClick);
    };
  }, [svgContents, data]);

  // Highlight SVG area when room is selected
  useEffect(() => {
    if (!appContainerRef.current) return;

    // Reset all area fills to default
    const allAreas = appContainerRef.current.querySelectorAll(
      ".area[data-area-roomid]"
    );
    allAreas.forEach((area) => {
      area.style.fill = "#dfdfdf"; // Reset to default color
    });

    // Highlight the selected room area
    if (highlightedRoomId) {
      const selectedAreas = appContainerRef.current.querySelectorAll(
        `.area[data-area-roomid="${highlightedRoomId}"]`
      );
      selectedAreas.forEach((area) => {
        area.style.fill = "#e2b2a4";
      });
    }
  }, [highlightedRoomId, svgContents]);

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
  //   console.log("Data by level label:", sortedDataByLevelLabel);

  // Level detection: scroll listener for both mobile and desktop
  useEffect(() => {
    if (!data || Object.keys(sortedDataByLevelLabel).length === 0) return;

    let cleanupFn = null;

    // Wait for layout to complete before setting up scroll detection
    const timeoutId = setTimeout(() => {
      const isMobile = window.innerWidth <= 800;

      const handleScroll = () => {
        // Skip level detection if we're programmatically scrolling
        if (isProgrammaticScrollRef.current) return;

        // Query sections from the correct view (desktop or mobile)
        const viewSelector = isMobile ? ".app.mobile" : ".app.desktop";
        const view = document.querySelector(viewSelector);
        if (!view) return;

        const sectionElements = view.querySelectorAll("[data-level-label]");
        const sections = Array.from(sectionElements).map((el) => ({
          label: el.getAttribute("data-level-label"),
          element: el,
        }));

        if (sections.length === 0) return;

        let scrollContainer, scrollTop, viewportHeight;

        if (isMobile) {
          scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          viewportHeight = window.innerHeight;
        } else {
          const desktopView = document.querySelector(".app.desktop");
          scrollContainer = desktopView?.querySelector(".event-list");
          if (!scrollContainer) return;
          scrollTop = scrollContainer.scrollTop;
          viewportHeight = scrollContainer.clientHeight;
        }

        const triggerPoint = scrollTop + viewportHeight * 0.2;
        let activeSection = sections[0].label;

        for (let i = sections.length - 1; i >= 0; i--) {
          const { label, element } = sections[i];

          // Use offsetTop for both mobile and desktop
          // This gives us the element's position relative to its offsetParent
          const elementTop = element.offsetTop;

          if (
            elementTop <= triggerPoint &&
            activeSection === sections[0].label
          ) {
            activeSection = label;
          }
        }

        setSelectedLevel(activeSection);
      };

      if (isMobile) {
        window.addEventListener("scroll", handleScroll, { passive: true });
        cleanupFn = () => window.removeEventListener("scroll", handleScroll);
      } else {
        const desktopView = document.querySelector(".app.desktop");
        const scrollContainer = desktopView?.querySelector(".event-list");
        if (scrollContainer) {
          scrollContainer.addEventListener("scroll", handleScroll, {
            passive: true,
          });
          cleanupFn = () =>
            scrollContainer.removeEventListener("scroll", handleScroll);
        }
      }

      handleScroll(); // Initial check
    }, 500); // Increased timeout to ensure content is rendered

    return () => {
      clearTimeout(timeoutId);
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [data, svgContents]);

  // Scroll detection for sticky header on mobile
  useEffect(() => {
    const handleScroll = () => {
      if (!stickyHeaderRef.current || !appContainerRef.current) return;

      const rect = stickyHeaderRef.current.getBoundingClientRect();
      const appRect = appContainerRef.current.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      // Get the original position of the header
      if (headerTop === 0 && rect.top > 0) {
        setHeaderTop(rect.top + scrollTop);
      }

      // Check if the app container is still in view
      const appInView = appRect.bottom > 0;

      // Check if we've scrolled past the header's original position
      if (headerTop > 0) {
        if (scrollTop >= headerTop && !isFixed && appInView) {
          setIsFixed(true);
        } else if ((scrollTop < headerTop || !appInView) && isFixed) {
          setIsFixed(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFixed, headerTop]);

  const scrollToLevel = (levelLabel) => {
    setSelectedLevel(levelLabel);

    // Detect if we're on mobile or desktop
    const isMobile = window.innerWidth <= 800;

    // Query section from the correct view
    const viewSelector = isMobile ? ".app.mobile" : ".app.desktop";
    const view = document.querySelector(viewSelector);
    if (!view) return;

    const sectionElement = view.querySelector(
      `[data-level-label="${levelLabel}"]`
    );
    if (!sectionElement) return;

    if (isMobile) {
      // On mobile, scroll the window
      const offsetTop = sectionElement.offsetTop;
      window.scrollTo({ top: offsetTop, behavior: "smooth" }); // Offset for sticky header
    } else {
      // On desktop, scroll the event-list container
      const eventListElement = view.querySelector(".event-list");
      if (eventListElement) {
        const offsetTop = sectionElement.offsetTop;
        eventListElement.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
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
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 10px;
          max-height: 95vh;
          overflow: hidden;

          .event-list-container {
            display: flex;
            flex-direction: column;
            max-height: 95vh;

            .event-list {
              position: relative;
              overflow-y: auto;
              margin-top: 10px;

              .events-list-headline {
                position: sticky;
                top: 0;
                background-color: white;
              }
            }
          }
          .floor-plan-container {
            max-height: 95vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .floor-plan-container > div {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .floor-plan-container svg {
            max-width: 100%;
            max-height: 100%;
            height: auto;
            width: auto;
          }
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

            .event-list {
              margin-top: 10px;
            }

            .sticky-header {
              z-index: 999;
              background-color: white;

              &.is-fixed {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                padding: 10px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
            }
            .sticky-placeholder.active {
              height: 100px;
            }
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
        <div class="event-list-container">
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
                return html`<${EventsPerLevel}
                  levelLabel=${levelLabel}
                  listedEvents=${listedEvents}
                  highlightedRoomId=${highlightedRoomId}
                  setHighlightedRoomId=${setHighlightedRoomId}
                />`;
              }
            )}
          </div>
        </div>
        <div class="floor-plan-container">
          <${FloorPlan} svgContent=${svgContents[selectedLevel]} />
        </div>
      </div>

      <div class="app mobile">
        <div
          ref=${stickyHeaderRef}
          class=${`sticky-header ${isFixed ? "is-fixed" : ""}`}
        >
          <${LevelSelector}
            selectedLevel=${selectedLevel}
            scrollToLevel=${scrollToLevel}
          />
        </div>
        <div class=${`sticky-placeholder ${isFixed ? "active" : ""}`}></div>
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
                  highlightedRoomId=${highlightedRoomId}
                  setHighlightedRoomId=${setHighlightedRoomId}
                />
                <${FloorPlan}
                  svgContent=${svgContents[levelLabel]}
                  levelLabel=${levelLabel}
                />
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

  return html`<div style="display: flex; flex-direction: column; gap: 6px;">
    ${Object.entries(groupedLevels).map(
      ([building, buildingLevels]) => html`<div>
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

const FloorPlan = ({ svgContent, levelLabel }) => {
  if (!svgContent) {
    return html`<p>Kein Grundriss für diese Ebene verfügbar.</p>`;
  }
  return html`<div
    data-floor-plan-level=${levelLabel || ""}
    dangerouslySetInnerHTML=${{ __html: svgContent }}
  />`;
};

const EventsPerLevel = ({
  levelLabel,
  listedEvents,
  highlightedRoomId,
  setHighlightedRoomId,
}) => {
  //   console.log("Rendering EventsPerLevel for", levelLabel, listedEvents);
  const levelObject = levels.find((lvl) => lvl.label === levelLabel);
  if (!levelObject || !listedEvents) {
    return null;
  }
  return html`<div
    style="margin-bottom: 30px; position: relative;"
    data-level-label=${levelLabel}
  >
    <h3
      class="events-list-headline"
      style="z-index: 10; margin: 0; padding-bottom: 10px;"
    >
      <b>${levelObject.building}</b>${" "}<span style="font-weight: normal;"
        >${levelObject.level}</span
      >
    </h3>
    <div
      style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;"
    >
      ${listedEvents.map(
        (event) =>
          html`<${Event}
            event=${event}
            highlightedRoomId=${highlightedRoomId}
            setHighlightedRoomId=${setHighlightedRoomId}
          />`
      )}
    </div>
  </div>`;
};

const Event = ({ event, highlightedRoomId, setHighlightedRoomId }) => {
  if (!event.listed_clickable) {
    return null;
  }
  const isHighlighted = event.roomId === highlightedRoomId;
  return html`<div
    class="event"
    data-event-roomid=${event.roomId}
    style="border: 1px solid black; padding: 4px; cursor: pointer; background-color: ${isHighlighted
      ? "#e2b2a4"
      : "transparent"};"
    onclick=${() => {
      setHighlightedRoomId(event.roomId);

      // Scroll to floor plan on mobile
      setTimeout(() => {
        const isMobile = window.innerWidth <= 800;

        if (isMobile && event.levelLabel) {
          const floorPlanElement = document.querySelector(
            `[data-floor-plan-level="${event.levelLabel}"]`
          );
          if (floorPlanElement) {
            // Use scrollIntoView for reliable scrolling on mobile
            floorPlanElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          } else {
            console.error(
              "Floor plan element not found for level:",
              event.levelLabel
            );
          }
        }
      }, 100);
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
