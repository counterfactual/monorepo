import React from "react";
import { Link } from "react-router-dom";

import "./WidgetLogo.scss";

export type WidgetLogoProps = {
  caption?: string;
  linkToHome?: boolean;
};

const WidgetLogo: React.FC<WidgetLogoProps> = ({
  caption = "Wallet",
  linkToHome = true
}: WidgetLogoProps) => {
  const logo = (
    <React.Fragment>
      <img src="/assets/icon/logo.svg" alt="Counterfactual" />
      {caption ? <span>{caption}</span> : null}
    </React.Fragment>
  );

  return (
    <h1 className={`logo ${!caption ? "logo--icon-only" : ""}`}>
      {linkToHome ? (
        <Link className="logo-link" to="/">
          {logo}
        </Link>
      ) : (
        logo
      )}
    </h1>
  );
};

export { WidgetLogo };
