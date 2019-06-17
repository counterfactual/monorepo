import React from "react";
import { Link } from "react-router-dom";

import "./WidgetLogo.scss";

export type WidgetLogoProps = {
  caption?: string;
};

const WidgetLogo: React.FC<WidgetLogoProps> = ({
  caption = "Wallet"
}: WidgetLogoProps) => {
  return (
    <h1 className={`logo ${caption ? "logo--icon-only" : ""}`}>
      <Link className="logo-link" to="/">
        <img src="/assets/icon/logo.svg" alt="Counterfactual" />
        <span>{caption}</span>
      </Link>
    </h1>
  );
};

export { WidgetLogo };
