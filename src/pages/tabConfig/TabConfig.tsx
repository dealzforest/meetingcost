import * as microsoftTeams from "@microsoft/teams-js";
import { useEffect, useState } from "react";
import { Title2, Text } from "@fluentui/react-components";
import { useStyles } from "../../utils/useStyles.ts";

export default function TabConfig() {
  const [appTheme, setAppTheme] = useState("");

  const classes = useStyles();

  useEffect(() => {
    microsoftTeams.app.initialize().then(() => {
      microsoftTeams.app.getContext().then((context) => {
        // Applying default theme from app context property
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
      microsoftTeams.pages.config.registerOnSaveHandler(function (saveEvent) {
        microsoftTeams.pages.config.setConfig({
          suggestedDisplayName: "Meeting Cost Tracker",
          contentUrl: `${window.location.origin}/`,
        });
        saveEvent.notifySuccess();
      });

      microsoftTeams.pages.config.setValidityState(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={appTheme}>
      <div className={classes.config}>
        <Title2 block>Welcome to Cost Tracker</Title2>
        <Text size={400} block>
          Enhance your video sessions with Cost Tracker's AI-enhanced coaching,
          personalized just for you. As you interact with your co-workers via
          video chat, Cost Tracker will provide helpful recommendations and insights
          based on behavioral science.
        </Text>
        <Text size={400} block>
          To learn more visit{" "}
          <a
            href="https://happycompanies.com/"
            target="_blank"
            rel="noreferrer"
          >
            happycompanies.com
          </a>
          .
        </Text>
        <Text size={400} block weight="semibold">
          Press the save button to continue.
        </Text>
      </div>
    </div>
  );
}
