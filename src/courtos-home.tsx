import React from "react";
import ReactDOM from "react-dom/client";

import { HouseholdVerticalSlice } from "./ui/panels/HouseholdVerticalSlice";

ReactDOM.createRoot(document.getElementById("courtos-home-root")!).render(
  <React.StrictMode>
    <HouseholdVerticalSlice />
  </React.StrictMode>
);
