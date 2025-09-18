import {
  FluentProvider,
  teamsDarkTheme,
  teamsHighContrastTheme,
  teamsLightTheme,
} from "@fluentui/react-components";
import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import MeetingCostCalculator from "./components/MeetingCostCalculator.tsx";
import TabConfig from "./pages/tabConfig/TabConfig.tsx";

export default function App() {
  const [appTheme, setAppTheme] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      console.log("App.js: initializing client SDK");
      
      // Set a timeout fallback in case Teams SDK doesn't respond
      const fallbackTimeout = setTimeout(() => {
        if (!initialized) {
          console.log("Teams SDK timeout - initializing in standalone mode");
          setInitialized(true);
          setAppTheme("theme-light");
        }
      }, 3000);

      microsoftTeams.app
        .initialize()
        .then(() => {
          console.log("App.js: initializing client SDK initialized");
          clearTimeout(fallbackTimeout);
          microsoftTeams.app.notifyAppLoaded();
          microsoftTeams.app.notifySuccess();
          setInitialized(true);

          // Get app theme when app is initialized
          microsoftTeams.app.getContext().then((context) => {
            switch (context.app.theme) {
              case "dark":
                setAppTheme("theme-dark");
                break;
              case "default":
                setAppTheme("theme-light");
                break;
              case "contrast":
                setAppTheme("theme-contrast");
                break;
              default:
                return setAppTheme("theme-light");
            }
          });

          // Handle app theme when 'Teams' theme changes
          microsoftTeams.app.registerOnThemeChangeHandler((theme) => {
            switch (theme) {
              case "dark":
                setAppTheme("theme-dark");
                break;
              case "default":
                setAppTheme("theme-light");
                break;
              case "contrast":
                setAppTheme("theme-contrast");
                break;
              default:
                return setAppTheme("theme-light");
            }
          });
        })
        .catch((error) => {
          console.error("Teams SDK initialization failed:", error);
          clearTimeout(fallbackTimeout);
          // Initialize anyway for standalone mode
          setInitialized(true);
          setAppTheme("theme-light");
        });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialized) {
    return <div />;
  }

  return (
    <FluentProvider
      theme={
        appTheme === "theme-dark"
          ? teamsDarkTheme
          : appTheme === "theme-contrast"
          ? teamsHighContrastTheme
          : {
              ...teamsLightTheme,
              colorNeutralBackground3: "#eeeeee",
            }
      }
      style={{
        minHeight: "0px",
        position: "absolute",
        left: "0",
        right: "0",
        top: "0",
        bottom: "0",
        overflow: "hidden",
        background: "none",
      }}
    >
      <Router window={window} basename="/">
        <Routes>
          <Route path="/" element={<MeetingCostCalculator />} />
          <Route path={"/config"} element={<TabConfig />} />
        </Routes>
      </Router>
    </FluentProvider>
  );
}
